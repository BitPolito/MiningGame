import { defineConfig, devices } from '@playwright/test';

const frontendPort = Number.parseInt(process.env.PLAYWRIGHT_PORT || '4173', 10);
const apiPort = Number.parseInt(process.env.PLAYWRIGHT_API_PORT || '3102', 10);
const baseURL = `http://127.0.0.1:${frontendPort}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm start',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      API_PORT: String(apiPort),
      VITE_PORT: String(frontendPort),
      MINING_GAME_LOCAL_DB_PATH: `/tmp/mining-game-e2e-test-${apiPort}.json`,
    },
  },
});
