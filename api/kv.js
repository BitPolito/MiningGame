import fs from 'fs';
import path from 'path';

// If VERCEL_KV is actually provided, we'd use import { kv } from '@vercel/kv'
// For this setup without requiring them to provision anything right now, we use a simple mock using /tmp/kv.json
// On Vercel, /tmp is writable but ephemeral (will reset). Good enough for testing a 5 minute game without account setup!

const dbPath = path.join('/tmp', 'blockgame_kv.json');

const readDB = () => {
  try {
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
    fs.writeFileSync(dbPath, JSON.stringify(data));
  } catch (e) {
    console.error('Error writing KV DB', e);
  }
};

export const kv = {
  get: async (key) => {
    const db = readDB();
    return db[key] || null;
  },
  set: async (key, value) => {
    const db = readDB();
    db[key] = value;
    writeDB(db);
    return true;
  },
  update: async (key, updaterFn) => {
    // Atomic update for local mock
    const db = readDB();
    const current = db[key] || null;
    if (!current) return null;
    const newVal = updaterFn(current);
    db[key] = newVal;
    writeDB(db);
    return newVal;
  }
};
