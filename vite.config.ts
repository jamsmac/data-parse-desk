import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === "production" && visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Оптимизированный лимит для warning о размере chunk
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Firebase chunks
          if (id.includes('firebase')) {
            return 'firebase';
          }

          // React ecosystem
          if (id.includes('react-dom') || id.includes('react/')) {
            return 'react-vendor';
          }

          // UI components
          if (id.includes('@radix-ui') || id.includes('cmdk')) {
            return 'ui-vendor';
          }

          // Charts - самый тяжелый
          if (id.includes('recharts') || id.includes('d3')) {
            return 'charts';
          }

          // Data processing
          if (id.includes('xlsx') || id.includes('exceljs') || id.includes('papaparse')) {
            return 'data-processing';
          }

          // Supabase
          if (id.includes('@supabase')) {
            return 'supabase';
          }

          // Forms and validation
          if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) {
            return 'forms';
          }

          // State management and routing
          if (id.includes('@tanstack') || id.includes('react-router')) {
            return 'app-core';
          }

          // Utilities
          if (id.includes('date-fns') || id.includes('dayjs') || id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'utils';
          }

          // Icons
          if (id.includes('lucide-react')) {
            return 'icons';
          }
        },
        // Оптимизация имен файлов
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : '';
          return `assets/${chunkInfo.name}-[hash].js`;
        },
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      // Tree shaking
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
    // Минификация с агрессивными настройками
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info', 'console.debug', 'console.warn'] : [],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
        ascii_only: true,
      },
    },
    // Source maps только для development
    sourcemap: mode === 'development',
    // Оптимизация CSS
    cssCodeSplit: true,
    cssMinify: true,
    // Оптимизация ассетов
    assetsInlineLimit: 4096,
    // Report compressed size
    reportCompressedSize: true,
  },
  // Оптимизация зависимостей
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
    ],
    exclude: ['lovable-tagger'],
  },
}));
