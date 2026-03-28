/**
 * 03-nuevo-caso.spec.ts — Formulario de 4 pasos
 *
 * Textos exactos de NewCaseView.tsx:
 *  - Paso 1: "PASO 1 — IDENTIFICACIÓN"
 *  - Paso 2: "PASO 2 — FICHA DE EVALUACIÓN (inmutable tras guardar)"
 *  - Paso 3: "PASO 3 — DETALLES"
 *  - Paso 4: "PASO 4 — CONFIRMAR Y REGISTRAR"
 *  - Botones: "Siguiente →" / "← Atrás" / "Confirmar →" / "✓ Registrar Incidente"
 *  - Placeholder resumen: "Ej: Urna sellada incorrectamente en mesa 12"
 *  - Placeholder detalle:  "Describe el incidente..."
 *  - Stepper: "Identificación" | "Evaluación" | "Detalles" | "Confirmar"
 */
import { test, expect } from '@playwright/test';
import { login } from './fixtures';

const RESUMEN_TEST = `[PW] Incidente test ${Date.now()}`;

test.describe('Formulario nuevo caso', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: '+ Incidente' }).click();
    await page.getByText('PASO 1 — IDENTIFICACIÓN').waitFor({ state: 'visible', timeout: 5_000 });
  });

  test('stepper muestra los 4 pasos', async ({ page }) => {
    // El stepper tiene 4 divs con estos textos exactos
    await expect(page.getByText('Identificación')).toBeVisible();
    await expect(page.getByText('Evaluación')).toBeVisible();
    await expect(page.getByText('Detalles')).toBeVisible();
    await expect(page.getByText('Confirmar')).toBeVisible();
  });

  test('no avanza al paso 2 sin resumen (validación activa)', async ({ page }) => {
    // Intentar avanzar sin llenar nada
    await page.getByRole('button', { name: 'Siguiente →' }).click();
    // Debe seguir en el paso 1
    await expect(page.getByText('PASO 1 — IDENTIFICACIÓN')).toBeVisible();
    // Debe aparecer alguna notificación de error
    await expect(
      page.getByText(/obligatorio|requerido|seleccione|resumen|local/i).first()
    ).toBeVisible({ timeout: 3_000 });
  });

  test('flujo completo 4 pasos → caso creado aparece en dashboard', async ({ page }) => {
    // ── Paso 1 ────────────────────────────────────────────────────────────
    await page.getByPlaceholder('Ej: Urna sellada incorrectamente en mesa 12').fill(RESUMEN_TEST);

    // Seleccionar commune si no está fijada para el rol DR
    const communeOpt = page.locator('select').filter({ hasText: 'Seleccione...' }).first();
    if (await communeOpt.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await communeOpt.selectOption({ index: 1 });
      await page.waitForTimeout(400);
    }

    // Seleccionar local si hay más de uno
    const localOpt = page.locator('select').filter({ hasText: 'Seleccione local...' }).first();
    if (await localOpt.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await localOpt.selectOption({ index: 1 });
    }

    await page.getByRole('button', { name: 'Siguiente →' }).click();

    // ── Paso 2 ────────────────────────────────────────────────────────────
    await page.getByText('PASO 2 — FICHA DE EVALUACIÓN').waitFor({ state: 'visible', timeout: 5_000 });

    // Los botones de evaluación son 0/1/2/3 para cada variable
    // Dar "1" a la primera variable (continuidad)
    const botonesUno = page.getByRole('button', { name: '1' });
    if (await botonesUno.first().isVisible()) {
      await botonesUno.first().click();
    }

    await page.getByRole('button', { name: 'Siguiente →' }).click();

    // ── Paso 3 ────────────────────────────────────────────────────────────
    await page.getByText('PASO 3 — DETALLES').waitFor({ state: 'visible', timeout: 5_000 });

    await page.getByPlaceholder('Describe el incidente...').fill('Detalle agregado por test Playwright.');
    await page.getByRole('button', { name: 'Confirmar →' }).click();

    // ── Paso 4 ────────────────────────────────────────────────────────────
    await page.getByText('PASO 4 — CONFIRMAR Y REGISTRAR').waitFor({ state: 'visible', timeout: 5_000 });

    // El resumen debe aparecer en la confirmación
    await expect(page.getByText(RESUMEN_TEST)).toBeVisible();

    // Registrar
    await page.getByRole('button', { name: '✓ Registrar Incidente' }).click();

    // Volver al Dashboard
    await page.getByText('Panel de Operacion').waitFor({ state: 'visible', timeout: 12_000 });

    // El caso debe aparecer en la lista
    await expect(page.getByText(RESUMEN_TEST)).toBeVisible({ timeout: 5_000 });
  });

  test('← Atrás en paso 2 regresa al paso 1', async ({ page }) => {
    // Llenar mínimo para poder avanzar
    await page.getByPlaceholder('Ej: Urna sellada incorrectamente en mesa 12').fill('Test atrás');

    const communeOpt = page.locator('select').filter({ hasText: 'Seleccione...' }).first();
    if (await communeOpt.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await communeOpt.selectOption({ index: 1 });
      await page.waitForTimeout(400);
    }
    const localOpt = page.locator('select').filter({ hasText: 'Seleccione local...' }).first();
    if (await localOpt.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await localOpt.selectOption({ index: 1 });
    }

    await page.getByRole('button', { name: 'Siguiente →' }).click();
    await page.getByText('PASO 2 — FICHA DE EVALUACIÓN').waitFor({ state: 'visible' });

    // Retroceder
    await page.getByRole('button', { name: '← Atrás' }).click();
    await expect(page.getByText('PASO 1 — IDENTIFICACIÓN')).toBeVisible();
  });

  test('"← Volver" en paso 1 regresa al Dashboard', async ({ page }) => {
    // Si no tiene hideBack, hay botón "← Volver"
    const volverBtn = page.getByRole('button', { name: '← Volver' });
    if (await volverBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await volverBtn.click();
      await expect(page.getByText('Panel de Operacion')).toBeVisible({ timeout: 5_000 });
    } else {
      // En modo terrain se abre con hideBack=true, no hay botón ← Volver en el form
      // Verificar que el paso 1 sigue activo
      await expect(page.getByText('PASO 1 — IDENTIFICACIÓN')).toBeVisible();
    }
  });

});
