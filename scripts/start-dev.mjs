#!/usr/bin/env node
/**
 * Avvia API locale (:3001) + Vite (:5173) per lo sviluppo.
 * Root = cartella MiningGame (non dipende dalla cwd del terminale).
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const apiPort = Number.parseInt(process.env.API_PORT || '3001', 10);
const vitePort = Number.parseInt(process.env.VITE_PORT || '5173', 10);
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const API_HEALTH = `${apiOrigin}/api/health`;
const childEnv = {
  ...process.env,
  PORT: String(apiPort),
  VITE_API_TARGET: apiOrigin,
};

const children = [];

function run(cmd, args, label) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: childEnv,
  });
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${label}] terminato con codice ${code}`);
    }
  });
  children.push({ child, label });
  return child;
}

async function waitForApi(maxMs = 20000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(API_HEALTH);
      if (res.ok) return true;
    } catch {
      /* API non ancora pronta */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function shutdown() {
  for (const { child, label } of children) {
    try {
      child.kill('SIGTERM');
    } catch {
      console.warn(`[${label}] già terminato`);
    }
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`Root progetto: ${root}`);
console.log(`Avvio server API su http://localhost:${apiPort} …`);
run('node', ['server.js'], 'api');

const ready = await waitForApi();
if (!ready) {
  console.warn('[api] Health check non riuscito entro 20s — avvio Vite comunque.');
} else {
  console.log('[api] Pronta.');
}

console.log(`Avvio frontend Vite su http://localhost:${vitePort} …`);
console.log(`Apri http://localhost:${vitePort} — multiplayer: crea/unisciti a una stanza.\n`);
run('npx', ['vite', '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'], 'vite');
