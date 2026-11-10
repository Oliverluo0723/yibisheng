/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        exp01: 'experiments/01-growth-branch/index.html',
        exp02: 'experiments/02-brushes/index.html',
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
