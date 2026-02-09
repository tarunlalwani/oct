import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: ['src/index.ts', '**/*.test.ts', '**/node_modules/**', '**/dist/**'],
      thresholds: {
        lines: 85,
        functions: 100,
        branches: 60,
        statements: 85,
      },
    },
  },
});
