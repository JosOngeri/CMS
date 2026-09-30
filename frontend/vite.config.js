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
      // Polling is only needed on network drives/WSL — enable with
      // VITE_USE_POLLING=1 to avoid constant CPU use on normal disks.
      usePolling: process.env.VITE_USE_POLLING === '1',
      interval: 1000
    }
  },
  build: {
    outDir: 'dist-new',
    sourcemap: false,
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('lucide')) return 'vendor-ui';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('axios')) return 'vendor-api';
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: []
  }
});
