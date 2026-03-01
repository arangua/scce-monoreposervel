/**
 * Regresión: criterio "nivel central" (OPERACION/GLOBAL ⇒ opción ALL, activeRegion ALL una vez).
 */
import { describe, it, expect } from "vitest";
import { isCentralFromContext } from "./authSession";

describe("isCentralFromContext", () => {
  it("returns true when membership is OPERACION/GLOBAL (API central)", () => {
    expect(
      isCentralFromContext({ regionCode: "ADM" }, undefined)
    ).toBe(true);
    expect(
      isCentralFromContext({ regionCode: "ADM" }, "PESE")
    ).toBe(true);
  });

  it("returns false when contextId is not GLOBAL", () => {
    expect(
      isCentralFromContext({ regionCode: "TRP" }, undefined)
    ).toBe(false);
    expect(
      isCentralFromContext({ regionCode: "TRP", regionScopeMode: "LIST" }, undefined)
    ).toBe(false);
  });

  it("returns false when contextType is not OPERACION", () => {
    expect(
      isCentralFromContext({ role: "PESE" }, undefined)
    ).toBe(false);
  });

  it("returns true for demo central roles even without membership", () => {
    expect(isCentralFromContext(null, "NIVEL_CENTRAL")).toBe(true);
    expect(isCentralFromContext(null, "NIVEL_CENTRAL_SIM")).toBe(true);
    expect(isCentralFromContext(null, "ADMIN_PILOTO")).toBe(true);
  });

  it("returns false when membership is null and demo role is not central", () => {
    expect(isCentralFromContext(null, undefined)).toBe(false);
    expect(isCentralFromContext(null, "PESE")).toBe(false);
    expect(isCentralFromContext(null, "REGISTRO_SCCE")).toBe(false);
  });
});
