import type { AuditLogEntry } from "./types";
import { chainHash } from "./hash";
import { nowISO, uuidSimple } from "./date";

export function appendEvent(
  log: AuditLogEntry[],
  type: string,
  actor: string,
  role: string,
  caseId: string | null,
  summary: string
): AuditLogEntry[] {
  const s = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const nCaseId = (v: unknown) => (typeof v === "string" ? v : v == null ? null : String(v));

  type = s(type);
  actor = s(actor);
  role = s(role);
  summary = s(summary);
  caseId = nCaseId(caseId) as string | null;

  const prevHash: string = log.length ? log[log.length - 1].hash : "00000000";
  const ev: AuditLogEntry = {
    eventId: uuidSimple(),
    type,
    at: nowISO(),
    actor,
    role,
    caseId,
    summary,
    prevHash,
    hash: "",
  };
  ev.hash = chainHash(prevHash, ev);
  return [...log, ev];
}

export function verifyChain(
  events: AuditLogEntry[]
): { ok: boolean; failIndex: number } {
  // --- Guardrail runtime mínimo (Fase 5.1-2) ---
  if (!Array.isArray(events)) return { ok: false, failIndex: 0 };

  let prev = "00000000";
  for (let i = 0; i < events.length; i++) {
    // --- Guardrail runtime mínimo (Fase 5.1-3) ---
    const e = events[i] as unknown;
    if (!e || typeof e !== "object") return { ok: false, failIndex: i };
    const anyE = e as Record<string, unknown>;
    if (typeof anyE.hash !== "string" || typeof anyE.prevHash !== "string") return { ok: false, failIndex: i };

    const ev = events[i];
    if (ev.hash !== chainHash(ev.prevHash !== undefined ? ev.prevHash : prev, ev))
      return { ok: false, failIndex: i };
    prev = ev.hash;
  }
  return { ok: true, failIndex: -1 };
}
