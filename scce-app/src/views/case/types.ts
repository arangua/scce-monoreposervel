import type React from "react";
import type { CaseItem, InstructionItem } from "../../domain/types";

/**
 * Tipos públicos del feature caso.
 * Contratos para vistas inyectables (testables, sin acoplamiento a App).
 */
export type { CaseItem };

/** Parámetros para crear una instrucción (contrato del gate). */
export interface CreateInstructionParams {
  caseId: string;
  scope: string;
  audience: string;
  summary: string;
  details?: string;
  impactLevel: string;
  scopeFunctional: string;
  bypass?: { enabled: boolean; reason?: string };
  cc?: { label: string; role?: string; userId?: string }[];
}

/**
 * Contrato para la vista de detalle de caso.
 * La vista recibe este gate en lugar de cerrar sobre estado de App.
 */
export interface CaseDetailGate {
  setView: (view: string) => void;
  cases: CaseItem[];
  setCases: React.Dispatch<React.SetStateAction<CaseItem[]>>;
  setAuditLog: React.Dispatch<React.SetStateAction<unknown[]>>;
  auditLog: unknown[];
  localCatalog: unknown;
  currentUser: { id: string; name: string; role?: string } | null;
  uiMode: string;
  notify: (msg: string, type?: string) => void;
  exportCaseTXT: (c: CaseItem) => void;
  assignCaseResponsible: (caseId: string, userId: string) => void;
  changeStatus: (caseId: string, status: string) => void;
  canDo: (action: string, user: unknown, c?: CaseItem | null) => boolean;
  addAction: (caseId: string, action: string, responsible: string, result: string) => Promise<boolean>;
  addDecision: (caseId: string, fundament: string) => void;
  addComment: (caseId: string, text: string) => void;
  validateBypass: (caseId: string, decision: string, fundament: string) => void;
  addOperationalValidation: (caseId: string, result: string, note: string) => Promise<void>;
  requestReassessment: (caseId: string, newEval: Record<string, number>, justification: string) => void;
  ackInstruction: (caseId: string, instructionId: string) => void;
  closeInstruction: (caseId: string, instructionId: string) => void;
  addInstructionReply: (caseId: string, instructionId: string, replyText: string) => void;
  createInstruction: (params: CreateInstructionParams) => void;
  withBusy: (key: string, fn: () => void) => void;
  busyAction: Record<string, boolean>;
  chainResult: { ok: boolean; failIndex?: number };
  isNivelCentral: (userId: string) => boolean;
  normalizeStatus: (s: unknown) => string;
  critColor: (criticality: string) => string;
  statusColor: (status: string) => string;
  USERS: { id: string; name: string; region?: string }[];
  regionsMap: Record<string, { name?: string; communes?: Record<string, { name?: string }> }>;
  S: Record<string, unknown>;
  themeColor: (key: string) => string;
  ClosedOverlay: React.ComponentType;
  SlaBadge: React.ComponentType<{ c: CaseItem }>;
  RecBadge: React.ComponentType<{ c: CaseItem; variant?: string }>;
  isInstructionAckedByUser: (ins: InstructionItem, userId: string) => boolean;
  lastAck: (ins: InstructionItem) => { userId: string; role: string; at: string } | null;
  /** Solo contexto visual en SIMULACION: tipo de contexto, id y label del rol simulado. */
  contextType?: string;
  simulatedRoleId?: string;
  simulatedRoleLabel?: string;
}
