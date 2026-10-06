/// <reference types="vitest" />
// Code-review scratch config: runs the probe spec that lives outside src/.
import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const root = path.resolve(__dirname, '../..');

export default defineConfig({
  root,
  plugins: [react()],
  test: {
    globals: true,
    clearMocks: false,
    environment: 'node',
    pool: 'forks',
    setupFiles: ['src/__tests__/setup.ts'],
    include: ['./agent-output/artifacts/**/*.vitest-case.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(root, './src') },
  },
});
