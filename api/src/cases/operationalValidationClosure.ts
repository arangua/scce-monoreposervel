/**
 * Regla de gobernanza: validación operacional y cierre.
 * Lógica duplicada desde scce-app/domain para uso en backend (sin importar frontend).
 * Entrada: eventos con at (ISO) y result; acciones con at (ISO).
 */

const OP_VAL = "OPERATIONAL_VALIDATION";
const OK_OR_OBS = new Set<"OK" | "OBSERVATIONS">(["OK", "OBSERVATIONS"]);

export type TimelineEventLike = {
  type: string;
  at: string;
  result?: "OK" | "OBSERVATIONS" | "FAIL";
};

export type ActionLike = { at: string };

export type OperationalValidationClosureResult = {
  isOperationalValidationSatisfied: boolean;
  reason: string;
};

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
 * Evalúa si la validación operacional permite el cierre (misma regla que frontend).
 */
export function operationalValidationAllowsClosure(
  timeline: TimelineEventLike[],
  actions: ActionLike[]
): OperationalValidationClosureResult {
  const opVals = getOpValEvents(timeline);
  if (opVals.length === 0) {
    return { isOperationalValidationSatisfied: false, reason: "no_op_val" };
  }

  const last = getLastByAt(opVals);
  if (!last) {
    return { isOperationalValidationSatisfied: false, reason: "no_op_val" };
  }

  const lastResult = last.result;
  const failEvents = opVals.filter((ev) => ev.result === "FAIL");
  const lastFail = failEvents.length > 0 ? getLastByAt(failEvents) : undefined;

  if (lastResult === "OK" || lastResult === "OBSERVATIONS") {
    if (!lastFail) {
      return { isOperationalValidationSatisfied: true, reason: "last_ok_or_observations_no_fail" };
    }
    const failAt = lastFail.at;
    const actionsAfterFail = actions.filter((a) => isAfter(a.at, failAt));
    if (actionsAfterFail.length === 0) {
      return { isOperationalValidationSatisfied: false, reason: "fail_exists_no_action_after" };
    }
    const okOrObsAfterSomeAction = actionsAfterFail.some((action) =>
      opVals.some(
        (ev) =>
          ev.result !== undefined &&
          OK_OR_OBS.has(ev.result as "OK" | "OBSERVATIONS") &&
          isAfter(ev.at, action.at)
      )
    );
    if (!okOrObsAfterSomeAction) {
      return {
        isOperationalValidationSatisfied: false,
        reason: "action_after_fail_but_no_ok_obs_after_action",
      };
    }
    return { isOperationalValidationSatisfied: true, reason: "last_ok_or_observations_sequence_ok" };
  }

  if (lastResult === "FAIL") {
    return {
      isOperationalValidationSatisfied: false,
      reason: "last_fail",
    };
  }

  return { isOperationalValidationSatisfied: false, reason: "last_op_val_unknown_result" };
}
