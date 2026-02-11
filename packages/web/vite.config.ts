/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// import { visualizer } from 'rollup-plugin-visualizer';

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
    // process.env.ANALYZE === 'true' && visualizer({
    //   filename: './dist/stats.html',
    //   open: false,
    //   gzipSize: true,
    //   brotliSize: true,
    // }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Target modern browsers for smaller bundle
    target: 'es2020',
    // Enable minification with esbuild (faster than terser, built-in)
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Content hash in filenames for long-term caching / cache busting.
        // Assets with hashed names can be served with immutable cache headers.
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        // Manual chunks for better code splitting
        manualChunks: (id) => {
          // Recharts library (used in reports/charts)
          if (id.includes('node_modules/recharts')) {
            return 'recharts';
          }
          // html2canvas (used for PDF/image export)
          if (id.includes('node_modules/html2canvas')) {
            return 'html2canvas';
          }
          // jsPDF (used for PDF export)
          if (id.includes('node_modules/jspdf')) {
            return 'jspdf';
          }
          // React Query
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'react-query';
          }
          // Date libraries
          if (id.includes('node_modules/date-fns')) {
            return 'date-fns';
          }
          // Radix UI components (large UI library)
          if (id.includes('node_modules/@radix-ui')) {
            return 'radix-ui';
          }
          // Lucide icons
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide-icons';
          }
          // All other node_modules go to vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    // Hidden source maps: generated for error tracking tools (e.g. Sentry)
    // but NOT referenced in the built JS files, so browsers can't access them.
    sourcemap: 'hidden',
    // Increase chunk size warning limit (we have manual chunks now)
    chunkSizeWarningLimit: 600,
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
      '/socket.io': {
        target: process.env.API_URL || 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
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
