export function simpleHash(str: string): string {
  let h = 0x811c9dc5;

  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }

  return h.toString(16).padStart(8, "0");
}

export function chainHash(
  prev: string,
  ev: {
    eventId?: string;
    type?: string;
    at?: string;
    actor?: string;
    caseId?: string | null;
    summary?: string;
  }
): string {
  // --- Guardrails runtime mínimos (Fase 5.2) ---
  const safePrev = typeof prev === "string" ? prev : String(prev ?? "");

  const safeEventId =
    typeof ev.eventId === "string" ? ev.eventId : String(ev.eventId ?? "");

  const safeType =
    typeof ev.type === "string" ? ev.type : String(ev.type ?? "");

  const safeAt =
    typeof ev.at === "string" ? ev.at : String(ev.at ?? "");

  const safeActor =
    typeof ev.actor === "string" ? ev.actor : String(ev.actor ?? "");

  const safeCaseId =
    typeof ev.caseId === "string"
      ? ev.caseId
      : ev.caseId == null
      ? ""
      : String(ev.caseId);

  const safeSummary =
    typeof ev.summary === "string" ? ev.summary : String(ev.summary ?? "");

  return simpleHash(
    safePrev +
      safeEventId +
      safeType +
      safeAt +
      safeActor +
      safeCaseId +
      safeSummary
  );
}
