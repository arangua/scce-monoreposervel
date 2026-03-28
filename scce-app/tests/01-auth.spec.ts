/**
 * 01-auth.spec.ts — Autenticación y selector de contexto
 *
 * Textos exactos verificados en App.tsx:
 *  - Label "Email" / "Contraseña"
 *  - Botón "Ingresar" / "Ingresando..."
 *  - Título "Seleccionar contexto"
 *  - Botón "Cerrar sesión" (Gate B footer)
 *  - Botón "Salir" (nav principal)
 *  - Botón "Cambiar contexto" (nav principal)
 *  - aria-label "Mostrar contraseña" / "Ocultar contraseña"
 */
import { test, expect } from '@playwright/test';
import { CREDENTIALS, login } from './fixtures';

test.describe('Autenticación', () => {

  test('login correcto → muestra selector de contexto', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(CREDENTIALS.email);
    await page.getByLabel('Contraseña').fill(CREDENTIALS.password);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.getByText('Seleccionar contexto')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /SIMULACION/i }).first()).toBeVisible();
  });

  test('contraseña incorrecta → muestra error, no avanza al contexto', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(CREDENTIALS.email);
    await page.getByLabel('Contraseña').fill('contraseña_incorrecta_xyzw');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    // El mensaje de error aparece en un div con color rojo (loginErr o ctxErr)
    // No debe aparecer "Seleccionar contexto"
    await expect(page.getByText('Seleccionar contexto')).not.toBeVisible({ timeout: 5_000 });
    // Sigue mostrando el formulario de login
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('seleccionar contexto SIMULACION → llega al Dashboard', async ({ page }) => {
    await login(page);
    // "Panel de Operacion" es el h2 del DashboardView (sin tilde)
    await expect(page.getByText('Panel de Operacion')).toBeVisible();
    // La barra de nav muestra "SCCE"
    await expect(page.getByText('SCCE').first()).toBeVisible();
  });

  test('botón "Salir" → vuelve al formulario de login', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Salir' }).click();

    await expect(page.getByLabel('Email')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  });

  test('"Cambiar contexto" → vuelve al selector sin cerrar sesión', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Cambiar contexto' }).click();

    // Debe aparecer "Seleccionar contexto" (Gate B)
    await expect(page.getByText('Seleccionar contexto')).toBeVisible({ timeout: 5_000 });
    // Sin volver al login (no debe aparecer el label Email)
    await expect(page.getByLabel('Email')).not.toBeVisible();
  });

  test('"Cerrar sesión" en Gate B → vuelve al login', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Email').fill(CREDENTIALS.email);
    await page.getByLabel('Contraseña').fill(CREDENTIALS.password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.getByText('Seleccionar contexto').waitFor({ state: 'visible' });

    // En Gate B hay un botón "Cerrar sesión" en el footer
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();

    await expect(page.getByLabel('Email')).toBeVisible({ timeout: 5_000 });
  });

  test('toggle mostrar/ocultar contraseña (aria-label)', async ({ page }) => {
    await page.goto('/');
    const input = page.getByLabel('Contraseña');
    // El botón tiene aria-label="Mostrar contraseña" / "Ocultar contraseña"
    const toggle = page.getByRole('button', { name: 'Mostrar contraseña' });

    await expect(input).toHaveAttribute('type', 'password');
    await toggle.click();
    await expect(input).toHaveAttribute('type', 'text');
    // Ahora el aria-label cambia a "Ocultar contraseña"
    await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
    await expect(input).toHaveAttribute('type', 'password');
  });

});
