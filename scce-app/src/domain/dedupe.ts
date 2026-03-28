/**
 * Fase 4.0 — Deduplicación defensiva: evitar eventos duplicados en timeline por doble click / lag.
 */
import type { CaseEvent } from "./types";

type DedupeKey = {
  kind?: string;
  type: string;
  actor: string;
  refInstructionId?: string;
  note?: string;
};

function norm(s?: string): string {
  return (s ?? "").trim().toLowerCase();
}

export function isDuplicateEvent(
  timeline: CaseEvent[],
  candidate: CaseEvent,
  windowMs = 4000
): boolean {
  const t0 = Date.parse(candidate.at);
  if (!Number.isFinite(t0)) return false;

  const keyCand: DedupeKey = {
    kind: candidate.kind,
    type: candidate.type,
    actor: candidate.actor,
    refInstructionId: candidate.refInstructionId,
    note: norm(candidate.note),
  };

  for (let i = timeline.length - 1; i >= 0; i--) {
    const ev = timeline[i];
    const t = Date.parse(ev.at);
    if (!Number.isFinite(t)) continue;
    if (t0 - t > windowMs) break;

    const keyEv: DedupeKey = {
      kind: ev.kind,
      type: ev.type,
      actor: ev.actor,
      refInstructionId: ev.refInstructionId,
      note: norm(ev.note),
    };

    if (
      keyEv.type === keyCand.type &&
      keyEv.actor === keyCand.actor &&
      (keyEv.kind ?? "") === (keyCand.kind ?? "") &&
      (keyEv.refInstructionId ?? "") === (keyCand.refInstructionId ?? "") &&
      keyEv.note === keyCand.note
    ) {
      return true;
    }
  }

  return false;
}
