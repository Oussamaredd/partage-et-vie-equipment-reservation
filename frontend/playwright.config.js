import { defineConfig } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173'
const disableWebServer = process.env.PLAYWRIGHT_DISABLE_WEBSERVER === '1'

const config = {
  testDir: './tests/e2e',
  use: {
    baseURL,
    headless: true,
  },
}

if (!disableWebServer) {
  config.webServer = {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    env: {
      ...process.env,
      VITE_API_PROXY_TARGET: process.env.VITE_API_PROXY_TARGET ?? 'http://127.0.0.1:8000',
    },
  }
}

export default defineConfig(config)
