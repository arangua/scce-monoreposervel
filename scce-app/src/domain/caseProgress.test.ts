/**
 * Tests de progreso del caso y regla de validación operacional en UI.
 */
import { describe, it, expect } from "vitest";
import { getCaseProgress, getOperationalValidationClosureResult } from "./caseProgress";
import type { CaseItem } from "./types";

function minimalCase(overrides: Partial<CaseItem> = {}): CaseItem {
  return {
    id: "test-1",
    region: "R",
    commune: "C",
    status: "Nuevo",
    criticality: "BAJA",
    summary: "Test",
    timeline: [],
    ...overrides,
  };
}

describe("getOperationalValidationClosureResult", () => {
  it("devuelve no satisfecho cuando no hay validación operacional", () => {
    const c = minimalCase({
      timeline: [{ type: "DETECTED", at: "2025-01-01T10:00:00.000Z", actor: "u1" }],
      actions: [{ at: "2025-01-01T11:00:00.000Z" }],
    });
    const r = getOperationalValidationClosureResult(c);
    expect(r.isOperationalValidationSatisfied).toBe(false);
    expect(r.nextStep).toBe("validate");
  });

  it("devuelve satisfecho cuando última validación es OK", () => {
    const c = minimalCase({
      timeline: [
        { type: "DETECTED", at: "2025-01-01T10:00:00.000Z", actor: "u1" },
        { type: "OPERATIONAL_VALIDATION", at: "2025-01-01T12:00:00.000Z", actor: "u1", result: "OK" },
      ],
      actions: [{ at: "2025-01-01T11:00:00.000Z" }],
    });
    const r = getOperationalValidationClosureResult(c);
    expect(r.isOperationalValidationSatisfied).toBe(true);
  });

  it("devuelve no satisfecho cuando última validación es FAIL", () => {
    const c = minimalCase({
      timeline: [
        { type: "COMMENT_ADDED", at: "2025-01-01T11:00:00.000Z", actor: "u1" },
        { type: "OPERATIONAL_VALIDATION", at: "2025-01-01T12:00:00.000Z", actor: "u1", result: "FAIL" },
      ],
      actions: [{ at: "2025-01-01T11:00:00.000Z" }],
    });
    const r = getOperationalValidationClosureResult(c);
    expect(r.isOperationalValidationSatisfied).toBe(false);
    expect(r.nextStep).toBe("action_after_fail");
  });
});

describe("getCaseProgress", () => {
  it("paso 1 (Acción registrada) pendiente con solo FIRST_ACTION en timeline", () => {
    const c = minimalCase({
      timeline: [{ type: "FIRST_ACTION", at: "2025-01-01T10:00:00.000Z", actor: "u1", note: "Toma del caso" }],
    });
    const progress = getCaseProgress(c);
    expect(progress.steps[0].state).toBe("pending");
  });

  it("paso 1 (Acción registrada) completado con solo c.actions y sin timeline de acción", () => {
    const c = minimalCase({
      timeline: [{ type: "DETECTED", at: "2025-01-01T10:00:00.000Z", actor: "u1" }],
      actions: [{ id: "a1", action: "Llamar a mesa", result: "OK" }],
    });
    const progress = getCaseProgress(c);
    expect(progress.steps[0].state).toBe("completed");
  });

  it("paso 3 completado cuando validación operacional OK y resuelto; siguiente paso es Decisión", () => {
    const c = minimalCase({
      status: "Resuelto",
      timeline: [
        { type: "COMMENT_ADDED", at: "2025-01-01T11:00:00.000Z", actor: "u1" },
        { type: "OPERATIONAL_VALIDATION", at: "2025-01-01T12:00:00.000Z", actor: "u1", result: "OK" },
      ],
      actions: [{ at: "2025-01-01T11:00:00.000Z" }],
    });
    const progress = getCaseProgress(c);
    expect(progress.steps[2].state).toBe("completed");
    expect(progress.steps[3].label).toBe("Decisión");
    expect(progress.nextStepRecommended).toBe("Registrar decisión");
  });

  it("tras Decisión cumplida, siguiente paso es Ingresar motivo de cierre", () => {
    const c = minimalCase({
      status: "Resuelto",
      timeline: [
        { type: "COMMENT_ADDED", at: "2025-01-01T11:00:00.000Z", actor: "u1" },
        { type: "OPERATIONAL_VALIDATION", at: "2025-01-01T12:00:00.000Z", actor: "u1", result: "OK" },
      ],
      actions: [{ at: "2025-01-01T11:00:00.000Z" }],
      decisions: [{ who: "u1", at: "2025-01-01T13:00:00.000Z", fundament: "Decisión de cierre" }],
    });
    const progress = getCaseProgress(c);
    expect(progress.steps[3].state).toBe("completed");
    expect(progress.nextStepRecommended).toBe("Ingresar motivo de cierre");
  });

  it("paso 3 pendiente y siguiente paso 'Registrar acción por fallo' cuando última es FAIL sin acción posterior", () => {
    const c = minimalCase({
      status: "Resuelto",
      timeline: [
        { type: "COMMENT_ADDED", at: "2025-01-01T11:00:00.000Z", actor: "u1" },
        { type: "OPERATIONAL_VALIDATION", at: "2025-01-01T12:00:00.000Z", actor: "u1", result: "FAIL" },
      ],
      actions: [{ at: "2025-01-01T11:00:00.000Z" }],
    });
    const progress = getCaseProgress(c);
    expect(progress.steps[2].state).not.toBe("completed");
    expect(progress.nextStepRecommended).toBe("Registrar acción por fallo de validación");
  });

  it("siguiente paso 'Nueva validación operativa' cuando FAIL con acción posterior pero sin revalidación", () => {
    const c = minimalCase({
      status: "Resuelto",
      timeline: [
        { type: "COMMENT_ADDED", at: "2025-01-01T11:00:00.000Z", actor: "u1" },
        { type: "OPERATIONAL_VALIDATION", at: "2025-01-01T12:00:00.000Z", actor: "u1", result: "FAIL" },
      ],
      actions: [
        { at: "2025-01-01T11:00:00.000Z" },
        { at: "2025-01-01T13:00:00.000Z" },
      ],
    });
    const progress = getCaseProgress(c);
    expect(progress.steps[2].state).not.toBe("completed");
    expect(progress.nextStepRecommended).toBe("Nueva validación operativa (OK u Observaciones)");
  });
});
