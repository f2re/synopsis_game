import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
  },
});
