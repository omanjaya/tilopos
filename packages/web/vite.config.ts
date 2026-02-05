/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// CDN base URL: when VITE_CDN_URL is set, all asset references in the built
// HTML/CSS/JS will be prefixed with this URL. Falls back to '/' for local dev.
const cdnUrl = process.env.VITE_CDN_URL;

export default defineConfig({
  // When a CDN URL is configured, use it as the base for all asset paths.
  // This ensures built files reference the CDN origin instead of the app server.
  base: cdnUrl || '/',
  plugins: [
    react(),
    // Bundle analysis - generates stats.html after build
    process.env.ANALYZE === 'true' && visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Content hash in filenames for long-term caching / cache busting.
        // Assets with hashed names can be served with immutable cache headers.
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
    // Generate source maps for production debugging
    sourcemap: true,
  },
  server: {
    port: 5173,
    host: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
});
