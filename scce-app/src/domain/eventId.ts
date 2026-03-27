/**
 * Fase 3.9 — ids estables para eventos de timeline (SPA local; no criptográfico).
 */
export function newEventId(prefix = "ev"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
