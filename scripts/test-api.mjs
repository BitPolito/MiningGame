#!/usr/bin/env node
import { spawn } from 'node:child_process';

const server = spawn(process.execPath, ['server.js'], { stdio: ['ignore', 'pipe', 'inherit'] });
server.stdout.on('data', (chunk) => process.stdout.write(chunk));

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:3001/api/health');
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('API did not become healthy');
}

try {
  await waitForHealth();
  const test = spawn(process.execPath, ['scripts/test-room-flow.mjs'], { stdio: 'inherit' });
  const exitCode = await new Promise((resolve) => test.on('exit', resolve));
  if (exitCode !== 0) process.exitCode = exitCode || 1;
} finally {
  server.kill('SIGTERM');
}
