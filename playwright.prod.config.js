import { defineConfig, devices } from '@playwright/test';
import process from 'node:process';

const frontendPort = Number.parseInt(process.env.PLAYWRIGHT_PROD_PORT || '4174', 10);
const apiPort = Number.parseInt(process.env.PLAYWRIGHT_PROD_API_PORT || '3103', 10);
const baseURL = `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: './tests/prod',
  fullyParallel: false,
  workers: 2,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [360, 393, 900, 1024, 1280, 1440].map((width) => ({
    name: `production-${width}`,
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width, height: width < 500 ? 780 : 900 },
      isMobile: width < 500,
      hasTouch: width < 500,
    },
  })),
  webServer: [
    {
      command: 'node server.js',
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: String(apiPort),
        MINING_GAME_LOCAL_DB_PATH: `/tmp/mining-game-prod-e2e-${apiPort}.json`,
      },
    },
    {
      command: `npm run preview -- --host 127.0.0.1 --port ${frontendPort} --strictPort`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { ...process.env, VITE_API_TARGET: `http://127.0.0.1:${apiPort}` },
    },
  ],
});
