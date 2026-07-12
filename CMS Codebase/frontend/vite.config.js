import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: []
      }
    })
  ],
  root: '.',
  publicDir: 'public',
  cacheDir: '../.vite-cache',
  server: {
    port: 5181,
    strictPort: true,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    },
    hmr: {
      overlay: true,
      clientPort: 5181
    },
    watch: {
      usePolling: true,
      interval: 1000
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('lucide')) return 'vendor-ui';
            return 'vendor';
          }
        }
      }
    }
  }
});
