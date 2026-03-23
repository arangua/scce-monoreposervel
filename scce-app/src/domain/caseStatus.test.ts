import { describe, expect, it } from "vitest";
import { CASE_STATUS_TIMELINE_EVENT, CASE_STATUS_TIMESTAMP_FIELD } from "./caseStatus";

describe("case status transition maps", () => {
  it("maps Escalado", () => {
    expect(CASE_STATUS_TIMELINE_EVENT["Escalado"]).toBe("ESCALATED");
    expect(CASE_STATUS_TIMESTAMP_FIELD["Escalado"]).toBe("escalatedAt");
  });

  it("maps Mitigado", () => {
    expect(CASE_STATUS_TIMELINE_EVENT["Mitigado"]).toBe("MITIGATED");
    expect(CASE_STATUS_TIMESTAMP_FIELD["Mitigado"]).toBe("mitigatedAt");
  });

  it("maps Resuelto", () => {
    expect(CASE_STATUS_TIMELINE_EVENT["Resuelto"]).toBe("RESOLVED");
    expect(CASE_STATUS_TIMESTAMP_FIELD["Resuelto"]).toBe("resolvedAt");
  });

  it("maps Cerrado", () => {
    expect(CASE_STATUS_TIMELINE_EVENT["Cerrado"]).toBe("CLOSED");
    expect(CASE_STATUS_TIMESTAMP_FIELD["Cerrado"]).toBe("closedAt");
  });

  it("maps En gestión to timeline only (no timestamp field)", () => {
    expect(CASE_STATUS_TIMELINE_EVENT["En gestión"]).toBe("IN_MANAGEMENT");
    expect(CASE_STATUS_TIMESTAMP_FIELD["En gestión"]).toBeUndefined();
  });

  it("maps Recepcionado por DR to timeline only (no timestamp field)", () => {
    expect(CASE_STATUS_TIMELINE_EVENT["Recepcionado por DR"]).toBe("RECEPCIONADO");
    expect(CASE_STATUS_TIMESTAMP_FIELD["Recepcionado por DR"]).toBeUndefined();
  });

  it("maps Nuevo to timeline only (no timestamp field)", () => {
    expect(CASE_STATUS_TIMELINE_EVENT["Nuevo"]).toBe("DETECTED");
    expect(CASE_STATUS_TIMESTAMP_FIELD["Nuevo"]).toBeUndefined();
  });
});
