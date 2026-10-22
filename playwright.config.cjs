const { defineConfig, devices } = require('@playwright/test')
module.exports = defineConfig({
  testDir: './tests/e2e', timeout: 240000, expect: { timeout: 20000 }, workers: 1,
  forbidOnly: Boolean(process.env.CI), retries: 0,
  outputDir: 'scratch/e2e-results',
  reporter: [['list'], ['html', { outputFolder: 'scratch/e2e-report', open: 'never' }]],
  use: { baseURL: process.env.E2E_BASE_URL, actionTimeout: 20000, navigationTimeout: 45000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'celular', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } }
  ]
})
