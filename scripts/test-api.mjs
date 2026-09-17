#!/usr/bin/env node
import { spawn } from 'node:child_process';

const testPort = Number.parseInt(process.env.TEST_API_PORT || '3101', 10);
const testBase = `http://127.0.0.1:${testPort}`;
const childEnv = {
  ...process.env,
  PORT: String(testPort),
  ROOM_API: `${testBase}/api/room`,
  MINING_GAME_LOCAL_DB_PATH: `/tmp/mining-game-api-test-${testPort}.json`,
};
const server = spawn(process.execPath, ['server.js'], {
  stdio: ['ignore', 'pipe', 'inherit'],
  env: childEnv,
});
server.stdout.on('data', (chunk) => process.stdout.write(chunk));

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${testBase}/api/health`);
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
  for (const script of ['scripts/test-room-flow.mjs', 'scripts/test-room-capacity.mjs']) {
    const test = spawn(process.execPath, [script], { stdio: 'inherit', env: childEnv });
    const exitCode = await new Promise((resolve) => test.on('exit', resolve));
    if (exitCode !== 0) {
      process.exitCode = exitCode || 1;
      break;
    }
  }
} finally {
  server.kill('SIGTERM');
}
