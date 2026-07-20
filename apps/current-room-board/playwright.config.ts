import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  webServer: {
    command: "npm run dev -- -H 127.0.0.1 -p 3100",
    url: "http://127.0.0.1:3100",
    env: {
      USE_MOCK_ARCHIE_DATA: "true",
      NEXT_PUBLIC_SHOW_NEXT_DEV_INDICATOR: "false",
    },
    reuseExistingServer: false,
  },
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "ipad-landscape",
      use: { ...devices["iPad (gen 7) landscape"] },
    },
  ],
});
