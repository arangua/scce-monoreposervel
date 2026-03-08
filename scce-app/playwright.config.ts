import { defineConfig, devices } from "@playwright/test";

/**
 * E2E SCCE — Validación operacional y cierre.
 * Requisitos: app en http://localhost:5173; opcionalmente API en .env (VITE_API_BASE_URL).
 * Credenciales: E2E_LOGIN_EMAIL, E2E_LOGIN_PASSWORD (mismo usuario/contraseña que seed de API).
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    video: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  timeout: 90_000,
  expect: { timeout: 10_000 },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
