import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist', emptyOutDir: true, sourcemap: false,
    rollupOptions: { output: {
      entryFileNames: 'assets/[name].js',
      chunkFileNames: 'assets/[name].js',
      assetFileNames: 'assets/[name][extname]',
    } },
  },
  server: { host: '127.0.0.1', port: 5173 },
});
