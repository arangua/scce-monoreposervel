import { describe, expect, it } from "vitest";
import { buildCaseStatusPatch } from "./caseStatusPatch";
import type { CaseItem } from "./types";

function makeCase(overrides: Partial<CaseItem> = {}): CaseItem {
  return {
    id: "c-1",
    region: "RM",
    commune: "Santiago",
    status: "Nuevo",
    criticality: "MEDIA",
    summary: "Caso base",
    ...overrides,
  };
}

describe("buildCaseStatusPatch", () => {
  it("agrega timeline con type correcto para Escalado", () => {
    const patch = buildCaseStatusPatch({
      caseData: makeCase(),
      newStatus: "Escalado",
      actorId: "u-1",
      eventId: "ev-1",
      eventAt: "2026-03-23T10:00:00.000Z",
      timestampAt: "2026-03-23T10:00:01.000Z",
      updatedAt: "2026-03-23T10:00:02.000Z",
    });

    expect(patch.timeline).toHaveLength(1);
    expect(patch.timeline?.[0]?.type).toBe("ESCALATED");
  });

  it("agrega escalatedAt cuando corresponde", () => {
    const patch = buildCaseStatusPatch({
      caseData: makeCase(),
      newStatus: "Escalado",
      actorId: "u-1",
      eventId: "ev-1",
      eventAt: "2026-03-23T10:00:00.000Z",
      timestampAt: "2026-03-23T10:00:01.000Z",
      updatedAt: "2026-03-23T10:00:02.000Z",
    });

    expect(patch.escalatedAt).toBe("2026-03-23T10:00:01.000Z");
  });

  it("no agrega timestamp para En gestión", () => {
    const patch = buildCaseStatusPatch({
      caseData: makeCase(),
      newStatus: "En gestión",
      actorId: "u-1",
      eventId: "ev-1",
      eventAt: "2026-03-23T10:00:00.000Z",
      timestampAt: "2026-03-23T10:00:01.000Z",
      updatedAt: "2026-03-23T10:00:02.000Z",
    });

    expect(patch.escalatedAt).toBeUndefined();
    expect(patch.mitigatedAt).toBeUndefined();
    expect(patch.resolvedAt).toBeUndefined();
    expect(patch.closedAt).toBeUndefined();
  });

  it("actualiza status y updatedAt", () => {
    const patch = buildCaseStatusPatch({
      caseData: makeCase(),
      newStatus: "Mitigado",
      actorId: "u-1",
      eventId: "ev-1",
      eventAt: "2026-03-23T10:00:00.000Z",
      timestampAt: "2026-03-23T10:00:01.000Z",
      updatedAt: "2026-03-23T10:00:02.000Z",
    });

    expect(patch.status).toBe("Mitigado");
    expect(patch.updatedAt).toBe("2026-03-23T10:00:02.000Z");
  });

  it("conserva timeline previo", () => {
    const patch = buildCaseStatusPatch({
      caseData: makeCase({
        timeline: [{ type: "DETECTED", at: "2026-03-23T09:00:00.000Z", actor: "u-0", eventId: "ev-0" }],
      }),
      newStatus: "Resuelto",
      actorId: "u-1",
      eventId: "ev-1",
      eventAt: "2026-03-23T10:00:00.000Z",
      timestampAt: "2026-03-23T10:00:01.000Z",
      updatedAt: "2026-03-23T10:00:02.000Z",
    });

    expect(patch.timeline).toHaveLength(2);
    expect(patch.timeline?.[0]?.eventId).toBe("ev-0");
    expect(patch.timeline?.[1]?.eventId).toBe("ev-1");
    expect(patch.timeline?.[1]?.type).toBe("RESOLVED");
  });
});
