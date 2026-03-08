import type React from "react";
import type { CaseItem } from "../../domain/types";

export interface DashboardMetrics {
  total: number;
  open: number;
  critica: number;
  alta: number;
  slaVencido: number;
  flagged: number;
}

export interface DashboardDivergencia {
  caseId: string;
  caseSummary: string;
  div?: { msg: string } | null;
}

export interface DashboardFilterState {
  region: string;
  commune: string;
  criticality: string;
  status: string;
  search: string;
}

export interface DashboardGate {
  setView: (v: string) => void;
  setSelectedCase: (c: CaseItem | null) => void;
  cases: CaseItem[];
  visibleCases: CaseItem[];
  metrics: DashboardMetrics;
  divergencias: DashboardDivergencia[];
  S: Record<string, unknown>;
  themeColor: (key: string) => string;
  crisisMode: boolean;
  setCrisisMode: React.Dispatch<React.SetStateAction<boolean>>;
  filterState: DashboardFilterState;
  setFilterState: React.Dispatch<React.SetStateAction<DashboardFilterState>>;
  regionOptions: { code: string; name: string }[];
  isCentral: boolean;
  regionEffective: string;
  activeRegion: string;
  fixedLocalRole: boolean;
  assignedCommuneEffective: string;
  assignedLocal: { nombre: string; idLocal?: string } | null;
  assignedLocalIdEffective: string;
  regionsMap: Record<string, { name?: string; communes?: Record<string, { name?: string }> }>;
  normalizeStatus: (s: unknown) => string;
  statusColor: (s: string) => string;
  critColor: (criticality: string) => string;
  isSlaVencido: (c: CaseItem) => boolean;
  currentUser: { id: string; name: string; role?: string } | null;
  canDo: (action: string, user: unknown, c?: CaseItem | null) => boolean;
  changeStatus: (caseId: string, status: string) => void;
  RecBadge: React.ComponentType<{ c: CaseItem; variant?: string }>;
  recepcionar: (caseId: string) => void;
  checkLocalDivergence: (c: CaseItem, catalog: unknown) => { msg: string } | null;
  localCatalog: unknown;
  fmtDate: (iso: string | null | undefined) => string;
  UI_TEXT: Record<string, unknown>;
  UI_TEXT_GOVERNANCE: Record<string, unknown>;
  Badge: React.ComponentType<{ style?: React.CSSProperties; size?: string; onClick?: () => void; children: React.ReactNode }>;
  Tooltip: React.ComponentType<{ placement?: string; maxWidth?: number; panelStyle?: React.CSSProperties; content: React.ReactNode; children: React.ReactNode }>;
  SlaBadge: React.ComponentType<{ c: CaseItem }>;
  IconButton: React.ComponentType<{ onClick: () => void; title?: string; children: React.ReactNode }>;
}
