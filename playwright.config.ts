import { defineConfig, devices } from '@playwright/test';

// No webServer on purpose. These tests load dist/index.html over file:// because
// that is the environment the permanence plan promises will work.
export default defineConfig({
  testDir: './tests',
  // Only .spec.ts here. tests/unit/*.test.ts belongs to vitest.
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  reporter: [['list']],
  use: { trace: 'off' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
