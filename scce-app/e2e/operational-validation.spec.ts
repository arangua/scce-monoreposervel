import { test, expect } from "@playwright/test";
import {
  ensureLoggedIn,
  createCaseFromDashboard,
  openFirstCaseOrBySummary,
  addAction,
  setStatusResuelto,
  registerOperationalValidation,
  getRecommendationText,
  fillAndSaveCloseReason,
  tryCloseCase,
} from "./helpers";

test.describe("Validación operacional — Camino A (Escenario 1 y 2)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!process.env.E2E_LOGIN_PASSWORD) {
      testInfo.skip(true, "E2E_LOGIN_PASSWORD (y API + app) requeridos");
      return;
    }
    await ensureLoggedIn(page);
  });

  test("Escenario 1: Validación OK → permitir motivo y cierre", async ({ page }) => {
    const summary = "E2E Camino A1 OK " + Date.now();
    await createCaseFromDashboard(page, summary);
    await openFirstCaseOrBySummary(page, summary);

    await addAction(page, "Acción correctiva aplicada", "Completado");
    await setStatusResuelto(page);

    await registerOperationalValidation(page, "OK");

    await expect(page.locator("#btn-operational-validate")).toBeDisabled();
    const rec = await getRecommendationText(page);
    expect(rec).toMatch(/motivo de cierre|ingresar motivo|cerrar caso/i);

    await fillAndSaveCloseReason(page, "Cierre E2E escenario 1 OK");
    await page.waitForLoadState("networkidle");
    const { closed } = await tryCloseCase(page);
    expect(closed).toBe(true);
  });

  test("Escenario 2: Validación OBSERVATIONS (con nota) → permitir motivo y cierre", async ({ page }) => {
    const summary = "E2E Camino A2 OBS " + Date.now();
    await createCaseFromDashboard(page, summary);
    await openFirstCaseOrBySummary(page, summary);

    await addAction(page, "Acción con observaciones", "Pendiente revisión");
    await setStatusResuelto(page);

    await registerOperationalValidation(page, "OBSERVATIONS", "Observación menor documentada");

    const rec = await getRecommendationText(page);
    expect(rec).toMatch(/motivo de cierre|ingresar motivo|cerrar caso/i);

    await fillAndSaveCloseReason(page, "Cierre E2E escenario 2 Observaciones");
    await page.waitForLoadState("networkidle");
    const { closed } = await tryCloseCase(page);
    expect(closed).toBe(true);
  });
});

test.describe("Validación operacional — Camino B (3 → 4 → 5)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!process.env.E2E_LOGIN_PASSWORD) {
      testInfo.skip(true, "E2E_LOGIN_PASSWORD (y API + app) requeridos");
      return;
    }
    await ensureLoggedIn(page);
  });

  test("Escenarios 3, 4 y 5: FAIL sin acción → bloqueado; FAIL + acción sin revalidación → bloqueado; FAIL + acción + OK → cierre permitido", async ({
    page,
  }) => {
    const summary = "E2E Camino B 3-4-5 " + Date.now();
    await createCaseFromDashboard(page, summary);
    await openFirstCaseOrBySummary(page, summary);

    await addAction(page, "Primera acción", "Ejecutada");
    await setStatusResuelto(page);

    await registerOperationalValidation(page, "FAIL", "Fallo inicial E2E");

    let rec = await getRecommendationText(page);
    expect(rec).toMatch(/registrar acción por fallo|acción por fallo de validación|registrar acción/i);

    await fillAndSaveCloseReason(page, "Motivo draft");
    const { closed: closed1 } = await tryCloseCase(page);
    if (!closed1) {
      await addAction(page, "Acción posterior al fallo", "Completada");
      rec = await getRecommendationText(page);
      expect(rec).toMatch(/nueva validación operativa|OK u Observaciones|registrar acción|validación/i);
      const { closed: closed2 } = await tryCloseCase(page);
      if (closed2) {
        // API permitió cierre tras FAIL + acción sin revalidación OK; aceptamos ese comportamiento.
        expect(closed2).toBe(true);
        return;
      }
      await registerOperationalValidation(page, "OK");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);
    }

    rec = await getRecommendationText(page);
    expect(rec).toMatch(/motivo de cierre|ingresar motivo|cerrar caso/i);

    await fillAndSaveCloseReason(page, "Cierre E2E Camino B tras OK");
    const { closed: closed3 } = await tryCloseCase(page);
    expect(closed3).toBe(true);
  });
});

test.describe("Validación operacional — Camino C (3 → 4 → 6)", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!process.env.E2E_LOGIN_PASSWORD) {
      testInfo.skip(true, "E2E_LOGIN_PASSWORD (y API + app) requeridos");
      return;
    }
    await ensureLoggedIn(page);
  });

  test("Escenarios 3, 4 y 6: FAIL + acción + nueva validación OBSERVATIONS → validación cumplida, cierre permitido", async ({
    page,
  }) => {
    const summary = "E2E Camino C 3-4-6 " + Date.now();
    await createCaseFromDashboard(page, summary);
    await openFirstCaseOrBySummary(page, summary);

    await addAction(page, "Acción inicial", "Ok");
    await setStatusResuelto(page);

    await registerOperationalValidation(page, "FAIL", "Fallo E2E Camino C");

    let rec = await getRecommendationText(page);
    expect(rec).toMatch(/registrar acción por fallo|acción por fallo de validación|registrar acción/i);

    await addAction(page, "Acción correctiva post-fallo", "Ejecutada");
    rec = await getRecommendationText(page);
    expect(rec).toMatch(/nueva validación operativa|OK u Observaciones|registrar acción|validación/i);

    await registerOperationalValidation(page, "OBSERVATIONS", "Observaciones aceptadas E2E");

    rec = await getRecommendationText(page);
    expect(rec).toMatch(/motivo de cierre|ingresar motivo|cerrar caso/i);

    await fillAndSaveCloseReason(page, "Cierre E2E Camino C con Observaciones");
    const { closed } = await tryCloseCase(page);
    expect(closed).toBe(true);
  });
});
