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
const API_HEALTH = 'http://127.0.0.1:3001/api/health';

const children = [];

function run(cmd, args, label) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
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
console.log('Avvio server API su http://localhost:3001 …');
run('node', ['server.js'], 'api');

const ready = await waitForApi();
if (!ready) {
  console.warn('[api] Health check non riuscito entro 20s — avvio Vite comunque.');
} else {
  console.log('[api] Pronta.');
}

console.log('Avvio frontend Vite su http://localhost:5173 …');
console.log('Apri http://localhost:5173 — multiplayer: crea/unisciti a una stanza.\n');
run('npx', ['vite'], 'vite');
