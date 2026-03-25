import { defineConfig, devices } from '@playwright/test';

/** 与 vite.config 的 base 路径段一致（无末尾 /） */
function e2eBasePath(): string {
  const explicit = process.env.E2E_BASE?.trim();
  if (explicit) {
    const s = explicit.replace(/\/$/, '');
    return s || '/ai_test';
  }
  const gh = process.env.GITHUB_REPOSITORY;
  if (gh) {
    const repo = gh.split('/')[1];
    if (repo) return `/${repo}`;
  }
  return '/ai_test';
}

const E2E_BASE_PATH = e2eBasePath();

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
