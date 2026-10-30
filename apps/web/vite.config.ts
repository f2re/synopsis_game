import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@synopsis/world-engine/bridge',
        replacement: path.resolve(__dirname, '../../packages/world-engine/src/bridge/WorldBridge.ts'),
      },
      {
        find: '@synopsis/world-engine',
        replacement: path.resolve(__dirname, '../../packages/world-engine/src/index.ts'),
      },
      {
        find: 'phaser',
        replacement: path.resolve(__dirname, 'node_modules/.pnpm/phaser@4.2.1/node_modules/phaser'),
      },
    ],
  },
  optimizeDeps: {
    exclude: ['@synopsis/world-engine'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      ignored: ['!**/packages/world-engine/**'],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: false,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: false,
      },
    },
  },
});
