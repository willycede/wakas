import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname),
  // Marca de versión: las imágenes se piden como ?v=<versión> y el navegador nunca mezcla arte viejo y nuevo.
  define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  publicDir: resolve(__dirname, '../assets'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    // dos páginas: el juego y el panel del dueño (/admin)
    rollupOptions: { input: { main: resolve(__dirname, 'index.html'), admin: resolve(__dirname, 'admin.html') } },
  },
});
