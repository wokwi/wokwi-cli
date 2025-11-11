import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/test/wokwi-embed/**', // Exclude Playwright tests
    ],
  },
});

