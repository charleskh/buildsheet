import { defineConfig } from 'vitest/config';

// Unit tests only. The Playwright specs in tests/*.spec.ts run under
// `pnpm test:e2e` and must not be collected here.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node'
  }
});
