import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./scenarios",
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    browserName: "chromium",
    baseURL: "http://127.0.0.1:4178",
    viewport: { width: 1000, height: 800 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node server.mjs",
    url: "http://127.0.0.1:4178",
    reuseExistingServer: false,
  },
});
