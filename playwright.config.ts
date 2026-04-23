import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  webServer: {
    command: 'npm run dev -- --port 3456',
    port: 3456,
    timeout: 120_000,
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:3456',
    ...devices['Desktop Chrome'],
  },
});
