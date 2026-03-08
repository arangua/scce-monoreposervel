import { test, expect } from "@playwright/test";
import {
  ensureLoggedIn,
  goToNewCase,
  fillStep1IdentificationWithCommuneByLabel,
  fillStep2Evaluation,
  fillStep3Details,
  submitCaseStep4,
} from "./helpers";

/**
 * E2E: NewCaseForm con territorio CUT en Tarapacá.
 * Comprueba que al elegir comuna por nombre (Iquique = CUT 1101) el selector de locales
 * se llena (mapeo CUT→interno) y el caso se crea con communeCode en CUT.
 */
test.describe("NewCaseForm territorio CUT — Tarapacá", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (!process.env.E2E_LOGIN_PASSWORD) {
      testInfo.skip(true, "E2E_LOGIN_PASSWORD (y API + app) requeridos");
      return;
    }
    await ensureLoggedIn(page);
  });

  test("Crear caso con región TRP, comuna Iquique (CUT), local y enviar", async ({ page }) => {
    const summary = "E2E territorio CUT " + Date.now();
    await goToNewCase(page);
    await fillStep1IdentificationWithCommuneByLabel(page, {
      region: "TRP",
      communeLabel: "Iquique",
      local: "Liceo Arturo Pérez Canto",
      summary,
    });
    await fillStep2Evaluation(page);
    await fillStep3Details(page);
    await submitCaseStep4(page);

    await expect(page.getByText(summary).first()).toBeVisible({ timeout: 10000 });
    const toast = page.locator('[role="alert"], [style*="sticky"]').filter({ hasText: /error|fallo|invalid/i });
    await expect(toast).not.toBeVisible();
  });
});
