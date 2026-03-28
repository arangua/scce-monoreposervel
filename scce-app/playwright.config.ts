import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — SCCE frontend E2E
 *
 * MODOS DE EJECUCIÓN:
 *
 *   npm run test:e2e           → headless (CI / verificación rápida)
 *   npm run test:e2e:watch     → ventana visible, velocidad normal para observar
 *   npm run test:e2e:slow      → ventana visible, muy lento — fácil de seguir
 *   npm run test:e2e:ui        → UI interactiva Playwright (recomendada para depurar)
 *   npm run test:e2e:smoke     → solo smoke tests, headless
 *
 * Prerequisitos: Docker + backend :3000 corriendo.
 * Vite :5173 se levanta automáticamente si no está corriendo.
 */

const isHeaded   = process.env.HEADED   === '1';
const isSlow     = process.env.SLOW     === '1';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',

  timeout: 45_000,
  expect: { timeout: 8_000 },

  retries: process.env.CI ? 2 : 0,

  /* Un solo worker en modo visual para que sea fácil de seguir */
  workers: (isHeaded || isSlow) ? 1 : (process.env.CI ? 2 : 1),

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: 'http://localhost:5173',

    /* Navegador visible si se pide */
    headless: !isHeaded && !isSlow,

    /**
     * slowMo: milisegundos de pausa entre cada acción (clic, fill, etc.)
     *  - modo watch: 400ms → fluido pero seguible
     *  - modo slow:  900ms → muy pausado, ideal para la primera revisión
     */
    slowMo: isSlow ? 900 : isHeaded ? 400 : 0,

    /* Ventana grande para ver bien la UI */
    viewport: { width: 1280, height: 800 },

    screenshot: 'only-on-failure',
    video: isHeaded || isSlow ? 'on' : 'retain-on-failure',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
