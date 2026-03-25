import { defineConfig, devices } from '@playwright/test';

/** 与 vite.config 中 GitHub Pages base 一致（无前导 host） */
export const E2E_BASE_PATH = '/ai_test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 420_000,
  expect: { timeout: 30_000 },
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:5174${E2E_BASE_PATH}/`,
    trace: 'on-first-retry',
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Pixel 5'] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_SERVER
    ? undefined
    : {
        command: 'npm run build && npm run preview:test',
        url: `http://127.0.0.1:5174${E2E_BASE_PATH}/`,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
