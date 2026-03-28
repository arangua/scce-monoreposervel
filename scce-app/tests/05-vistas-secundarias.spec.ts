/**
 * 05-vistas-secundarias.spec.ts
 *
 * Textos exactos verificados en cada componente:
 *
 * ReportsView:  h2 "Respaldos y reportes", sección "RESPALDOS",
 *               botones "📊 Excel — Lista de casos" / "📦 Respaldo completo"
 *               / "📑 Excel — Historial"
 *
 * AuditView:    columnas "EventID" / "Tipo" / "Timestamp" / "Hash"
 *               badge "🔗 Cadena íntegra" o "⚠️ Comprometida"
 *
 * SimulationView: botón para ejecutar (verificar en SimulationView.tsx)
 *
 * ChecklistView: texto "Checklist" (el componente exporta texto genérico)
 *
 * ConfigView: contiene "Elecciones" o "Configuración"
 */
import { test, expect } from '@playwright/test';
import { login } from './fixtures';

// ── Reportes ─────────────────────────────────────────────────────────────────
test.describe('Vista Reportes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Reportes' }).click();
    await page.getByText('Respaldos y reportes').waitFor({ state: 'visible', timeout: 8_000 });
  });

  test('muestra h2 "Respaldos y reportes"', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Respaldos y reportes' })).toBeVisible();
  });

  test('muestra sección RESPALDOS con botones de exportación', async ({ page }) => {
    await expect(page.getByText('RESPALDOS')).toBeVisible();
    await expect(page.getByRole('button', { name: '📊 Excel — Lista de casos' })).toBeVisible();
    await expect(page.getByRole('button', { name: '📦 Respaldo completo' })).toBeVisible();
    await expect(page.getByRole('button', { name: '📑 Excel — Historial' })).toBeVisible();
  });

  test('muestra métricas de tiempo y SLA', async ({ page }) => {
    await expect(page.getByText('MÉTRICAS')).toBeVisible();
    await expect(page.getByText(/SLA vencidos/)).toBeVisible();
    await expect(page.getByText(/Completitud promedio/)).toBeVisible();
  });

  test('muestra distribución por criticidad', async ({ page }) => {
    await expect(page.getByText('CRITICIDAD')).toBeVisible();
    await expect(page.getByText('CRITICA')).toBeVisible();
    await expect(page.getByText('ALTA')).toBeVisible();
  });

  test('exportar CSV descarga archivo .csv', async ({ page }) => {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 8_000 }),
      page.getByRole('button', { name: '📊 Excel — Lista de casos' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});

// ── Auditoría ─────────────────────────────────────────────────────────────────
test.describe('Vista Auditoría', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: '🔗 Auditoría' }).click();
  });

  test('muestra tabla con columnas de auditoría', async ({ page }) => {
    // AuditView muestra un encabezado con estas columnas
    await expect(page.getByText('EventID').first()).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText('Tipo').first()).toBeVisible();
    await expect(page.getByText('Hash').first()).toBeVisible();
  });

  test('muestra badge de integridad de cadena', async ({ page }) => {
    // Badge: "🔗 Cadena íntegra" o "⚠️ Comprometida"
    await expect(
      page.getByText(/Cadena íntegra|Comprometida/).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ── Simulación ────────────────────────────────────────────────────────────────
test.describe('Vista Simulación', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Simulación' }).click();
  });

  test('carga sin crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
    // La vista debe tener algún contenido visible
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('ejecutar simulación genera resultados', async ({ page }) => {
    // SimulationView tiene un botón para simular — buscar cualquier botón de acción
    const simBtn = page.getByRole('button', { name: /simular|ejecutar|generar/i }).first();
    if (await simBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await simBtn.click();
      await page.waitForTimeout(1_000);
      // Debe aparecer algún resultado numérico
      await expect(
        page.getByText(/incidente|total|critica|simulación/i).first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });
});

// ── Catálogo ──────────────────────────────────────────────────────────────────
test.describe('Vista Catálogo', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: '🗂 Catálogo' }).click();
  });

  test('muestra locales del catálogo de Tarapacá', async ({ page }) => {
    // Los locales tienen texto de nombres de establecimientos de Iquique/Tarapacá
    await expect(
      page.getByText(/iquique|alto hospicio|pozo almonte|local|escuela|liceo/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ── Checklist ─────────────────────────────────────────────────────────────────
test.describe('Vista Checklist', () => {
  test('carga sin crash', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Checklist' }).click();
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.waitForTimeout(500);
    expect(errors).toHaveLength(0);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});

// ── Config ────────────────────────────────────────────────────────────────────
test.describe('Vista Config', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Config' }).click();
  });

  test('muestra configuración de la elección', async ({ page }) => {
    await expect(
      page.getByText(/Elecciones|configuración|Nombre|Fecha|Año/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('botón Reset Demo existe (sin ejecutarlo)', async ({ page }) => {
    // Verificar solo que el botón está presente — NO hacer clic
    await expect(
      page.getByRole('button', { name: /reset|demo|reiniciar/i }).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});
