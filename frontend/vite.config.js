import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import serverStatusPlugin from './vite-plugin-server-status.js';

export default defineConfig({
  plugins: [
    react({
      // Improve HMR reliability during development
      babel: {
        plugins: []
      }
    }),
    serverStatusPlugin()
  ],
  root: '.',
  publicDir: 'public',
  port: 5180,
  open: false,
  server: {
    force: true,
    watch: {
      usePolling: true,
      interval: 1000
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  cacheDir: 'node_modules/.vite_cache',
    // Improve HMR resilience
    hmr: {
      overlay: true,
      clientPort: 5180
    },
  build: {
    outDir: 'dist-new',
    sourcemap: true,
    // Improve build resilience
    rollupOptions: {
      onwarn(warning, warn) {
        // Ignore certain warnings during development
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
      output: {
        // Manual chunk splitting for better caching
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('react-router-dom')) {
            return 'router-vendor';
          }
          if (id.includes('lucide-react')) {
            return 'ui-vendor';
          }
          // Context chunks
          if (id.includes('contexts/AuthContext') || id.includes('contexts/ToastContext') || id.includes('contexts/ColorPaletteContext')) {
            return 'contexts';
          }
        },
        // Optimize chunk names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // Enable chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Minify CSS
    cssMinify: true,
    // Target modern browsers
    target: 'esnext'
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios']
  }
});
