import type { CaseEvent } from "./types";

export function isDuplicateEvent(timeline: CaseEvent[], ev: CaseEvent): boolean {
  const last = timeline[timeline.length - 1];
  if (!last) return false;

  return (
    last.type === ev.type &&
    last.kind === ev.kind &&
    last.refInstructionId === ev.refInstructionId &&
    last.actor === ev.actor &&
    last.note === ev.note
  );
}
