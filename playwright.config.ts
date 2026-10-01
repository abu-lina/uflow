import { defineConfig, devices } from '@playwright/test';

import { resolveSupabaseEnv } from './e2e/fixtures';

const baseURL = 'http://127.0.0.1:3000';

const supabase = resolveSupabaseEnv();

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  retries: 0,
  reporter: [['list'], ['html']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: supabase.apiUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
    },
  },
});
