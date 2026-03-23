import { describe, expect, it } from "vitest";
import { calcCriticality } from "./criticality";

describe("calcCriticality", () => {
  it("returns BAJA for null", () => {
    const r = calcCriticality(null);
    expect(r.criticality).toBe("BAJA");
    expect(r.score).toBe(0);
    expect(r.recommendation).toBe("Gestión local. Registrar y monitorear.");
  });

  it("returns BAJA for undefined", () => {
    const r = calcCriticality(undefined);
    expect(r.criticality).toBe("BAJA");
    expect(r.score).toBe(0);
    expect(r.recommendation).toBe("Gestión local. Registrar y monitorear.");
  });

  it("returns CRITICA when max >= 3", () => {
    const r = calcCriticality({ a: 3 });
    expect(r.criticality).toBe("CRITICA");
    expect(r.score).toBe(3);
    expect(r.recommendation).toBe("⚠️ Escalamiento INMEDIATO al Director Regional y Nivel Central.");
  });

  it("returns ALTA when sum >= 8 and max < 3", () => {
    const r = calcCriticality({ a: 2, b: 2, c: 2, d: 2 });
    expect(r.criticality).toBe("ALTA");
    expect(r.score).toBe(8);
    expect(r.recommendation).toBe("Notificar Director Regional. SLA máx. 30 min.");
  });

  it("returns MEDIA when sum >= 4 and sum < 8 and max < 3", () => {
    const r = calcCriticality({ a: 2, b: 2 });
    expect(r.criticality).toBe("MEDIA");
    expect(r.score).toBe(4);
    expect(r.recommendation).toBe("Gestionar a través de Registro SCCE. SLA máx. 60 min.");
  });

  it("returns BAJA for remaining case (sum < 4, max < 3)", () => {
    const r = calcCriticality({ a: 1, b: 1 });
    expect(r.criticality).toBe("BAJA");
    expect(r.score).toBe(2);
    expect(r.recommendation).toBe("Gestión local. Registrar y monitorear.");
  });
});
