import { fileURLToPath } from 'node:url'
import { buildNextConfig } from '@hypocrates/core-dashboard/next.config.base.mjs'

// outputFileTracingRoot must be this project's root (this folder, which is
// also the npm workspace root).
const projectRoot = fileURLToPath(new URL('.', import.meta.url))

const config = buildNextConfig({
  outputFileTracingRoot: projectRoot,
})

// Front-end-only demo: bake demo mode in so Vercel needs no env vars.
config.env = {
  ...config.env,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE || 'true',
  NEXT_PUBLIC_ENABLE_DEMO_LOGIN: process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN || 'true',
}

export default config
