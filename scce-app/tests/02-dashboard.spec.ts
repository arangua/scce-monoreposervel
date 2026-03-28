/**
 * 02-dashboard.spec.ts — Dashboard y navegación
 *
 * Textos exactos del código:
 *  - Nav: "Dashboard" | "🗂 Catálogo" | "🔗 Auditoría" | "Reportes" |
 *          "Simulación" | "Checklist" | "Config"
 *  - Nav botón incidente: "+ Incidente"
 *  - Nav toggle: "Operativa" / "Completa"
 *  - Nav: "Acciones ▾"  (aria-label: "Abrir acciones globales")
 *  - Dashboard h2: "Panel de Operacion" (sin tilde)
 *  - KPIs: "Total" | "Abiertos" | "Criticos+Altos" | "Completitud"
 */
import { test, expect } from '@playwright/test';
import { login } from './fixtures';

test.describe('Dashboard y navegación', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Dashboard muestra KPIs: Total, Abiertos, Completitud', async ({ page }) => {
    // Las 4 cards de KPI tienen texto fijo en DashboardView
    await expect(page.getByText('Total')).toBeVisible();
    await expect(page.getByText('Abiertos')).toBeVisible();
    await expect(page.getByText('Completitud')).toBeVisible();
  });

  test('navegar a "🗂 Catálogo"', async ({ page }) => {
    await page.getByRole('button', { name: '🗂 Catálogo' }).click();
    // CatalogView tiene algún elemento con texto "catálogo" o "local"
    await expect(
      page.getByText(/catálogo|local|idLocal/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('navegar a "🔗 Auditoría"', async ({ page }) => {
    await page.getByRole('button', { name: '🔗 Auditoría' }).click();
    await expect(
      page.getByText(/auditoría|audit|evento/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('navegar a "Reportes"', async ({ page }) => {
    await page.getByRole('button', { name: 'Reportes' }).click();
    // ReportsView tiene "Respaldos y reportes" como h2
    await expect(page.getByText('Respaldos y reportes')).toBeVisible({ timeout: 8_000 });
  });

  test('navegar a "Simulación"', async ({ page }) => {
    await page.getByRole('button', { name: 'Simulación' }).click();
    await expect(
      page.getByText(/simulación|simular/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('navegar a "Checklist"', async ({ page }) => {
    await page.getByRole('button', { name: 'Checklist' }).click();
    await expect(
      page.getByText(/checklist/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('navegar a "Config"', async ({ page }) => {
    await page.getByRole('button', { name: 'Config' }).click();
    await expect(
      page.getByText(/configuración|config|elección/i).first()
    ).toBeVisible({ timeout: 8_000 });
  });

  test('botón "+ Incidente" abre "Nuevo Incidente — Ficha 60s"', async ({ page }) => {
    await page.getByRole('button', { name: '+ Incidente' }).click();
    // Título exacto de NewCaseView
    await expect(page.getByText('Nuevo Incidente — Ficha 60s')).toBeVisible({ timeout: 5_000 });
  });

  test('toggle Vista Operativa / Completa', async ({ page }) => {
    // Por defecto está en "Completa" (admin no es terrain mode)
    await expect(page.getByRole('button', { name: 'Completa' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Operativa' })).toBeVisible();

    // Cambiar a Operativa
    await page.getByRole('button', { name: 'Operativa' }).click();
    await page.waitForTimeout(300);
    // La barra de nav sigue visible
    await expect(page.getByText('SCCE').first()).toBeVisible();

    // Volver a Completa
    await page.getByRole('button', { name: 'Completa' }).click();
    await expect(page.getByText('Panel de Operacion')).toBeVisible({ timeout: 5_000 });
  });

  test('menú Acciones se abre con sus ítems', async ({ page }) => {
    await page.getByRole('button', { name: 'Acciones ▾' }).click();

    // Los menuitem tienen textos exactos definidos en el JSX:
    await expect(page.getByRole('menuitem').filter({ hasText: /Exportar/i }).first()).toBeVisible();
    await expect(page.getByRole('menuitem').filter({ hasText: /Importar/i }).first()).toBeVisible();
    await expect(page.getByRole('menuitem').filter({ hasText: /Firma y confianza/ })).toBeVisible();
    await expect(page.getByRole('menuitem').filter({ hasText: /Reset Demo/ })).toBeVisible();

    // Cerrar haciendo clic fuera del menú
    await page.mouse.click(10, 300);
    await expect(page.getByRole('menuitem').first()).not.toBeVisible({ timeout: 3_000 });
  });

  test('badge de versión "v1.9" visible en la barra', async ({ page }) => {
    await expect(page.getByText('v1.9')).toBeVisible();
  });

});
