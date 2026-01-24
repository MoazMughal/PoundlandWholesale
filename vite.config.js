import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Plugin to replace localhost URLs in production
const replaceLocalhostPlugin = () => ({
  name: 'replace-localhost',
  transform(code, id) {
    if (process.env.NODE_ENV === 'production' && (id.endsWith('.js') || id.endsWith('.jsx'))) {
      // Replace localhost URLs with production URLs
      let transformedCode = code.replace(/http:\/\/localhost:5000/g, 'https://generic-wholesale-backend.onrender.com');
      
      // Also handle any remaining localhost references in image URLs
      transformedCode = transformedCode.replace(/localhost:5000/g, 'generic-wholesale-backend.onrender.com');
      
      return transformedCode;
    }
    return code;
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), replaceLocalhostPlugin()],
  assetsInclude: ['**/*.jpg', '**/*.jpeg', '**/*.png', '**/*.gif', '**/*.svg', '**/*.webp'],
  build: {
    assetsInlineLimit: 4096, // Inline small assets (4kb)
    // Optimize build
    minify: 'esbuild', // Use esbuild (faster and built-in)
    // Remove console.logs in production
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
    },
    // Code splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom']
        },
        // Optimize chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Disable source maps in production for smaller bundle
    sourcemap: false,
    // CSS code splitting
    cssCodeSplit: true,
    // Target modern browsers for smaller bundle
    target: 'es2015',
    // Optimize CSS
    cssMinify: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: []
  },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    },
    fs: {
      // Allow serving files from assets
      allow: ['..']
    }
  },
  // Handle client-side routing
  preview: {
    port: 3000,
    strictPort: true,
    // Add fallback for client-side routing in preview mode
    open: true,
    cors: true
  },
  // Use absolute base path for SPA routing
  base: '/'
})
