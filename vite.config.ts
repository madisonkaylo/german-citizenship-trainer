import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  build: { target: ['es2020', 'safari14'] },
  test: { include: ['src/**/*.test.ts'], environment: 'jsdom' },
})
