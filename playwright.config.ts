import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: "bash -lc 'cd .. && docker rm -f synthify-e2e-api >/dev/null 2>&1 || true && docker volume create synthify-e2e-go-pkg >/dev/null && docker volume create synthify-e2e-go-build >/dev/null && docker run --rm --name synthify-e2e-api -p 18080:18080 -e GOFLAGS=-buildvcs=false -e PORT=18080 -e CORS_ALLOWED_ORIGINS=http://127.0.0.1:4173 -e E2E_AUTH_ENABLED=1 -v \"$PWD\":/workspace -v synthify-e2e-go-pkg:/go/pkg/mod -v synthify-e2e-go-build:/root/.cache/go-build -w /workspace golang:1.25-bookworm go run ./api/cmd/e2e-server'",
      url: "http://127.0.0.1:18080/health",
      reuseExistingServer: false,
      timeout: 600 * 1000,
    },
    {
      command: "node ./tests/fixtures/frontend.mjs",
      url: "http://127.0.0.1:4173/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
