import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Redis } from '@upstash/redis';

export const ROOM_TTL_SECONDS = 24 * 60 * 60;
const isHosted = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');

export function getRedisConfigs(env = process.env) {
  const candidates = [
    {
      source: 'mining-game-kv',
      url: env.MINING_GAME_KV_REST_API_URL,
      token: env.MINING_GAME_KV_REST_API_TOKEN,
    },
    {
      source: 'upstash',
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    },
    {
      source: 'vercel-kv',
      url: env.KV_REST_API_URL,
      token: env.KV_REST_API_TOKEN,
    },
  ];
  const seen = new Set();
  return candidates.filter(({ url, token }) => {
    if (!url || !token) return false;
    const key = `${url}\u0000${token}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getRedisConfig(env = process.env) {
  const config = getRedisConfigs(env)[0];
  return config ? { url: config.url, token: config.token } : { url: undefined, token: undefined };
}

const redisClients = getRedisConfigs().map((config) => ({
  ...config,
  client: new Redis({ url: config.url, token: config.token, automaticDeserialization: false }),
}));
let activeRedis = null;
let redisSelection = null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '.data');
const dbPath = process.env.MINING_GAME_LOCAL_DB_PATH || path.join(dataDir, 'rooms.json');

function ensureLocalDataDir() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

function requireStorage() {
  if (isHosted && redisClients.length === 0) {
    const error = new Error('Upstash Redis is not configured');
    error.code = 'STORAGE_UNAVAILABLE';
    throw error;
  }
}

function storageUnavailable(cause) {
  const error = new Error('Upstash Redis is unavailable', { cause });
  error.code = 'STORAGE_UNAVAILABLE';
  return error;
}

async function selectRedis() {
  requireStorage();
  if (redisClients.length === 0) return null;
  if (activeRedis) return activeRedis;
  if (redisSelection) return redisSelection;

  redisSelection = (async () => {
    let lastError;
    for (const candidate of redisClients) {
      try {
        if (await candidate.client.ping() === 'PONG') {
          activeRedis = candidate.client;
          return activeRedis;
        }
      } catch (error) {
        lastError = error;
      }
    }
    throw storageUnavailable(lastError);
  })();

  try {
    return await redisSelection;
  } finally {
    redisSelection = null;
  }
}

async function withRedis(operation) {
  const redis = await selectRedis();
  try {
    return await operation(redis);
  } catch (error) {
    throw storageUnavailable(error);
  }
}

function readLocal() {
  ensureLocalDataDir();
  try {
    return fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf8')) : {};
  } catch {
    return {};
  }
}

function writeLocal(data) {
  ensureLocalDataDir();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function parse(value) {
  if (value == null) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

export const kv = {
  kind: redisClients.length > 0 ? 'upstash' : isHosted ? 'unavailable' : 'local',

  async ping() {
    requireStorage();
    if (redisClients.length > 0) {
      await selectRedis();
      return true;
    }
    readLocal();
    return true;
  },

  async get(key) {
    requireStorage();
    if (redisClients.length > 0) return parse(await withRedis((redis) => redis.get(key)));
    return readLocal()[key] ?? null;
  },

  async set(key, value) {
    requireStorage();
    if (redisClients.length > 0) {
      await withRedis((redis) => redis.set(key, JSON.stringify(value), { ex: ROOM_TTL_SECONDS }));
      return true;
    }
    const data = readLocal();
    data[key] = value;
    writeLocal(data);
    return true;
  },

  async setIfAbsent(key, value) {
    requireStorage();
    if (redisClients.length > 0) {
      return (await withRedis((redis) => redis.set(
        key,
        JSON.stringify(value),
        { nx: true, ex: ROOM_TTL_SECONDS },
      ))) === 'OK';
    }
    const data = readLocal();
    if (data[key] != null) return false;
    data[key] = value;
    writeLocal(data);
    return true;
  },

  async compareAndSet(key, expected, value) {
    requireStorage();
    if (redisClients.length > 0) {
      const script = `
        local current = redis.call('GET', KEYS[1])
        if current == ARGV[1] then
          redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
          return 1
        end
        return 0
      `;
      const changed = await withRedis((redis) => redis.eval(
        script,
        [key],
        [JSON.stringify(expected), JSON.stringify(value), String(ROOM_TTL_SECONDS)],
      ));
      return Number(changed) === 1;
    }
    const data = readLocal();
    if (JSON.stringify(data[key] ?? null) !== JSON.stringify(expected)) return false;
    data[key] = value;
    writeLocal(data);
    return true;
  },
};

export async function updateAtomically(key, updater, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const current = await kv.get(key);
    if (!current) return null;
    const next = await updater(structuredClone(current));
    if (!next) return { value: current, changed: false };
    if (await kv.compareAndSet(key, current, next)) return { value: next, changed: true };
  }
  const error = new Error('Concurrent room update conflict');
  error.code = 'ROOM_CONFLICT';
  throw error;
}
