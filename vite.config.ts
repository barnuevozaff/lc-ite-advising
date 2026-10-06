import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Rules tests need the Firestore emulator: `npm run test:rules`.
  test: { exclude: ['tests/rules/**', 'node_modules/**'] },
})
