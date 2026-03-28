/**
 * AuditView.tsx
 * Vista de Auditoría — Cadena Hash.
 * Extraída de App.tsx — R-4a refactor 2026-03-27.
 * Dependencias recibidas por props (sin closure sobre App state).
 */
import React from "react";
import { themeColor } from "../theme";
import { Badge } from "../ui/Badge";
import { Tooltip } from "../ui/Tooltip";
import { fmtDate } from "../domain/date";
import { USERS, canDo, type PolicyUser } from "../domain/policyEngine";
import { appendEvent } from "../domain/audit";
import type { AuditLogEntry } from "../domain/types";

export type AuditViewProps = {
  auditLog: AuditLogEntry[];
  setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  chainResult: { ok: boolean; failIndex: number };
  currentUser: PolicyUser | null;
  notify: (msg: string, type?: string) => void;
};

const S = {
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "10px 12px",
  } as React.CSSProperties,
  badge: (color: string) =>
    ({
      background: color,
      color: "#fff",
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: 10,
      fontWeight: 700,
    }) as React.CSSProperties,
  btn: (_variant: string) =>
    ({
      padding: "6px 14px",
      borderRadius: 4,
      border: "none",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
      background: "#374151",
      color: "#fff",
    }) as React.CSSProperties,
};

export function AuditView({
  auditLog,
  setAuditLog,
  chainResult,
  currentUser,
  notify,
}: AuditViewProps) {
  const { ok, failIndex } = chainResult;

  function exportAuditCSV() {
    if (!currentUser) return;
    const rows = [["EventID", "Tipo", "Timestamp", "Actor", "Rol", "CaseID", "Resumen", "Hash", "Verificacion"]];
    auditLog.forEach((e, i) => {
      const u = USERS.find((u) => u.id === e.actor);
      rows.push([
        e.eventId,
        e.type,
        e.at,
        u?.name || e.actor,
        e.role,
        e.caseId || "",
        e.summary,
        e.hash,
        !ok && i === failIndex ? "FALLA" : "OK",
      ]);
    });
    const csv = rows
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "SCCE_auditoria.csv";
    a.click();
    setAuditLog((prev) =>
      appendEvent(prev, "EXPORT_DONE", currentUser.id, currentUser.role, null, "Export CSV auditoría")
    );
    notify("Auditoría exportada");
  }

  const TYPE_COLORS: Record<string, string> = {
    CASE_CREATED:           themeColor("success"),
    BYPASS_USED:            themeColor("warning"),
    BYPASS_FLAGGED:         themeColor("danger"),
    ESCALATED:              themeColor("danger"),
    STATUS_CHANGED:         themeColor("warningAlt"),
    ACTION_ADDED:           themeColor("mutedAlt"),
    EXPORT_DONE:            themeColor("purple"),
    LOCAL_CREATED:          themeColor("success"),
    LOCAL_DEACTIVATED:      themeColor("danger"),
    LOCAL_REACTIVATED:      themeColor("warning"),
    LOCAL_ELECTION_TOGGLED: themeColor("purpleLight"),
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: "16px" }}>Auditoría — Cadena Hash</h2>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Tooltip
            content={
              ok
                ? "Cadena íntegra (hashes coinciden)"
                : "Cadena comprometida (revisar integridad desde el índice indicado)"
            }
          >
            <Badge
              style={S.badge(ok ? themeColor("success") : themeColor("danger"))}
              size="sm"
            >
              {ok
                ? `🔗 Íntegra (${auditLog.length} eventos)`
                : `⚠️ Comprometida en evento ${failIndex}`}
            </Badge>
          </Tooltip>
          {canDo("export", currentUser) && (
            <button style={S.btn("dark")} onClick={exportAuditCSV}>
              ⬇ CSV
            </button>
          )}
        </div>
      </div>

      <div style={S.card}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "110px 150px 100px 100px 1fr 80px",
            gap: 4,
            padding: "4px 0",
            borderBottom: "1px solid #e5e7eb",
            fontSize: "10px",
            color: themeColor("mutedDark"),
            fontWeight: 700,
          }}
        >
          <span>TIMESTAMP</span>
          <span>TIPO</span>
          <span>ACTOR</span>
          <span>CASO</span>
          <span>RESUMEN</span>
          <span>HASH</span>
        </div>

        <div style={{ maxHeight: 500, overflowY: "auto" }}>
          {[...auditLog].reverse().map((e, i) => {
            const u = USERS.find((u) => u.id === e.actor);
            const realIdx = auditLog.length - 1 - i;
            const isFail = !ok && realIdx === failIndex;

            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 150px 100px 100px 1fr 80px",
                  gap: 4,
                  padding: "4px 0",
                  borderBottom: "1px solid #e5e7eb",
                  fontSize: "10px",
                  background: isFail ? themeColor("legacyRedBlock") : "transparent",
                }}
              >
                <span style={{ color: themeColor("mutedDark") }}>{fmtDate(e.at)}</span>
                <span style={{ color: TYPE_COLORS[e.type] || themeColor("muted"), fontWeight: 600 }}>
                  {e.type}
                </span>
                <span style={{ color: themeColor("muted") }}>{u?.name || e.actor}</span>
                <span style={{ color: themeColor("mutedDark"), fontFamily: "monospace" }}>
                  {e.caseId?.slice(-10) || "—"}
                </span>
                <span style={{ color: themeColor("mutedAlt") }}>{e.summary}</span>
                <span
                  style={{
                    color: isFail ? themeColor("danger") : themeColor("legacyGrayBorder"),
                    fontFamily: "monospace",
                  }}
                >
                  {e.hash}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
