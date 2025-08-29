import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['src/test/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    globals: true,
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/', 'dist/'],
  },
});