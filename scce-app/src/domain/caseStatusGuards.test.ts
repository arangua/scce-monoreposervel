import { describe, expect, it } from "vitest";
import { validateEnGestionPrecondition, type EnGestionPreconditionInput } from "./caseStatusGuards";

const base = (): EnGestionPreconditionInput => ({
  currentStatus: "Nuevo",
  nextStatus: "En gestión",
  bypass: false,
});

describe("validateEnGestionPrecondition", () => {
  it('retorna "mustRecepcionarFirst" cuando nextStatus="En gestión", currentStatus="Nuevo", bypass=false', () => {
    expect(validateEnGestionPrecondition(base())).toBe("mustRecepcionarFirst");
  });

  it("retorna null cuando bypass=true", () => {
    expect(validateEnGestionPrecondition({ ...base(), bypass: true })).toBeNull();
  });

  it('retorna null cuando currentStatus!="Nuevo"', () => {
    expect(validateEnGestionPrecondition({ ...base(), currentStatus: "Recepcionado por DR" })).toBeNull();
  });

  it('retorna null cuando nextStatus!="En gestión"', () => {
    expect(validateEnGestionPrecondition({ ...base(), nextStatus: "Escalado" })).toBeNull();
  });
});
