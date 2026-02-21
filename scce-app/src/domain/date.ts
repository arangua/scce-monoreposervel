// src/domain/date.ts
export const nowISO = (): string => new Date().toISOString();
export function uuidSimple(): string {
  return "ev-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

export const tsISO = (m = 0) =>
  new Date(Date.now() - m * 60000).toISOString();

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL") + " " + d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export function timeDiff(
  a: string | null | undefined,
  b: string | null | undefined
): number | null {
  if (!a || !b) return null;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return Math.round((tb - ta) / 60000);
}

export function getElapsed(
  c: { createdAt?: string },
  nowMs: number = Date.now()
): number {
  const ta = c?.createdAt ? Date.parse(c.createdAt) : NaN;
  if (Number.isNaN(ta)) return 0;
  const diffMs = nowMs - ta;
  const mins = Math.round(diffMs / 60000);
  return mins < 0 ? 0 : mins;
}
