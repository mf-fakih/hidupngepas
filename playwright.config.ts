import { defineConfig, devices } from '@playwright/test';

const PORT = 3005;

/**
 * Test e2e alur utama, dijalankan terhadap build produksi (bukan dev server)
 * supaya yang dites = yang dirilis. Chromium saja.
 * Gerak dikurangi (`reducedMotion: 'reduce'`): kartu swipe & struk langsung ke hasil akhir,
 * jadi test tidak bergantung durasi animasi.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'hp',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run build && npm start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
  },
});
