import { defineConfig } from "vite";
import path from 'path'

export default defineConfig({
  build: {
    lib: {
      // Important: Entry point for your preload script
      entry: path.resolve(__dirname, 'src/preload/index.ts'),
      formats: ['cjs'], // Electron preload needs CommonJS
      fileName: () => 'preload.js', // Output file will be preload.js
    },
    outDir: '.vite/build/preload', // or wherever you want it
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron'], // Important: don't bundle electron imports
    },
    minify: false, // up to you, for preload I recommend no minification
  },
});
