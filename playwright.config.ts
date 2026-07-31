import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './acceptance/specs',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  globalSetup: './acceptance/global-setup.ts',
  reporter: [
    ['line'],
    ['html', { outputFolder: 'acceptance/artifacts/playwright-report', open: 'never' }],
    ['json', { outputFile: 'acceptance/artifacts/playwright-results.json' }],
  ],
  outputDir: 'acceptance/artifacts/test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run dev -- --mode acceptance --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
