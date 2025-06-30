import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*Test.ts', '**/*.test.ts', '**/*.spec.ts'],
  },
  
});
