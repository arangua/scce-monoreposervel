/**
 * Tests de la regla de cierre por validación operacional.
 */
import { describe, it, expect } from "vitest";
import {
  operationalValidationAllowsClosure,
  type TimelineEventLike,
  type ActionLike,
} from "./operationalValidationClosure";

const at = (iso: string): string => iso;

function opVal(atStr: string, result: "OK" | "OBSERVATIONS" | "FAIL", _note?: string): TimelineEventLike {
  return { type: "OPERATIONAL_VALIDATION", at: atStr, result };
}

function action(atStr: string): ActionLike {
  return { at: atStr };
}

describe("operationalValidationAllowsClosure", () => {
  it("1. sin validación → no satisfecho, nextStep validate", () => {
    const timeline: TimelineEventLike[] = [
      { type: "DETECTED", at: at("2025-01-01T10:00:00.000Z") },
      { type: "REPORTED", at: at("2025-01-01T10:05:00.000Z") },
    ];
    const actions: ActionLike[] = [action("2025-01-01T11:00:00.000Z")];
    const r = operationalValidationAllowsClosure(timeline, actions);
    expect(r.isOperationalValidationSatisfied).toBe(false);
    expect(r.nextStep).toBe("validate");
    expect(r.reason).toBe("no_op_val");
  });

  it("2. validación OK (última y única) → satisfecho, close_ready", () => {
    const timeline: TimelineEventLike[] = [
      { type: "DETECTED", at: at("2025-01-01T10:00:00.000Z") },
      opVal("2025-01-01T12:00:00.000Z", "OK"),
    ];
    const actions: ActionLike[] = [action("2025-01-01T11:00:00.000Z")];
    const r = operationalValidationAllowsClosure(timeline, actions);
    expect(r.isOperationalValidationSatisfied).toBe(true);
    expect(r.nextStep).toBe("close_ready");
    expect(r.reason).toBe("last_ok_or_observations_no_fail");
  });

  it("3. validación OBSERVATIONS (última y única) → satisfecho, close_ready", () => {
    const timeline: TimelineEventLike[] = [
      { type: "DETECTED", at: at("2025-01-01T10:00:00.000Z") },
      opVal("2025-01-01T12:00:00.000Z", "OBSERVATIONS"),
    ];
    const actions: ActionLike[] = [action("2025-01-01T11:00:00.000Z")];
    const r = operationalValidationAllowsClosure(timeline, actions);
    expect(r.isOperationalValidationSatisfied).toBe(true);
    expect(r.nextStep).toBe("close_ready");
    expect(r.reason).toBe("last_ok_or_observations_no_fail");
  });

  it("4. última validación FAIL sin acción posterior → no satisfecho, action_after_fail", () => {
    const timeline: TimelineEventLike[] = [
      { type: "DETECTED", at: at("2025-01-01T10:00:00.000Z") },
      opVal("2025-01-01T12:00:00.000Z", "FAIL"),
    ];
    const actions: ActionLike[] = [action("2025-01-01T11:00:00.000Z")]; // antes del FAIL
    const r = operationalValidationAllowsClosure(timeline, actions);
    expect(r.isOperationalValidationSatisfied).toBe(false);
    expect(r.nextStep).toBe("action_after_fail");
    expect(r.reason).toBe("last_fail_no_action");
  });

  it("5. FAIL con acción posterior pero sin nueva validación OK/OBS → no satisfecho, revalidate_after_action", () => {
    const timeline: TimelineEventLike[] = [
      opVal("2025-01-01T12:00:00.000Z", "FAIL"),
      // acción en 13:00 pero no hay nueva validación después
    ];
    const actions: ActionLike[] = [action("2025-01-01T13:00:00.000Z")];
    const r = operationalValidationAllowsClosure(timeline, actions);
    expect(r.isOperationalValidationSatisfied).toBe(false);
    expect(r.nextStep).toBe("revalidate_after_action");
    expect(r.reason).toBe("last_fail_has_action_need_revalidation");
  });

  it("6. FAIL con acción posterior y nueva validación OK → satisfecho, close_ready", () => {
    const timeline: TimelineEventLike[] = [
      opVal("2025-01-01T12:00:00.000Z", "FAIL"),
      opVal("2025-01-01T14:00:00.000Z", "OK"), // después de la acción 13:00
    ];
    const actions: ActionLike[] = [action("2025-01-01T13:00:00.000Z")];
    const r = operationalValidationAllowsClosure(timeline, actions);
    expect(r.isOperationalValidationSatisfied).toBe(true);
    expect(r.nextStep).toBe("close_ready");
    expect(r.reason).toBe("last_ok_or_observations_sequence_ok");
  });

  it("7. FAIL con acción posterior y nueva validación OBSERVATIONS → satisfecho, close_ready", () => {
    const timeline: TimelineEventLike[] = [
      opVal("2025-01-01T12:00:00.000Z", "FAIL"),
      opVal("2025-01-01T14:00:00.000Z", "OBSERVATIONS"), // después de la acción 13:00
    ];
    const actions: ActionLike[] = [action("2025-01-01T13:00:00.000Z")];
    const r = operationalValidationAllowsClosure(timeline, actions);
    expect(r.isOperationalValidationSatisfied).toBe(true);
    expect(r.nextStep).toBe("close_ready");
    expect(r.reason).toBe("last_ok_or_observations_sequence_ok");
  });
});
