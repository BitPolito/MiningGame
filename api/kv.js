import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Redis } from '@upstash/redis';

export const ROOM_TTL_SECONDS = 24 * 60 * 60;
const isHosted = Boolean(process.env.VERCEL || process.env.NODE_ENV === 'production');
export function getRedisConfig(env = process.env) {
  return {
    url: env.MINING_GAME_KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL,
    token: env.MINING_GAME_KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN,
  };
}

const { url: redisUrl, token: redisToken } = getRedisConfig();
const hasRedis = Boolean(redisUrl && redisToken);

const redis = hasRedis
  ? new Redis({ url: redisUrl, token: redisToken, automaticDeserialization: false })
  : null;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '.data');
const dbPath = path.join(dataDir, 'rooms.json');

function requireStorage() {
  if (isHosted && !redis) {
    const error = new Error('Upstash Redis is not configured');
    error.code = 'STORAGE_UNAVAILABLE';
    throw error;
  }
}

function readLocal() {
  fs.mkdirSync(dataDir, { recursive: true });
  try {
    return fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf8')) : {};
  } catch {
    return {};
  }
}

function writeLocal(data) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function parse(value) {
  if (value == null) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

export const kv = {
  kind: redis ? 'upstash' : isHosted ? 'unavailable' : 'local',

  async ping() {
    requireStorage();
    if (redis) return (await redis.ping()) === 'PONG';
    readLocal();
    return true;
  },

  async get(key) {
    requireStorage();
    if (redis) return parse(await redis.get(key));
    return readLocal()[key] ?? null;
  },

  async set(key, value) {
    requireStorage();
    if (redis) {
      await redis.set(key, JSON.stringify(value), { ex: ROOM_TTL_SECONDS });
      return true;
    }
    const data = readLocal();
    data[key] = value;
    writeLocal(data);
    return true;
  },

  async setIfAbsent(key, value) {
    requireStorage();
    if (redis) {
      return (await redis.set(key, JSON.stringify(value), { nx: true, ex: ROOM_TTL_SECONDS })) === 'OK';
    }
    const data = readLocal();
    if (data[key] != null) return false;
    data[key] = value;
    writeLocal(data);
    return true;
  },

  async compareAndSet(key, expected, value) {
    requireStorage();
    if (redis) {
      const script = `
        local current = redis.call('GET', KEYS[1])
        if current == ARGV[1] then
          redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
          return 1
        end
        return 0
      `;
      const changed = await redis.eval(
        script,
        [key],
        [JSON.stringify(expected), JSON.stringify(value), String(ROOM_TTL_SECONDS)],
      );
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
