import { type Page } from "@playwright/test";

const E2E_EMAIL = process.env.E2E_LOGIN_EMAIL || "dr.trp@scce.local";
const E2E_PASSWORD = process.env.E2E_LOGIN_PASSWORD || "";

/** Inicia sesión si aparece el formulario de login. Si hay selector de contexto, elige el primero. */
export async function ensureLoggedIn(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});

  const emailInput = page.locator('div:has(label:has-text("Email")) >> input').first();
  const isLogin = await emailInput.isVisible().catch(() => false);
  if (isLogin) {
    if (!E2E_PASSWORD) throw new Error("E2E_LOGIN_PASSWORD no definido. Requerido para login.");
    await emailInput.clear();
    await emailInput.fill(E2E_EMAIL);
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.clear();
    await passwordInput.fill(E2E_PASSWORD);
    await page.getByRole("button", { name: /ingresar/i }).click();
    await Promise.race([
      page.waitForSelector('button:has-text("OPERACION")', { timeout: 45000 }),
      page.waitForSelector('text=Panel de Operación', { timeout: 45000 }),
      page.waitForSelector('text=Dashboard', { timeout: 45000 }),
      page.waitForSelector('button:has-text("Incidente")', { timeout: 45000 }),
    ]).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
  }

  // Regla: toda prueba nace en SIMULACION. Seleccionar contexto SIMULACION para E2E.
  if (await page.locator('text=Seleccionar contexto').isVisible().catch(() => false)) {
    const simButton = page.locator('button:has-text("SIMULACION")').first();
    if (await simButton.isVisible().catch(() => false)) {
      await simButton.click({ timeout: 10000 });
    } else {
      await page.locator('button:has-text("Simulación")').first().click({ timeout: 10000 });
    }
    await page.waitForLoadState("networkidle").catch(() => {});
  } else {
    const contextButton = page.locator('button:has-text("SIMULACION"), button:has-text("Simulación")').first();
    if (await contextButton.isVisible().catch(() => false)) {
      await contextButton.click();
      await page.waitForLoadState("networkidle").catch(() => {});
    }
  }

  const dashboard = page.locator('text=Dashboard').first();
  if (await dashboard.isVisible().catch(() => false)) await dashboard.click();
  await page.waitForLoadState("networkidle").catch(() => {});

  const incidenteBtn = page.getByRole("button", { name: /incidente/i }).first();
  try {
    await incidenteBtn.waitFor({ state: "visible", timeout: 25000 });
  } catch {
    await page.screenshot({ path: "test-results/ensureLoggedIn-failed.png" }).catch(() => {});
    const stillLogin = await page.getByRole("button", { name: /ingresar/i }).isVisible().catch(() => false);
    const errText = stillLogin
      ? (await page.locator("[style*='color'][style*='danger'], .error, [role='alert']").first().textContent().catch(() => "")) || ""
      : "";
    const hint = stillLogin
      ? `Login no completado (sigue en pantalla de login). Comprueba: 1) API en http://localhost:3000 (npm run start:dev en api/), 2) Credenciales correctas (mismo SEED_PASSWORD).${errText ? ` Error en UI: ${errText.slice(0, 100)}` : ""}`
      : "Tras el login no aparece el botón de nuevo incidente. ¿Vista correcta?";
    throw new Error(`${hint} Ver test-results/ensureLoggedIn-failed.png`);
  }
}

/** Abre el flujo de nuevo incidente (vista completa: "+ Incidente" o vista OP: "+ Nuevo incidente"). */
export async function goToNewCase(page: Page): Promise<void> {
  const btn = page.getByRole("button", { name: /incidente/i }).first();
  await btn.click({ timeout: 15000 });
  await page.waitForSelector('text=Nuevo Incidente', { timeout: 15000 });
  await page.waitForSelector('text=IDENTIFICACIÓN', { timeout: 5000 }).catch(() => {});
}

