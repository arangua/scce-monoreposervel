import type React from "react";
import type { AuditLogEntry, CaseItem } from "../../domain/types";

export interface AuditGate {
  auditLog: AuditLogEntry[];
  chainResult: { ok: boolean; failIndex: number };
  S: Record<string, unknown>;
  themeColor: (key: string) => string;
  fmtDate: (iso: string | null | undefined) => string;
  USERS: { id: string; name: string; role?: string }[];
  UI_TEXT_GOVERNANCE: Record<string, unknown>;
  canDo: (action: string, user: unknown, c?: CaseItem | null) => boolean;
  currentUser: { id: string; name: string; role?: string } | null;
  exportAuditCSV: () => void;
  Badge: React.ComponentType<Record<string, unknown>>;
  Tooltip: React.ComponentType<Record<string, unknown>>;
}
