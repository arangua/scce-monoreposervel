/**
 * 06-smoke.spec.ts — Regresión rápida post-refactor
 *
 * Detecta en ~30s los problemas más graves:
 *  - Crash al cargar la app
 *  - Crash al navegar por vistas
 *  - Texto "undefined" / "NaN" / "[object Object]" visible en la UI
 *  - Errores de consola JavaScript críticos
 */
import { test, expect } from '@playwright/test';
import { login } from './fixtures';

test.describe('Smoke — regresión post-refactor R-4', () => {

  test('app carga sin errores críticos de consola', async ({ page }) => {
    const criticalErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const txt = msg.text();
        if (txt.includes('favicon') || txt.includes('chrome-extension') || txt.includes('net::ERR'))
          return;
        criticalErrors.push(txt);
      }
    });
    page.on('pageerror', err => criticalErrors.push(`PAGE ERROR: ${err.message}`));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(
      criticalErrors,
      `Errores de consola al cargar:\n${criticalErrors.join('\n')}`
    ).toHaveLength(0);
  });

  test('login completo sin errores de página', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await login(page);

    expect(pageErrors, `Page errors tras login:\n${pageErrors.join('\n')}`).toHaveLength(0);
    await expect(page.getByText('Panel de Operacion')).toBeVisible();
  });

  test('navegar por todas las vistas del nav sin crash', async ({ page }) => {
    await login(page);

    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    const vistas = [
      '🗂 Catálogo',
      '🔗 Auditoría',
      'Reportes',
      'Simulación',
      'Checklist',
      'Config',
      'Dashboard',   // volver al inicio
    ];

    for (const vista of vistas) {
      await page.getByRole('button', { name: vista }).click();
      // Pequeña pausa para que el componente monte completamente
      await page.waitForTimeout(400);
      // La página no debe estar vacía
      await expect(page.locator('body')).not.toBeEmpty();
    }

    expect(
      pageErrors,
      `Errores durante navegación:\n${pageErrors.join('\n')}`
    ).toHaveLength(0);
  });

  test('texto de la UI no contiene "undefined", "NaN" ni "[object Object]"', async ({ page }) => {
    await login(page);

    // Revisar Dashboard
    const bodyText = await page.locator('body').innerText();

    const problemas = [
      { pattern: /\bundefined\b/, label: '"undefined"' },
      { pattern: /\bNaN\b/,       label: '"NaN"' },
      { pattern: /\[object Object\]/, label: '"[object Object]"' },
    ];

    for (const { pattern, label } of problemas) {
      expect(
        bodyText,
        `La UI muestra el texto ${label} — posible bug de rendering`
      ).not.toMatch(pattern);
    }
  });

  test('abrir detalle de caso no causa crash', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await login(page);

    // Si hay casos, abrir el primero
    const primerCard = page.locator('[style*="border-left"]').first();
    if (await primerCard.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await primerCard.click();
      await page.getByRole('button', { name: '← Volver' }).waitFor({ state: 'visible', timeout: 8_000 });
    }

    expect(
      pageErrors,
      `Errores al abrir detalle:\n${pageErrors.join('\n')}`
    ).toHaveLength(0);
  });

  test('formulario nuevo caso monta sin crash', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await login(page);
    await page.getByRole('button', { name: '+ Incidente' }).click();
    await page.getByText('PASO 1 — IDENTIFICACIÓN').waitFor({ state: 'visible', timeout: 5_000 });

    expect(
      pageErrors,
      `Errores al abrir formulario:\n${pageErrors.join('\n')}`
    ).toHaveLength(0);
  });

});
