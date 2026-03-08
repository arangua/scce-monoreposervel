/**
 * Progreso del incidente — flujo oficial SCCE para guía en ficha del caso.
 * 1. Acción registrada → 2. Resuelto → 3. Validación operacional → 4. Decisión → 5. Motivo de cierre → 6. Cierre
 */

import type { CaseItem } from "./types";
import {
  operationalValidationAllowsClosure,
  type TimelineEventLike,
  type ActionLike,
  type OperationalValidationClosureResult,
} from "./operationalValidationClosure";

export type StepState = "completed" | "pending" | "blocked";

export type ProgressStep = {
  label: string;
  state: StepState;
};

const FLOW_LABELS: [string, string, string, string, string, string] = [
  "Acción formal registrada",
  "Resuelto",
  "Validación operacional",
  "Decisión",
  "Motivo de cierre",
  "Cierre",
];

function normalizeStatus(s: unknown): string {
  const key = (typeof s === "string" ? s : s == null ? "" : String(s)).trim();
  const map: Record<string, string> = {
    OPEN: "Nuevo", NEW: "Nuevo", ACKED: "Recepcionado por DR",
    IN_PROGRESS: "En gestión", ESCALATED: "Escalado", MITIGATED: "Mitigado",
    RESOLVED: "Resuelto", CLOSED: "Cerrado",
    "Nuevo": "Nuevo", "Recepcionado por DR": "Recepcionado por DR",
    "En gestión": "En gestión", "Escalado": "Escalado", "Mitigado": "Mitigado",
    "Resuelto": "Resuelto", "Cerrado": "Cerrado",
  };
  return map[key] ?? key;
}

/** Acción registrada = acción formal agregada con "+ Acción" */
function hasActionRegistered(c: CaseItem): boolean {
  return (c.actions?.length ?? 0) > 0;
}

function isResolved(c: CaseItem): boolean {
  return normalizeStatus(c.status) === "Resuelto";
}

/** Construye timeline y actions desde CaseItem para la regla de cierre por validación operacional. */
function toClosureInput(c: CaseItem): { timeline: TimelineEventLike[]; actions: ActionLike[] } {
  const timeline: TimelineEventLike[] = (c.timeline ?? []).map((e) => ({
    type: e.type,
    at: e.at,
    result: e.result,
  }));
  const actions: ActionLike[] = (c.actions ?? [])
    .map((a) => ({ at: (a as { at?: string }).at ?? "" }))
    .filter((x) => x.at !== "");
  return { timeline, actions };
}

/** Resultado de la regla de validación operacional para un caso (exportado para checklist/UI). */
export function getOperationalValidationClosureResult(c: CaseItem): OperationalValidationClosureResult {
  const { timeline, actions } = toClosureInput(c);
  return operationalValidationAllowsClosure(timeline, actions);
}

function hasDecision(c: CaseItem): boolean {
  return (c.decisions?.length ?? 0) >= 1;
}

function hasClosingMotivo(c: CaseItem): boolean {
  return Boolean(c.closingMotivo?.trim());
}

function isClosed(c: CaseItem): boolean {
  return normalizeStatus(c.status) === "Cerrado";
}

export type CaseProgressResult = {
  steps: ProgressStep[];
  nextStepRecommended: string;
};

function stepState(completed: boolean, prevCompleted: boolean): StepState {
  if (completed && prevCompleted) return "completed";
  return prevCompleted ? "pending" : "blocked";
}

const OP_VAL_NEXT_STEP: Record<string, string> = {
  validate: "Validar operación",
  none: "Validar operación",
  action_after_fail: "Registrar acción por fallo de validación",
  revalidate_after_action: "Nueva validación operativa (OK u Observaciones)",
  close_ready: "Registrar decisión",
};

function computeNextStep(
  step1: boolean,
  step2: boolean,
  step3: boolean,
  step4: boolean,
  step5: boolean,
  step6: boolean,
  opValNextStep: string
): string {
  if (!step1) return "Registrar acción";
  if (!step2) return "Marcar como resuelto";
  if (!step3) return opValNextStep;
  if (!step4) return "Registrar decisión";
  if (!step5) return "Ingresar motivo de cierre";
  if (!step6) return "Cerrar caso";
  return "Caso cerrado";
}

/**
 * Calcula el estado de cada paso del flujo y el siguiente paso recomendado.
 * Paso 3 (Validación operacional) usa la regla de gobernanza: última OK/OBSERVATIONS y secuencia tras FAIL.
 */
export function getCaseProgress(c: CaseItem): CaseProgressResult {
  const closureResult = getOperationalValidationClosureResult(c);
  const s1 = hasActionRegistered(c);
  const s2 = isResolved(c);
  const s3 = closureResult.isOperationalValidationSatisfied;
  const s4 = hasDecision(c);
  const s5 = hasClosingMotivo(c);
  const s6 = isClosed(c);

  const steps: ProgressStep[] = [
    { label: FLOW_LABELS[0], state: s1 ? "completed" : "pending" },
    { label: FLOW_LABELS[1], state: stepState(s2, s1) },
    { label: FLOW_LABELS[2], state: stepState(s3, s2) },
    { label: FLOW_LABELS[3], state: stepState(s4, s3) },
    { label: FLOW_LABELS[4], state: stepState(s5, s4) },
    { label: FLOW_LABELS[5], state: stepState(s6, s5) },
  ];

  const opValNextStep = OP_VAL_NEXT_STEP[closureResult.nextStep] ?? "Validar operación";
  const nextStepRecommended = computeNextStep(s1, s2, s3, s4, s5, s6, opValNextStep);
  return { steps, nextStepRecommended };
}
