/**
 * Regresión: criterio "nivel central" según membership activo.
 */
import { describe, it, expect } from "vitest";
import { isCentralFromContext } from "./authSession";

describe("isCentralFromContext", () => {
  it("returns true when membership is OPERACION and regionCode is ADM", () => {
    expect(isCentralFromContext({ contextType: "OPERACION", regionCode: "ADM" })).toBe(true);
  });

  it("returns false when regionCode is not ADM", () => {
    expect(isCentralFromContext({ contextType: "OPERACION", regionCode: "TRP" })).toBe(false);
    expect(
      isCentralFromContext({
        contextType: "OPERACION",
        regionCode: "TRP",
        regionScopeMode: "LIST",
      })
    ).toBe(false);
  });

  it("returns false when contextType is not OPERACION", () => {
    expect(isCentralFromContext({ contextType: "SIMULACION", role: "PESE" })).toBe(false);
  });

  it("returns false when membership is null (role is ignored)", () => {
    expect(isCentralFromContext(null)).toBe(false);
  });

  it("returns false when membership is null and role is not central", () => {
    expect(isCentralFromContext(null)).toBe(false);
  });
});
