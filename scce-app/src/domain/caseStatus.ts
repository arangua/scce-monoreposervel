import type { CaseStatus } from "./types";

export const CASE_STATUS_TIMELINE_EVENT: Record<CaseStatus, string> = {
  Escalado: "ESCALATED",
  Mitigado: "MITIGATED",
  Resuelto: "RESOLVED",
  Cerrado: "CLOSED",
  "En gestión": "IN_MANAGEMENT",
  "Recepcionado por DR": "RECEPCIONADO",
  Nuevo: "DETECTED",
};

export const CASE_STATUS_TIMESTAMP_FIELD: Partial<Record<CaseStatus, string>> = {
  Escalado: "escalatedAt",
  Mitigado: "mitigatedAt",
  Resuelto: "resolvedAt",
  Cerrado: "closedAt",
};
