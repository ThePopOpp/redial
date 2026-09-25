import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests-integrations',workers:1,fullyParallel:false,
  outputDir:'test-results/dashboard-artifacts',
  reporter:[['list'],['json',{outputFile:'test-results/dashboard-results.json'}]],
  use:{baseURL:'http://127.0.0.1:3212',channel:process.env.PLAYWRIGHT_CHANNEL || 'msedge',trace:'retain-on-failure'},
  webServer:[
    {command:'node scripts/dashboard-test-auth.mjs',url:'http://127.0.0.1:3213/health',reuseExistingServer:false},
    {command:'npm run start -- --port 3212',url:'http://127.0.0.1:3212/api/health',reuseExistingServer:false,env:{APP_BASE_URL:'http://127.0.0.1:3212',SUPABASE_URL:'http://127.0.0.1:3213',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test_not_a_real_project',NEXT_TELEMETRY_DISABLED:'1'}},
  ],
});
