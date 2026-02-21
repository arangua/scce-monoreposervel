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
  return simpleHash(
    prev +
      (ev.eventId || "") +
      (ev.type || "") +
      (ev.at || "") +
      (ev.actor || "") +
      (ev.caseId ?? "") +
      (ev.summary || "")
  );
}
