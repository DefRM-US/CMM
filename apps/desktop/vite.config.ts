/// <reference types="vitest" />
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'react-native': path.resolve(__dirname, 'src/react-native.ts'),
      '@repo/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@repo/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-utils/setup.ts'],
    exclude: ['tests/e2e/**'],
    alias: {
      'react-native': path.resolve(__dirname, 'src/react-native.ts'),
      '@repo/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@repo/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
    },
  },
});
