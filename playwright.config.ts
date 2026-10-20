import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/browser-results.json' }]],
  // CI runners have no GPU. Without software rasterisation Chromium cannot
  // create a WebGL context, so the Three.js scene never reports data-rendered
  // and the landing assertions fail on capability rather than on behaviour.
  // The journey specs also exceed the 30s default on a slower machine, so the
  // budget is raised there instead of weakening what they assert.
  timeout: process.env.CI ? 90_000 : 30_000,
  expect: { timeout: process.env.CI ? 15_000 : 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:3210',
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'] },
  },
  webServer: {
    command: 'npm run start -- --port 3210',
    url: 'http://127.0.0.1:3210',
    reuseExistingServer: false,
    // Shaped like a real Supabase configuration so the sign-in and registration
    // forms render and can be exercised. Without it those pages return the
    // "access unavailable" panel, which means the real auth forms were never
    // what the viewport and WCAG route checks were measuring.
    //
    // The project does not exist and nothing here submits to it: these tests
    // read the markup and operate controls that do not leave the page.
    env: {
      NEXT_TELEMETRY_DISABLED: '1',
      SUPABASE_URL: 'https://examplelocaltest.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_test_not_a_real_key',
    },
  },
});
