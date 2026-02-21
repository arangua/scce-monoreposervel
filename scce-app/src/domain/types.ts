// scce-app/src/domain/types.ts
// Tipos de dominio SCCE (sin lógica). Extraídos desde App.tsx.
// Regla: solo types (no funciones, no constantes de UI).

export type RegionCode = string;
export type CommuneCode = string;

export type CaseStatus =
  | "Nuevo"
  | "Recepcionado por DR"
  | "En gestión"
  | "Escalado"
  | "Mitigado"
  | "Resuelto"
  | "Cerrado";

export type Criticality = "CRITICA" | "ALTA" | "MEDIA" | "BAJA";

export type CaseEvent = {
  type: string;
  at: string;
  actor: string;
  note?: string;
};

export type CaseItem = {
  id: string;
  region: string;
  commune: string;
  status: CaseStatus;
  criticality: Criticality;
  summary: string;
  local?: string;
  localSnapshot?: { idLocal: string; nombre: string; region: string; commune: string; snapshotAt: string } | null;
  origin?: { actor: string; channel: string; detectedAt: string };
  timeline?: CaseEvent[];
  evaluation?: Record<string, number>;
  criticalityScore?: number;
  detail?: string;
  evidence?: string[];
  actions?: unknown[];
  decisions?: unknown[];
  assignedTo?: string | null;
  closingMotivo?: string | null;
  bypass?: boolean;
  bypassMotivo?: string;
  bypassActor?: string | null;
  bypassFlagged?: boolean;
  peseInoperante?: boolean;
  evaluationLocked?: boolean;
  evaluationHistory?: unknown[];
  slaMinutes?: number;
  bypassValidated?: string | null;
  completeness?: number;
  reportedAt?: string | null;
  firstActionAt?: string | null;
  escalatedAt?: string | null;
  mitigatedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  isSim?: boolean;
};

export type LocalCatalogEntry = {
  idLocal: string;
  nombre: string;
  region: RegionCode;
  commune: CommuneCode;
  activoGlobal: boolean;
  activoEnEleccionActual: boolean;
  fechaCreacion: string;
  fechaDesactivacion: string | null;
  origenSeed: boolean;
};

export type LocalCatalog = LocalCatalogEntry[];

export type AuditLogEntry = {
  eventId: string;
  type: string;
  at: string;
  actor: string;
  role: string;
  caseId: string | null;
  summary: string;
  prevHash: string;
  hash: string;
};
