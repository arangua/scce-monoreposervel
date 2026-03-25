/** Copia 1:1 de scce-app/src/domain/caseCloseValidation.ts — mantener alineado con dominio. */
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

/** Construye el input de cierre desde `Case.operationalState` (JSON) y `dto.reason`. */
export function buildCloseValidationInputFromOperationalState(
  operationalState: unknown,
  reason: string | undefined,
): CaseCloseValidationInput {
  const op =
    operationalState !== null &&
    typeof operationalState === "object" &&
    !Array.isArray(operationalState)
      ? (operationalState as Record<string, unknown>)
      : {};
  return {
    bypassFlagged: op.bypassFlagged === true,
    bypassValidated:
      op.bypassValidated !== undefined ? (op.bypassValidated as boolean | string | null) : null,
    actions: Array.isArray(op.actions) ? op.actions : [],
    decisions: Array.isArray(op.decisions) ? op.decisions : [],
    status: typeof op.status === "string" ? op.status : null,
    closingMotivo: reason ?? null,
  };
}
