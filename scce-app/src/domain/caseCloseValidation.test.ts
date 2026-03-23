import { describe, expect, it } from "vitest";
import { validateCaseClosePreconditions, type CaseCloseValidationInput } from "./caseCloseValidation";

const base = (): CaseCloseValidationInput => ({
  bypassFlagged: false,
  bypassValidated: false,
  actions: ["a"],
  decisions: ["d"],
  status: "Resuelto",
  closingMotivo: "Cierre válido",
});

describe("validateCaseClosePreconditions", () => {
  it('retorna "bypassRequiresValidation" si bypassFlagged=true y bypassValidated!=true', () => {
    expect(
      validateCaseClosePreconditions({ ...base(), bypassFlagged: true, bypassValidated: undefined }),
    ).toBe("bypassRequiresValidation");
    expect(
      validateCaseClosePreconditions({ ...base(), bypassFlagged: true, bypassValidated: false }),
    ).toBe("bypassRequiresValidation");
  });

  it('retorna "requiresAction" si no hay actions', () => {
    expect(validateCaseClosePreconditions({ ...base(), actions: [] })).toBe("requiresAction");
    expect(validateCaseClosePreconditions({ ...base(), actions: undefined })).toBe("requiresAction");
    expect(validateCaseClosePreconditions({ ...base(), actions: null })).toBe("requiresAction");
  });

  it('retorna "requiresDecision" si no hay decisions', () => {
    expect(validateCaseClosePreconditions({ ...base(), decisions: [] })).toBe("requiresDecision");
    expect(validateCaseClosePreconditions({ ...base(), decisions: undefined })).toBe("requiresDecision");
    expect(validateCaseClosePreconditions({ ...base(), decisions: null })).toBe("requiresDecision");
  });

  it('retorna "mustBeResolved" si status !== "Resuelto"', () => {
    expect(validateCaseClosePreconditions({ ...base(), status: "Mitigado" })).toBe("mustBeResolved");
  });

  it('retorna "requiresClosingReason" si falta closingMotivo', () => {
    expect(validateCaseClosePreconditions({ ...base(), closingMotivo: "" })).toBe("requiresClosingReason");
    expect(validateCaseClosePreconditions({ ...base(), closingMotivo: undefined })).toBe(
      "requiresClosingReason",
    );
    expect(validateCaseClosePreconditions({ ...base(), closingMotivo: null })).toBe(
      "requiresClosingReason",
    );
  });

  it("retorna null cuando todo está OK", () => {
    expect(validateCaseClosePreconditions(base())).toBeNull();
    expect(
      validateCaseClosePreconditions({
        ...base(),
        bypassFlagged: true,
        bypassValidated: true,
      }),
    ).toBeNull();
  });
});
