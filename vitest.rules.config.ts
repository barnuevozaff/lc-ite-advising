import { defineConfig } from 'vitest/config'

// Security-rules tests; run through `npm run test:rules`, which starts the Firestore emulator.
export default defineConfig({
  test: { include: ['tests/rules/**/*.test.ts'], environment: 'node', fileParallelism: false },
})
