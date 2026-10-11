import {defineConfig, devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',
  fullyParallel:false,
  workers:1,
  use:{baseURL:'http://localhost:4173',...devices['iPhone 13'],defaultBrowserType:'chromium',headless:true},
  webServer:{command:'npm start',url:'http://localhost:4173',reuseExistingServer:true},
  reporter:'list'
});
