import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
export default defineConfig({
  root: import.meta.dirname, base: './', plugins: [react()],
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: { popup: path.resolve(import.meta.dirname, 'index.html'), background: path.resolve(import.meta.dirname, 'src/background.ts') }, output: { entryFileNames: chunk => chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js' } } },
})
