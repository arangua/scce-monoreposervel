/**
 * Regla de gobernanza: validación operacional y cierre.
 * Función pura que evalúa si la validación operacional permite el cierre del caso.
 * No toca UI ni API.
 */

const OP_VAL = "OPERATIONAL_VALIDATION";
const OK_OR_OBS = new Set<"OK" | "OBSERVATIONS">(["OK", "OBSERVATIONS"]);

/** Evento de timeline con campos mínimos necesarios para la regla. */
export type TimelineEventLike = { type: string; at: string; result?: "OK" | "OBSERVATIONS" | "FAIL" };

/** Acción con fecha mínima (ej. case.actions[i]). */
export type ActionLike = { at: string };

/** Resultado de la evaluación (sin textos de UI, solo identificadores). */
export type OperationalValidationClosureResult = {
  isOperationalValidationSatisfied: boolean;
  nextStep: "none" | "validate" | "action_after_fail" | "revalidate_after_action" | "close_ready";
  reason: string;
};

/**
 * Comparación temporal consistente: ISO 8601 compara bien como string.
 */
function isAfter(a: string, b: string): boolean {
  return a > b;
}

function getOpValEvents(timeline: TimelineEventLike[]): TimelineEventLike[] {
  return timeline.filter((ev) => ev.type === OP_VAL);
}

function getLastByAt<T extends { at: string }>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items.slice().sort((a, b) => (a.at > b.at ? -1 : 1))[0];
}

/**
 * Evalúa si la validación operacional permite el cierre según reglas aprobadas.
 *
 * Reglas:
 * 1. Debe existir al menos un evento OPERATIONAL_VALIDATION.
 * 2. La última validación (por at) debe ser OK u OBSERVATIONS.
 * 3. Si existe algún FAIL: debe existir al menos una acción con at > F.at (F = último FAIL)
 *    y al menos una validación OK u OBSERVATIONS con at > esa acción.
 * 4. En cualquier otro caso, no permite cierre.
 */
export function operationalValidationAllowsClosure(
  timeline: TimelineEventLike[],
  actions: ActionLike[]
): OperationalValidationClosureResult {
  const opVals = getOpValEvents(timeline);
  if (opVals.length === 0) {
    return {
      isOperationalValidationSatisfied: false,
      nextStep: "validate",
      reason: "no_op_val",
    };
  }

  const last = getLastByAt(opVals);
  if (!last) {
    return {
      isOperationalValidationSatisfied: false,
      nextStep: "validate",
      reason: "no_op_val",
    };
  }

  const lastResult = last.result;
  const failEvents = opVals.filter((ev) => ev.result === "FAIL");
  const lastFail = failEvents.length > 0 ? getLastByAt(failEvents) : undefined;

  if (lastResult === "OK" || lastResult === "OBSERVATIONS") {
    if (!lastFail) {
      return {
        isOperationalValidationSatisfied: true,
        nextStep: "close_ready",
        reason: "last_ok_or_observations_no_fail",
      };
    }
    const failAt = lastFail.at;
    const actionsAfterFail = actions.filter((a) => isAfter(a.at, failAt));
    if (actionsAfterFail.length === 0) {
      return {
        isOperationalValidationSatisfied: false,
        nextStep: "action_after_fail",
        reason: "fail_exists_no_action_after",
      };
    }
    const okOrObsAfterSomeAction = actionsAfterFail.some((action) =>
      opVals.some(
        (ev) =>
          ev.result &&
          ev.result !== undefined &&
          OK_OR_OBS.has(ev.result as "OK" | "OBSERVATIONS") &&
          isAfter(ev.at, action.at)
      )
    );
    if (!okOrObsAfterSomeAction) {
      return {
        isOperationalValidationSatisfied: false,
        nextStep: "revalidate_after_action",
        reason: "action_after_fail_but_no_ok_obs_after_action",
      };
    }
    return {
      isOperationalValidationSatisfied: true,
      nextStep: "close_ready",
      reason: "last_ok_or_observations_sequence_ok",
    };
  }

  if (lastResult === "FAIL") {
    const actionAfterFail = actions.some((a) => isAfter(a.at, last.at));
    return {
      isOperationalValidationSatisfied: false,
      nextStep: actionAfterFail ? "revalidate_after_action" : "action_after_fail",
      reason: actionAfterFail ? "last_fail_has_action_need_revalidation" : "last_fail_no_action",
    };
  }

  return {
    isOperationalValidationSatisfied: false,
    nextStep: "validate",
    reason: "last_op_val_unknown_result",
  };
}
