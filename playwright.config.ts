import { defineConfig } from '@playwright/test';
import { BASE_URL } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  globalSetup: './src/config/global-setup.ts',
  timeout: 15_000,
  expect: { timeout: 5_000 },

  // The API keeps data in memory and shares it between all requests, so tests run serially.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: !!process.env.CI,

  reporter: [['list'], ['html', { open: 'never' }]],

  // No browser projects: these are pure API tests, so no browser download is needed.
  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: { Accept: 'application/json' },
  },
});