/** Completa paso 1 Identificación: región, comuna, local, resumen. */
export async function fillStep1Identification(
  page: Page,
  opts: { region?: string; commune?: string; local?: string; summary?: string } = {}
): Promise<void> {
  const region = opts.region ?? "TRP";
  const commune = opts.commune ?? "IQQ";
  const local = opts.local ?? "Liceo Arturo Pérez Canto";
  const summary = opts.summary ?? "E2E validación operacional";

  const step1 = page.locator('div:has-text("PASO 1 — IDENTIFICACIÓN")').first();
  await step1.waitFor({ state: "visible", timeout: 15000 });
  const selects = step1.locator("select");
  await selects.nth(0).selectOption(region);
  await selects.nth(1).selectOption(commune);
  const localSelect = step1.locator("select").filter({ has: page.locator(`option:has-text("${local}")`) }).first();
  await localSelect.selectOption({ label: local });
  await step1.locator('input:not([type="datetime-local"])').first().fill(summary);
  await page.getByRole("button", { name: /siguiente/i }).first().click();
}

/**
 * Paso 1 Identificación usando comuna por etiqueta (compatible con territorio CUT:
 * opciones con value 1101/1107 y label Iquique/Alto Hospicio).
 */
export async function fillStep1IdentificationWithCommuneByLabel(
  page: Page,
  opts: { region?: string; communeLabel?: string; local?: string; summary?: string } = {}
): Promise<void> {
  const region = opts.region ?? "TRP";
  const communeLabel = opts.communeLabel ?? "Iquique";
  const local = opts.local ?? "Liceo Arturo Pérez Canto";
  const summary = opts.summary ?? "E2E territorio CUT " + Date.now();

  const step1 = page.locator('div:has-text("PASO 1 — IDENTIFICACIÓN")').first();
  await step1.waitFor({ state: "visible", timeout: 15000 });
  const selects = step1.locator("select");
  await selects.nth(0).selectOption(region);
  await selects.nth(1).selectOption({ label: communeLabel });
  const localSelect = step1.locator("select").filter({ has: page.locator(`option:has-text("${local}")`) }).first();
  await localSelect.waitFor({ state: "visible", timeout: 5000 });
  await localSelect.selectOption({ label: local });
  await step1.locator('input:not([type="datetime-local"])').first().fill(summary);
  await page.getByRole("button", { name: /siguiente/i }).first().click();
}

/** Paso 2 Evaluación: siguiente sin cambiar valores. */
export async function fillStep2Evaluation(page: Page): Promise<void> {
  await page.getByRole("button", { name: /siguiente/i }).first().click();
}

/** Paso 3 Detalles: confirmar. */
export async function fillStep3Details(page: Page): Promise<void> {
  await page.getByRole("button", { name: /confirmar/i }).first().click();
}

/** Paso 4 Confirmar y registrar incidente. */
export async function submitCaseStep4(page: Page): Promise<void> {
  await page.getByRole("button", { name: /registrar incidente/i }).first().click();
  await page.waitForLoadState("networkidle");
}

/** Crea un caso completo desde dashboard (pasos 1–4) y vuelve al listado. El caso queda primero en la lista. */
export async function createCaseFromDashboard(
  page: Page,
  summary?: string
): Promise<void> {
  await goToNewCase(page);
  await fillStep1Identification(page, { summary: summary ?? "E2E caso " + Date.now() });
  await fillStep2Evaluation(page);
  await fillStep3Details(page);
  await submitCaseStep4(page);
}

/** Abre el primer caso de la lista (o el que contenga el texto indicado). */
export async function openFirstCaseOrBySummary(page: Page, summary?: string): Promise<void> {
  if (summary) {
    await page.getByText(summary, { exact: false }).first().click({ timeout: 15000 });
  } else {
    await page.locator('[data-case-card], div[style*="cursor"][style*="pointer"]').first().click();
  }
  await page.waitForLoadState("networkidle");
}

