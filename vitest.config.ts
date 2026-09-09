/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        // CI runners (ubuntu-latest) have 7 GB RAM. Each jsdom-env fork can use ~2 GB.
        // Cap at 2 forks in CI to stay within memory; local dev uses all cores.
        maxForks: process.env.CI ? 2 : undefined,
      },
    },
    setupFiles: ['src/__tests__/setup.ts'],
    include: [
      './src/**/*.{test,spec}.{js,jsx,ts,tsx}',
      './tests/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
    deps: {
      inline: ['vitest-environment-jsdom'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
