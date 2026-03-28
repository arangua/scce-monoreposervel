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

// FASE 0: etapas del flujo decisional C2 (modelo v2)
// FASE 1: nivel de confianza del dato
export type DataConfidence =
  | "VERIFIED"  // Confirmado por ≥2 fuentes independientes
  | "HIGH"      // Una fuente confiable, sin contradicción
  | "MEDIUM"    // Fuente única, no verificada
  | "LOW"       // Rumor o reporte indirecto
  | "UNKNOWN";  // No evaluado aún (default)

export const DATA_CONFIDENCE_LABELS: Record<DataConfidence, string> = {
  VERIFIED: "Verificado (≥2 fuentes)",
  HIGH:     "Alto (fuente confiable)",
  MEDIUM:   "Medio (sin verificar)",
  LOW:      "Bajo (reporte indirecto)",
  UNKNOWN:  "Sin evaluar",
};

export const DATA_CONFIDENCE_COLORS: Record<DataConfidence, string> = {
  VERIFIED: "#22c55e",
  HIGH:     "#84cc16",
  MEDIUM:   "#eab308",
  LOW:      "#f97316",
  UNKNOWN:  "#9ca3af",
};

// FASE 1: estructura de orientación (etapa 3 del flujo C2)
export type OrientationData = {
  operationalMeaning: string;  // ¿Qué implica para la operación?
  legalRisk: string;           // Riesgo jurídico (impugnación, nulidad)
  reputationalRisk: string;    // Exposición mediática o ciudadana
  orientedBy: string;          // membershipId o userId del analista
  orientedAt: string;          // ISO timestamp
};

export type DecisionStage =
  | "DETECTED"    // Etapa 1: ¿Qué ocurrió?
  | "VALIDATED"   // Etapa 2: ¿Qué sabemos realmente?
  | "ORIENTED"    // Etapa 3: ¿Qué significa?
  | "CLASSIFIED"  // Etapa 4: ¿Cuál es la criticidad?
  | "DECIDED"     // Etapa 5: ¿Se resuelve o escala?
  | "EXECUTING"   // Etapa 6: ¿Quién hace qué?
  | "VERIFIED"    // Etapa 7: ¿Funcionó?
  | "CLOSED";     // Etapa 8: Cerrar o reescalar

export const DECISION_STAGE_LABELS: Record<DecisionStage, string> = {
  DETECTED:   "Detectado",
  VALIDATED:  "Validado",
  ORIENTED:   "Orientado",
  CLASSIFIED: "Clasificado",
  DECIDED:    "Decidido",
  EXECUTING:  "En ejecución",
  VERIFIED:   "Verificado",
  CLOSED:     "Cerrado",
};

// Orden numérico de etapas para validar transiciones
export const DECISION_STAGE_ORDER: Record<DecisionStage, number> = {
  DETECTED: 1, VALIDATED: 2, ORIENTED: 3, CLASSIFIED: 4,
  DECIDED: 5, EXECUTING: 6, VERIFIED: 7, CLOSED: 8,
};

export type Criticality = "CRITICA" | "ALTA" | "MEDIA" | "BAJA";

// GOBERNANZA: alcance del impacto del incidente
export type ImpactScope =
  | "LOCAL"     // Afecta 1 local de votación
  | "COMUNAL"   // Afecta varios locales o toda una comuna
  | "REGIONAL"  // Afecta el proceso en la región
  | "NACIONAL"; // Podría afectar la validez del proceso nacional

export const IMPACT_SCOPE_LABELS: Record<ImpactScope, string> = {
  LOCAL:    "Local — afecta 1 local de votación",
  COMUNAL:  "Comunal — afecta varios locales o una comuna",
  REGIONAL: "Regional — afecta el proceso en la región",
  NACIONAL: "Nacional — podría afectar el proceso nacional",
};

export const IMPACT_SCOPE_COLORS: Record<ImpactScope, string> = {
  LOCAL:    "#22c55e",
  COMUNAL:  "#eab308",
  REGIONAL: "#f97316",
  NACIONAL: "#ef4444",
};

// GOBERNANZA: responsable por nivel de mando
export type CommandLevel =
  | "LOCAL"    // PESE / Delegado del local
  | "REGIONAL" // Jefe Ops / Funcionario comisionado / Director Regional
  | "CENTRAL"; // Autoridades SERVEL central

export type CaseResponsible = {
  id: string;               // uuid
  level: CommandLevel;      // nivel de mando
  userId: string;           // id del responsable
  userName: string;         // nombre para trazabilidad
  role: string;             // rol en el momento de la asignación
  assignedAt: string;       // ISO timestamp
  assignedBy: string;       // quién asignó
  ackAt?: string | null;    // acuse de recibo
  status: "PENDIENTE" | "ACTIVO" | "DELEGADO" | "LIBERADO";
  notes?: string;           // ej. "comisionado al local LOC-005"
};

// GOBERNANZA: canal de reporte original
export type ReportChannel =
  | "SCCE"      // Registrado directamente en el sistema
  | "TELEFONO"  // Reportado por teléfono, registrado por funcionario DR
  | "WHATSAPP"  // Reportado por WhatsApp
  | "RADIO"     // Comunicación radial
  | "PRESENCIAL" // Reporte presencial
  | "OTRO";     // Otro medio

export const REPORT_CHANNEL_LABELS: Record<ReportChannel, string> = {
  SCCE:       "SCCE (sistema)",
  TELEFONO:   "Teléfono",
  WHATSAPP:   "WhatsApp",
  RADIO:      "Radio",
  PRESENCIAL: "Presencial",
  OTRO:       "Otro",
};

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
  /** Fase 3.5 — con copia (label para mostrar) */
  cc?: { label: string; userId?: string }[];
};

export type CaseItem = {
  id: string;
  region: string;
  regionCode?: string;
  commune: string;
  status: CaseStatus;
  criticality: Criticality;
  // FASE 0: etapa del flujo decisional C2
  decisionStage?: DecisionStage;
  // FASE 1: nivel de confianza del dato
  dataConfidence?: DataConfidence;
  // FASE 1: orientación (etapa 3 del flujo C2)
  orientation?: OrientationData;
  // GOBERNANZA: alcance del impacto
  impactScope?: ImpactScope;
  // GOBERNANZA: responsables por nivel de mando
  responsables?: CaseResponsible[];
  // GOBERNANZA: reportado por (puede diferir del registrado por)
  reportedBy?: string;        // nombre/id de quien detectó y reportó
  reportChannel?: ReportChannel; // canal por el que llegó el reporte
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

// ─── Configuración electoral ─────────────────────────────────────────────────
export type ElectionConfig = {
  name: string;
  date: string;
  year: number;
};

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
