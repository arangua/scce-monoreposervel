import type React from "react";
import type { LocalCatalog, LocalCatalogEntry } from "../../domain/types";

export interface CatalogDivergencia {
  caseId: string;
  caseSummary: string;
  div?: { msg: string } | null;
}

export interface CatalogGate {
  activeRegion: string;
  regionOptions: { code: string; name: string }[];
  regionsMap: Record<string, { name?: string; communes?: Record<string, { name?: string }> }>;
  localCatalog: LocalCatalog;
  divergencias: CatalogDivergencia[];
  cases: { id?: string; localSnapshot?: { idLocal: string } | null }[];
  S: Record<string, unknown>;
  themeColor: (key: string) => string;
  catalogSelfCheck: (catalog: LocalCatalog) => string[];
  currentUser: { id: string; name: string; role?: string } | null;
  catalogAddLocal: (nombre: string, region: string, commune: string, actor: { id: string; name: string; role?: string }) => void;
  catalogToggleEleccion: (idLocal: string, actor: { id: string; name: string; role?: string }) => void;
  catalogDeactivate: (idLocal: string, actor: { id: string; name: string; role?: string }) => void;
  catalogReactivate: (idLocal: string, actor: { id: string; name: string; role?: string }) => void;
  auditLog: { type?: string; at?: string; actor?: string; role?: string; hash?: string; summary?: string }[];
  USERS: { id: string; name: string }[];
  fmtDate: (iso: string | null | undefined) => string;
  UI_TEXT_GOVERNANCE: Record<string, unknown>;
  Badge: React.ComponentType<{ style?: React.CSSProperties; size?: string; children: React.ReactNode }>;
}

export type { LocalCatalogEntry };
