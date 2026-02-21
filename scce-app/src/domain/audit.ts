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
  let prev = "00000000";
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.hash !== chainHash(e.prevHash !== undefined ? e.prevHash : prev, e))
      return { ok: false, failIndex: i };
    prev = e.hash;
  }
  return { ok: true, failIndex: -1 };
}
