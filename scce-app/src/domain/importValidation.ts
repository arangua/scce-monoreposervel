/**
 * importValidation.ts
 * Helpers de validación para import/export de casos SCCE.
 * Extraído de App.tsx — R-1 refactor 2026-03-27.
 * Funciones puras, sin estado, sin efectos secundarios.
 */

// ─── Límites (deben coincidir con los de App.tsx) ────────────────────────────
export const MAX_ID = 80;
export const MAX_SHORT = 200;
export const MAX_MED = 500;
export const MAX_LONG = 2000;
export const MAX_DATE_STR = 35;
export const MAX_EVENT_NOTE = 500;
export const MAX_UNKNOWN_ARRAY = 200;
export const MAX_TIMELINE = 500;
export const MAX_EVIDENCE_ITEMS = 50;
export const MAX_TOTAL_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export const ISO_SOFT_RE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;

export const ID_RE = /^[A-Za-z0-9_-]+$/;

// ─── Primitivos ───────────────────────────────────────────────────────────────

export function importFail(msg: string): never {
  throw new Error(msg);
}

export function assertImportString(name: string, v: unknown): string {
  if (typeof v !== "string") importFail(`Import fail-closed: "${name}" debe ser string.`);
  const s = (v as string).trim();
  if (!s) importFail(`Import fail-closed: "${name}" no puede ser vacío.`);
  return s;
}

export function assertStringMax(
  name: string,
  v: unknown,
  max: number,
  optional = false
): string | undefined {
  if (v === undefined || v === null)
    return optional ? undefined : importFail(`Import fail-closed: "${name}" es requerido.`);
  const s = assertImportString(name, v);
  if (s.length > max) importFail(`Import fail-closed: "${name}" excede máximo (${max}).`);
  return s;
}

export function assertIdStable(v: unknown): string {
  const id = assertStringMax("case.id", v, MAX_ID, false)!;
  if (!ID_RE.test(id))
    importFail(
      `Import fail-closed: "case.id" contiene caracteres no permitidos. Use solo A-Z a-z 0-9 _ -`
    );
  return id;
}

export function assertArrayMax(
  name: string,
  v: unknown,
  max: number,
  optional = false
): unknown[] | undefined {
  if (v === undefined || v === null)
    return optional ? undefined : importFail(`Import fail-closed: "${name}" es requerido.`);
  if (!Array.isArray(v)) importFail(`Import fail-closed: "${name}" debe ser arreglo.`);
  if ((v as unknown[]).length > max)
    importFail(`Import fail-closed: "${name}" excede máximo (${max}).`);
  return v as unknown[];
}

export function assertPlainObject(name: string, v: unknown): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v))
    importFail(`Import fail-closed: "${name}" debe ser objeto.`);
  return v as Record<string, unknown>;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

// ─── Tipos de dominio ─────────────────────────────────────────────────────────

export type LocalSnapshot = {
  idLocal: string;
  nombre: string;
  region: string;
  commune: string;
  snapshotAt: string;
};

export function isLocalSnapshot(v: unknown): v is LocalSnapshot {
  if (!isRecord(v)) return false;
  return (
    typeof v.idLocal === "string" &&
    typeof v.nombre === "string" &&
    typeof v.region === "string" &&
    typeof v.commune === "string" &&
    typeof v.snapshotAt === "string"
  );
}

// ─── Validadores compuestos ───────────────────────────────────────────────────

export function assertUnknownItemKind(name: string, v: unknown): void {
  if (typeof v === "string") {
    if (v.trim().length > MAX_LONG)
      importFail(`Import fail-closed: "${name}" string excede máximo (${MAX_LONG}).`);
    return;
  }
  if (typeof v === "object" && v !== null && !Array.isArray(v)) return;
  importFail(`Import fail-closed: "${name}" debe ser string u objeto.`);
}

export function assertCaseEvent(name: string, v: unknown): void {
  const o = assertPlainObject(name, v);
  assertStringMax(`${name}.type`, o.type, MAX_SHORT, false);
  assertStringMax(`${name}.at`, o.at, MAX_SHORT, false);
  assertStringMax(`${name}.actor`, o.actor, MAX_MED, false);
  assertStringMax(`${name}.note`, o.note, MAX_EVENT_NOTE, true);
}

export function assertIsoSoft(
  name: string,
  v: unknown,
  optional = false
): string | undefined {
  if (v === undefined || v === null)
    return optional ? undefined : importFail(`Import fail-closed: "${name}" es requerido.`);
  const s = assertImportString(name, v);
  if (s.length > MAX_DATE_STR)
    importFail(`Import fail-closed: "${name}" excede máximo (${MAX_DATE_STR}).`);
  if (!ISO_SOFT_RE.test(s))
    importFail(`Import fail-closed: "${name}" no tiene forma ISO válida (soft).`);
  return s;
}
