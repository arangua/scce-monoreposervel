// scce-app/src/domain/migrations/migrateLegacyInstructions.ts
// Migración idempotente: convierte COMMENT con prefijo "[INSTRUCCIÓN] " en timeline → InstructionItem.
// No se aplica a seeds (makeSeedCases ya viene limpio). Solo al import JSON.

import type { CaseItem, CaseEvent, InstructionItem } from "../types";
import { uuidSimple } from "../date";

const INSTRUCTION_PREFIX = "[INSTRUCCIÓN] ";

function isLegacyInstructionEvent(ev: CaseEvent): boolean {
  return ev.type === "COMMENT" && typeof ev.note === "string" && ev.note.startsWith(INSTRUCTION_PREFIX);
}

/**
 * Convierte un COMMENT con prefijo [INSTRUCCIÓN] en un InstructionItem.
 */
function eventToInstruction(caseId: string, ev: CaseEvent): InstructionItem {
  const text = ev.note!.slice(INSTRUCTION_PREFIX.length).trim();
  const summary = text.length > 200 ? text.slice(0, 197) + "..." : text;
  return {
    id: uuidSimple(),
    caseId,
    scope: "case",
    audience: "all",
    summary,
    details: text || null,
    createdAt: ev.at,
    createdBy: ev.actor,
    status: "issued",
    ackRequired: true,
    acks: [],
    evidence: [],
  };
}

/**
 * Migración idempotente: si el caso ya tiene instructions con elementos, no se modifica.
 * Si no tiene (o está vacío), se extraen de timeline los COMMENT [INSTRUCCIÓN] y se mueven a instructions,
 * y se eliminan esos eventos del timeline.
 */
export function migrateLegacyInstructionsInCases(cases: CaseItem[]): CaseItem[] {
  return cases.map((c) => {
    const existing = c.instructions;
    if (Array.isArray(existing) && existing.length > 0) {
      return c;
    }
    const timeline = c.timeline ?? [];
    const legacy: CaseEvent[] = [];
    const rest: CaseEvent[] = [];
    for (const ev of timeline) {
      if (isLegacyInstructionEvent(ev)) legacy.push(ev);
      else rest.push(ev);
    }
    if (legacy.length === 0) {
      return c;
    }
    const instructions: InstructionItem[] = legacy.map((ev) => eventToInstruction(c.id, ev));
    return {
      ...c,
      timeline: rest,
      instructions: [...(existing ?? []), ...instructions],
    };
  });
}
