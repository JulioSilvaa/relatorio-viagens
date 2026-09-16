import { defineConfig, devices } from "@playwright/test";

/**
 * Requer o servidor de dev já em pé (Docker ou host) — ver `docker compose up web`
 * ou `yarn workspace @vdr/web dev`. Não sobe um servidor próprio porque o dev
 * deste projeto roda via Docker/host, não algo que o Playwright deveria gerenciar.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
