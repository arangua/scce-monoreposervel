import { describe, expect, it } from "vitest";
import { SLA_MINUTES, normalizeSlaLevel, slaMinutesForCriticality } from "./caseSla";

describe("slaMinutesForCriticality", () => {
  it("returns SLA_MINUTES for CRITICA", () => {
    expect(slaMinutesForCriticality("CRITICA")).toBe(SLA_MINUTES.CRITICA);
  });

  it("returns SLA_MINUTES for ALTA", () => {
    expect(slaMinutesForCriticality("ALTA")).toBe(SLA_MINUTES.ALTA);
  });

  it("returns SLA_MINUTES for MEDIA", () => {
    expect(slaMinutesForCriticality("MEDIA")).toBe(SLA_MINUTES.MEDIA);
  });

  it("returns SLA_MINUTES for BAJA", () => {
    expect(slaMinutesForCriticality("BAJA")).toBe(SLA_MINUTES.BAJA);
  });

  it("normalizes unknown criticality like normalizeSlaLevel (MEDIA → 60)", () => {
    expect(slaMinutesForCriticality("no-existe")).toBe(60);
    expect(slaMinutesForCriticality(undefined)).toBe(60);
  });

  it("coincide con la fórmula histórica SLA_MINUTES[normalizeSlaLevel(...)] || 60", () => {
    const inputs: (string | undefined)[] = ["CRITICA", "ALTA", "MEDIA", "BAJA", "", undefined, "xyz"];
    for (const c of inputs) {
      expect(slaMinutesForCriticality(c)).toBe(SLA_MINUTES[normalizeSlaLevel(c)] || 60);
    }
  });
});
