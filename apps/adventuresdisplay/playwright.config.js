import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.js', timeout: 30000,
  workers: 2, fullyParallel: true,
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1024, height: 768 }, serviceWorkers: 'block', trace: 'retain-on-failure' },
  projects: [{ name: 'ipad-webkit', use: { browserName: 'webkit', hasTouch: true, deviceScaleFactor: 2 } }, { name: 'chromium', use: { browserName: 'chromium' } }]
});
