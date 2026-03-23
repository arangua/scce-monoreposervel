export type CaseCloseValidationError =
  | "bypassRequiresValidation"
  | "requiresAction"
  | "requiresDecision"
  | "mustBeResolved"
  | "requiresClosingReason";

export type CaseCloseValidationInput = {
  bypassFlagged?: boolean;
  bypassValidated?: boolean | string | null;
  actions?: unknown[] | null;
  decisions?: unknown[] | null;
  status?: string | null;
  closingMotivo?: string | null;
};

export function validateCaseClosePreconditions(
  c: CaseCloseValidationInput,
): CaseCloseValidationError | null {
  if (c.bypassFlagged && !c.bypassValidated) return "bypassRequiresValidation";
  if (!c.actions?.length) return "requiresAction";
  if (!c.decisions?.length) return "requiresDecision";
  if (c.status !== "Resuelto") return "mustBeResolved";
  if (!c.closingMotivo) return "requiresClosingReason";
  return null;
}
