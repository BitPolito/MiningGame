import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '.data');
const dbPath = path.join(dataDir, 'rooms.json');

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const readDB = () => {
  try {
    ensureDataDir();
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading KV DB', e);
  }
  return {};
};

const writeDB = (data) => {
  try {
    ensureDataDir();
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error writing KV DB', e);
    throw e;
  }
};

const fileKv = {
  get: async (key) => {
    const db = readDB();
    return db[key] ?? null;
  },
  set: async (key, value) => {
    const db = readDB();
    db[key] = value;
    writeDB(db);
    return true;
  },
  update: async (key, updaterFn) => {
    const db = readDB();
    const current = db[key] ?? null;
    if (!current) return null;
    const newVal = updaterFn(current);
    db[key] = newVal;
    writeDB(db);
    return newVal;
  },
};

/** Prefer Vercel KV in production; fall back to project .data store locally. */
async function resolveKv() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv } = await import('@vercel/kv');
      return kv;
    } catch (e) {
      console.warn('@vercel/kv unavailable, using file fallback:', e.message);
    }
  }
  return fileKv;
}

let kvPromise = null;

export const kv = {
  get: async (key) => (await getKv()).get(key),
  set: async (key, value) => (await getKv()).set(key, value),
  update: async (key, updaterFn) => {
    const impl = await getKv();
    if (impl.update) return impl.update(key, updaterFn);
    const current = await impl.get(key);
    if (!current) return null;
    const newVal = updaterFn(current);
    await impl.set(key, newVal);
    return newVal;
  },
};

async function getKv() {
  if (!kvPromise) kvPromise = resolveKv();
  return kvPromise;
}
