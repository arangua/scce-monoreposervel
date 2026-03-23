export type CaseStatusGuardError =
  | "mustRecepcionarFirst";

export type EnGestionPreconditionInput = {
  currentStatus?: string | null;
  nextStatus?: string | null;
  bypass?: boolean | null;
};

export function validateEnGestionPrecondition(
  input: EnGestionPreconditionInput,
): CaseStatusGuardError | null {
  if (
    input.nextStatus === "En gestión" &&
    input.currentStatus === "Nuevo" &&
    !input.bypass
  ) {
    return "mustRecepcionarFirst";
  }
  return null;
}
