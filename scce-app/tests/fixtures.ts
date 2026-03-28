/**
 * fixtures.ts — helpers compartidos para todos los specs SCCE
 */
import type { Page } from '@playwright/test';

export const CREDENTIALS = {
  email: 'admin.piloto@scce.local',
  password: 'ClavePiloto2026',
} as const;

/**
 * login() — flujo completo: Gate A (login) → Gate B (contexto) → Dashboard.
 *
 * Gate A: el label es "Email" y "Contraseña" (con tilde), botón "Ingresar".
 * Gate B: botones con texto "SIMULACION / SIM_1 · Tarapacá" (DR) o similar.
 *         Se elige el primer botón que contenga "SIMULACION".
 */
export async function login(page: Page): Promise<void> {
  await page.goto('/');

  // Gate A — el label "Email" está sobre el input (etiqueta <label>Email</label>)
  await page.getByLabel('Email').fill(CREDENTIALS.email);
  // "Contraseña" con tilde — así está en el código
  await page.getByLabel('Contraseña').fill(CREDENTIALS.password);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  // Gate B — esperar que aparezca el texto "Seleccionar contexto"
  await page.getByText('Seleccionar contexto').waitFor({ state: 'visible' });

  // Elegir el primer membership que contenga "SIMULACION"
  await page.getByRole('button', { name: /SIMULACION/i }).first().click();

  // Esperar a que aparezca "Panel de Operacion" (sin tilde — así está en DashboardView)
  await page.getByText('Panel de Operacion').waitFor({ state: 'visible', timeout: 10_000 });
}

/**
 * Abre el primer caso visible en el Dashboard.
 * Si no hay casos, crea uno mínimo primero.
 */
export async function abrirPrimerCaso(page: Page): Promise<void> {
  // Los casos están dentro de CaseCard — tienen cursor:pointer y texto del summary
  // CaseCard es un div clickeable. Buscamos cualquier card que no sea un botón del nav.
  const casoCard = page.locator('[style*="border-left"]').first();
  const hayCasos = await casoCard.isVisible({ timeout: 2_000 }).catch(() => false);

  if (!hayCasos) {
    // Crear un caso mínimo para que los tests de detalle tengan algo que abrir
    await crearCasoMinimo(page, '[PW] Caso para test detalle');
  }

  // Hacer clic en el primer card de caso (tiene border-left de color según criticidad)
  await page.locator('[style*="border-left"]').first().click();
  // Esperar que aparezca el botón "← Volver"
  await page.getByRole('button', { name: /← Volver/ }).waitFor({ state: 'visible', timeout: 8_000 });
}

/**
 * Crea un caso mínimo pasando por el formulario de 4 pasos.
 */
export async function crearCasoMinimo(page: Page, resumen: string): Promise<void> {
  // Botón "+ Incidente" en el nav
  await page.getByRole('button', { name: '+ Incidente' }).click();

  // Paso 1 — "PASO 1 — IDENTIFICACIÓN"
  await page.getByText('PASO 1 — IDENTIFICACIÓN').waitFor({ state: 'visible', timeout: 5_000 });

  // Campo Resumen (placeholder exacto del código)
  await page.getByPlaceholder('Ej: Urna sellada incorrectamente en mesa 12').fill(resumen);

  // Seleccionar commune si no está fijada (el selector tiene "Seleccione...")
  const communeSelect = page.locator('select').filter({ hasText: 'Seleccione...' }).first();
  if (await communeSelect.isVisible({ timeout: 1_000 }).catch(() => false)) {
    // Seleccionar la primera opción real (índice 1, la 0 es el placeholder)
    await communeSelect.selectOption({ index: 1 });
    await page.waitForTimeout(300); // dar tiempo a que carguen los locales
  }

  // Seleccionar local si hay selector disponible
  const localSelect = page.locator('select').filter({ hasText: 'Seleccione local...' }).first();
  if (await localSelect.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await localSelect.selectOption({ index: 1 });
  }

  // Avanzar: "Siguiente →"
  await page.getByRole('button', { name: 'Siguiente →' }).click();

  // Paso 2 — "PASO 2 — FICHA DE EVALUACIÓN"
  await page.getByText('PASO 2 — FICHA DE EVALUACIÓN').waitFor({ state: 'visible', timeout: 5_000 });
  await page.getByRole('button', { name: 'Siguiente →' }).click();

  // Paso 3 — "PASO 3 — DETALLES"
  await page.getByText('PASO 3 — DETALLES').waitFor({ state: 'visible', timeout: 5_000 });
  await page.getByRole('button', { name: 'Confirmar →' }).click();

  // Paso 4 — "PASO 4 — CONFIRMAR Y REGISTRAR"
  await page.getByText('PASO 4 — CONFIRMAR Y REGISTRAR').waitFor({ state: 'visible', timeout: 5_000 });
  await page.getByRole('button', { name: '✓ Registrar Incidente' }).click();

  // Volver al Dashboard
  await page.getByText('Panel de Operacion').waitFor({ state: 'visible', timeout: 10_000 });
}
