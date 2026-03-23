export type UiStatus =
  | "Nuevo"
  | "Recepcionado por DR"
  | "En gestión"
  | "Escalado"
  | "Mitigado"
  | "Resuelto"
  | "Cerrado";

export const STATUS_MAP: Record<string, UiStatus> = {
  // backend / legacy
  OPEN: "Nuevo",
  NEW: "Nuevo",
  IN_PROGRESS: "En gestión",
  ESCALATED: "Escalado",
  MITIGATED: "Mitigado",
  RESOLVED: "Resuelto",
  CLOSED: "Cerrado",

  // ya en español (por si ya existen)
  "Nuevo": "Nuevo",
  "Recepcionado por DR": "Recepcionado por DR",
  "En gestión": "En gestión",
  Escalado: "Escalado",
  Mitigado: "Mitigado",
  Resuelto: "Resuelto",
  Cerrado: "Cerrado",
};

export function normalizeStatus(s: unknown): UiStatus | "Otros / Desconocido" {
  const key = String(s ?? "").trim();
  return STATUS_MAP[key] ?? "Otros / Desconocido";
}
