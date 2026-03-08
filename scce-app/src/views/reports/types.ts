import type React from "react";
import type { CaseItem, Criticality } from "../../domain/types";

export interface ReportsDivergencia {
  caseId: string;
  caseSummary: string;
  div?: { msg: string } | null;
}

export interface ReportsGate {
  cases: CaseItem[];
  divergencias: ReportsDivergencia[];
  S: Record<string, unknown>;
  themeColor: (key: string) => string;
  critColor: (c: Criticality) => string;
  timeDiff: (a: string, b: string) => number | null;
  isSlaVencido: (c: CaseItem) => boolean;
  /** Ref para input file JSON (respaldo) */
  importJsonInputRef: React.RefObject<HTMLInputElement | null>;
  /** Ref para input file import estado */
  importFileRef: React.RefObject<HTMLInputElement | null>;
  importJSONSelected: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportStateFile: (file: File) => void;
  canDo: (action: string, user: unknown, c?: CaseItem | null) => boolean;
  currentUser: { id: string; name: string; role?: string } | null;
  exportCSV: () => void;
  exportJSON: () => void;
  importJSONClick: () => void;
  exportAuditCSV: () => void;
}