/** En la ficha del caso: añade una acción. */
export async function addAction(page: Page, actionText: string, resultText?: string): Promise<void> {
  const actionInput = page.locator('input[placeholder*="Acción"], input[placeholder*="acción"]').first();
  await actionInput.waitFor({ state: "visible", timeout: 15000 });
  await actionInput.fill(actionText);
  await page.locator('input[placeholder*="Resultado"]').first().fill(resultText ?? "Hecho").catch(() => {});
  await page.getByRole("button", { name: /\+ acción/i }).first().click();
  await page.waitForLoadState("networkidle");
}

/** Cambia el estado del caso a Resuelto. */
export async function setStatusResuelto(page: Page): Promise<void> {
  const statusSelect = page.locator('select').filter({ has: page.locator('option:has-text("Resuelto")') }).first();
  await statusSelect.selectOption("Resuelto");
  await page.waitForLoadState("networkidle");
}

/** Abre el diálogo de validación operacional y registra OK / OBSERVATIONS / FAIL con nota si aplica. */
export async function registerOperationalValidation(
  page: Page,
  result: "OK" | "OBSERVATIONS" | "FAIL",
  note?: string
): Promise<void> {
  await page.locator('#btn-operational-validate').click();
  const dialogSelect = page.locator(`select option[value="${result}"]`).locator('..').first();
  await dialogSelect.waitFor({ state: "visible", timeout: 10000 });
  await dialogSelect.selectOption(result);
  if ((result === "OBSERVATIONS" || result === "FAIL") && note) {
    const noteField = page.getByPlaceholder("Nota (obligatoria si Observaciones o Fallo)");
    await noteField.waitFor({ state: "visible", timeout: 5000 });
    await noteField.click();
    await noteField.fill(note);
    await noteField.press("Tab");
  }
  const confirmBtn = page.getByRole("button", { name: /confirmar validación/i }).first();
  await confirmBtn.waitFor({ state: "visible" });
  await confirmBtn.click();
  await page.waitForLoadState("networkidle");
}

/** Devuelve el texto del "Siguiente paso recomendado". */
export async function getRecommendationText(page: Page): Promise<string> {
  const section = page.locator('text=Siguiente paso recomendado').first();
  const parent = section.locator("xpath=ancestor::*[.//text()[contains(., \"Siguiente paso\")]][1]");
  const text = await parent.textContent();
  return (text || "").trim();
}

/** Comprueba si el ítem de validación operacional del checklist está cumplido (✓). */
export async function isOperationalValidationChecklistOk(page: Page): Promise<boolean> {
  try {
    const row = page.locator('div').filter({ hasText: /Validación operativ[ao]/ }).filter({ hasText: /✓/ }).first();
    await row.waitFor({ state: "visible", timeout: 10000 });
    const content = await row.textContent();
    return content?.includes("✓") ?? false;
  } catch {
    return false;
  }
}

/** Rellena motivo de cierre y guarda. */
export async function fillAndSaveCloseReason(page: Page, reason: string): Promise<void> {
  await page.getByPlaceholder(/motivo de cierre|escriba el motivo/i).first().fill(reason);
  await page.getByRole("button", { name: /guardar motivo|actualizar/i }).first().click();
  await page.waitForLoadState("networkidle");
}

/** Cambia estado a Cerrado. Si la regla no se cumple, aparece toast de error. */
export async function tryCloseCase(page: Page): Promise<{ closed: boolean; errorMessage?: string }> {
  const statusSelect = page.locator('select').filter({ has: page.locator('option:has-text("Cerrado")') }).first();
  await statusSelect.selectOption("Cerrado");
  await page.waitForLoadState("networkidle");
  const toast = page.locator('[style*="sticky"], [role="alert"]').filter({ hasText: /no es posible|falta|bloqueado|error/i });
  const hasError = await toast.isVisible().catch(() => false);
  if (hasError) {
    return { closed: false, errorMessage: await toast.textContent() ?? undefined };
  }
  return { closed: true };
}
