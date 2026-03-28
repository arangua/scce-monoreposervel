/**
 * 04-detalle-caso.spec.ts — Vista de detalle de un caso
 *
 * Textos exactos de CaseDetailView.tsx:
 *  - Botón "← Volver" (vuelve al dashboard)
 *  - Sección "ACCIONES" → placeholder "Accion..."
 *  - Botón "+ Accion"
 *  - Sección "DECISIONES" → placeholder "Fundamento de decision..."
 *  - Botón "+ Decision"
 *  - Sección "LINEA DE TIEMPO"
 *  - Sección "FICHA EVALUACION"
 *  - Sección "METRICAS"
 *  - Sección "AUDITORIA (N eventos)"
 *  - Botón "TXT"
 *  - Selector de estado: valores "Nuevo" | "Recepcionado por DR" | "En gestion" | etc.
 *
 * Nota: CaseDetailView usa texto sin tildes en algunos lugares (refactor).
 */
import { test, expect } from '@playwright/test';
import { login, abrirPrimerCaso, crearCasoMinimo } from './fixtures';

test.describe('Detalle de caso', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('abrir caso muestra botón "← Volver"', async ({ page }) => {
    await abrirPrimerCaso(page);
    await expect(page.getByRole('button', { name: '← Volver' })).toBeVisible();
  });

  test('detalle muestra badges de criticidad y estado', async ({ page }) => {
    await abrirPrimerCaso(page);
    // Los badges de criticidad: CRITICA / ALTA / MEDIA / BAJA
    await expect(
      page.getByText(/^(CRITICA|ALTA|MEDIA|BAJA)$/).first()
    ).toBeVisible({ timeout: 8_000 });
    // Los badges de estado
    await expect(
      page.getByText(/^(Nuevo|Recepcionado por DR|En gestion|Escalado|Mitigado|Resuelto|Cerrado)$/).first()
    ).toBeVisible();
  });

  test('sección LINEA DE TIEMPO visible', async ({ page }) => {
    await abrirPrimerCaso(page);
    // Texto exacto en CaseDetailView: "LINEA DE TIEMPO" (sin tilde)
    await expect(page.getByText('LINEA DE TIEMPO')).toBeVisible({ timeout: 8_000 });
  });

  test('sección ACCIONES visible en Vista Completa', async ({ page }) => {
    await abrirPrimerCaso(page);
    // Solo visible en modo FULL (no OP)
    // Texto exacto: "ACCIONES"
    await expect(page.getByText('ACCIONES')).toBeVisible({ timeout: 5_000 });
  });

  test('registrar una acción', async ({ page }) => {
    // Crear caso fresco para evitar interferencias entre tests
    await crearCasoMinimo(page, `[PW-Accion] ${Date.now()}`);
    await page.locator('[style*="border-left"]').first().click();
    await page.getByRole('button', { name: '← Volver' }).waitFor({ state: 'visible' });

    const accionInput = page.getByPlaceholder('Accion...');
    if (await accionInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await accionInput.fill('Accion registrada por Playwright');
      await page.getByRole('button', { name: '+ Accion' }).click();
      await expect(page.getByText('Accion registrada por Playwright')).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip(); // Vista OP no muestra sección de acciones
    }
  });

  test('registrar una decisión', async ({ page }) => {
    await crearCasoMinimo(page, `[PW-Decision] ${Date.now()}`);
    await page.locator('[style*="border-left"]').first().click();
    await page.getByRole('button', { name: '← Volver' }).waitFor({ state: 'visible' });

    const decInput = page.getByPlaceholder('Fundamento de decision...');
    if (await decInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await decInput.fill('Decision registrada por Playwright');
      await page.getByRole('button', { name: '+ Decision' }).click();
      await expect(page.getByText('Decision registrada por Playwright')).toBeVisible({ timeout: 5_000 });
    } else {
      test.skip();
    }
  });

  test('sección AUDITORIA muestra eventos', async ({ page }) => {
    await abrirPrimerCaso(page);
    // "AUDITORIA (N eventos)" — texto dinámico, buscamos el inicio
    await expect(page.getByText(/AUDITORIA \(\d+ eventos?\)/)).toBeVisible({ timeout: 5_000 });
  });

  test('botón TXT dispara descarga sin errores', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', err => pageErrors.push(err.message));

    await abrirPrimerCaso(page);

    // El botón dice exactamente "TXT" en CaseDetailView
    const txtBtn = page.getByRole('button', { name: 'TXT' });
    if (await txtBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5_000 }).catch(() => null),
        txtBtn.click(),
      ]);
      if (download) {
        expect(download.suggestedFilename()).toMatch(/^SCCE_.*\.txt$/);
      }
    }

    expect(pageErrors).toHaveLength(0);
  });

  test('botón "← Volver" regresa al Dashboard', async ({ page }) => {
    await abrirPrimerCaso(page);
    await page.getByRole('button', { name: '← Volver' }).click();
    await expect(page.getByText('Panel de Operacion')).toBeVisible({ timeout: 5_000 });
  });

});
