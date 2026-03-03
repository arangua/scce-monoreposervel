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

/** Fase 3.5/3.8 — comentario libre, respuesta, o eventos formales del ciclo de instrucción */
export type CaseEventKind =
  | "COMMENT"
  | "INSTRUCTION_REPLY"
  | "INSTRUCTION_CREATED"
  | "INSTRUCTION_ACK"
  | "INSTRUCTION_CLOSED";

export type CaseEvent = {
  /** Fase 3.9 — id estable para key UI y rehidratación (opcional, eventos antiguos sin él). */
  eventId?: string;
  type: string;
  at: string;
  actor: string;
  note?: string;
  /** Fase 3.5 — id de la instrucción a la que responde este COMMENT */
  refInstructionId?: string;
  /** Fase 3.5 — COMMENT = libre, INSTRUCTION_REPLY = respuesta de terreno */
  kind?: CaseEventKind;
  /** Opcional futuro: CASE | INTERNAL */
  visibility?: "CASE" | "INTERNAL";
};

export type InstructionAck = {
  userId: string;
  role: string;
  at: string;
};

/** Nivel de impacto de la instrucción (no del incidente). Fase 3.4 */
export type ImpactLevel = "L1" | "L2" | "L3";

/** Ámbito funcional de la instrucción. Fase 3.4 */
export type ScopeFunctional =
  | "OPERACIONES"
  | "FISCALIZACION"
  | "SEGURIDAD"
  | "TI"
  | "INFRAESTRUCTURA"
  | "OTRO";

/** Bypass controlado: excepción registrada y auditable. Fase 3.4 */
export type InstructionBypass = {
  enabled: boolean;
  reason?: string;
  notified?: string[];
};

export type InstructionItem = {
  id: string;
  caseId: string;
  scope: string;
  audience: string;
  summary: string;
  details?: string | null;
  createdAt: string;
  createdBy: string;
  status: string;
  ackRequired: boolean;
  acks: InstructionAck[];
  evidence?: string[];
  /** Fase 3.4 — impacto de la instrucción (default L1) */
  impactLevel?: ImpactLevel;
  /** Fase 3.4 — ámbito funcional (default OPERACIONES) */
  scopeFunctional?: ScopeFunctional;
  /** Fase 3.4 — destinatario (label obligatorio) */
  to?: { role?: string; userId?: string; label: string };
  /** Fase 3.6 — con copia (CC) opcional */
  cc?: { role?: string; userId?: string; label: string }[];
  /** Fase 3.4 — bypass con motivo obligatorio si enabled */
  bypass?: InstructionBypass;
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
  instructions?: InstructionItem[];
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
