// src/domain/date.ts

/** Tolerancia (ms) para considerar "hora de detección" no futura: evita falsos positivos por desfase de reloj (ej. 5 min). */
export const DETECTED_AT_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Indica si la hora de detección se considera "en el futuro" respecto a ahora.
 * Usa tolerancia para desfase de reloj (p. ej. 5 min): si está dentro de la tolerancia, no se considera futuro.
 */
export function isDetectedAtInFuture(
  detectedAtIso: string,
  toleranceMs: number = DETECTED_AT_FUTURE_TOLERANCE_MS
): boolean {
  const detMs = new Date(detectedAtIso).getTime();
  const nowMs = Date.now();
  if (!Number.isFinite(detMs)) return true;
  return detMs > nowMs + toleranceMs;
}

export const nowISO = (): string => new Date().toISOString();

/** Hora actual en zona local, formato YYYY-MM-DDTHH:mm para <input type="datetime-local">. Evita que el valor por defecto se interprete como futuro por usar UTC. */
export function nowLocalDatetimeInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
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

/** Solo hora:minuto (ej. para prefijo "Respuesta a instrucción L2 (14:30)") */
export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
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
