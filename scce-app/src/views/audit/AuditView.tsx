/**
 * Vista Auditoría — Cadena Hash. Recibe gate con datos y callbacks inyectados.
 */
import type React from "react";
import type { AuditGate } from "./types";

export interface AuditViewProps {
  gate: AuditGate;
}

export function AuditView({ gate }: AuditViewProps) {
  const {
    auditLog,
    chainResult,
    S,
    themeColor,
    fmtDate,
    USERS,
    UI_TEXT_GOVERNANCE,
    canDo,
    currentUser,
    exportAuditCSV,
    Badge,
    Tooltip,
  } = gate;
  const { ok, failIndex } = chainResult;

  const Sg = S as Record<string, (...args: unknown[]) => unknown> & Record<string, React.CSSProperties>;
  const btn = (variant: string) => (typeof Sg.btn === "function" ? Sg.btn(variant) : Sg.btn) as React.CSSProperties;
  const G = UI_TEXT_GOVERNANCE as Record<string, unknown> & {
    eventLabels?: Record<string, string>;
    institutionalRole?: Record<string, string>;
    auditSummaryFallback?: { default: string };
  };

  const typeColors: Record<string, string> = {
    CASE_CREATED: themeColor("success"),
    BYPASS_USED: themeColor("warning"),
    BYPASS_FLAGGED: themeColor("danger"),
    ESCALATED: themeColor("danger"),
    STATUS_CHANGED: themeColor("warningAlt"),
    ACTION_ADDED: themeColor("mutedAlt"),
    EXPORT_DONE: themeColor("purple"),
    LOCAL_CREATED: themeColor("success"),
    LOCAL_DEACTIVATED: themeColor("danger"),
    LOCAL_REACTIVATED: themeColor("warning"),
    LOCAL_ELECTION_TOGGLED: themeColor("purpleLight"),
    COMMENT_ADDED: themeColor("muted"),
    DECISION_ADDED: themeColor("primary"),
    ASSIGNED: themeColor("purpleLight"),
    OPERATIONAL_VALIDATION: themeColor("success"),
    LOGIN: themeColor("muted"),
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: "16px" }}>Auditoría — Cadena Hash</h2>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Tooltip
            content={
              ok ? "Cadena íntegra (hashes coinciden)" : "Cadena comprometida (revisar integridad desde el índice indicado)"
            }
          >
            <Badge
              style={{
                ...(typeof Sg.badge === "function"
                  ? (Sg.badge(ok ? themeColor("success") : themeColor("danger")) as React.CSSProperties)
                  : {}),
                cursor: "help",
              }}
              size="sm"
            >
              {ok ? `🔗 Íntegra (${auditLog.length} eventos)` : `⚠️ Comprometida en evento ${failIndex}`}
            </Badge>
          </Tooltip>
          {canDo("export", currentUser) && (
            <button style={btn("dark")} onClick={exportAuditCSV}>
              ⬇ CSV
            </button>
          )}
        </div>
      </div>
      <div style={Sg.card}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "110px 1fr 100px 110px 1fr 80px",
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
            const eventLabel = (G.eventLabels ?? {})[e.type] ?? e.type;
            const actorLabel =
              u?.name ??
              (e.role && (G.institutionalRole ?? {})[e.role]) ??
              (e.actor?.length > 20 ? "Usuario" : e.actor) ??
              "—";
            const summaryTrim = e.summary?.trim();
            const displaySummary =
              summaryTrim && !/^(OK|NUEVO|—|-)$/i.test(summaryTrim)
                ? e.summary
                : (G.eventLabels ?? {})[e.type] ?? G.auditSummaryFallback?.default ?? "";
            return (
              <div
                key={e.hash ?? `audit-global-${e.at}-${e.actor}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 1fr 100px 110px 1fr 80px",
                  gap: 4,
                  padding: "4px 0",
                  borderBottom: "1px solid #e5e7eb",
                  fontSize: "10px",
                  background: isFail ? themeColor("legacyRedBlock") : "transparent",
                }}
              >
                <span style={{ color: themeColor("mutedDark") }}>{fmtDate(e.at)}</span>
                <span style={{ color: typeColors[e.type] || themeColor("muted"), fontWeight: 600, minWidth: 0 }}>
                  {eventLabel}
                </span>
                <span
                  style={{
                    color: themeColor("muted"),
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {actorLabel}
                </span>
                <span
                  style={{
                    color: themeColor("mutedDark"),
                    fontFamily: "monospace",
                    fontSize: "9px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 110,
                  }}
                  title={e.caseId ?? ""}
                >
                  {e.caseId?.slice(-10) || "—"}
                </span>
                <span
                  style={{
                    color: themeColor("mutedAlt"),
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {displaySummary}
                </span>
                <span
                  style={{
                    color: isFail ? themeColor("danger") : themeColor("legacyGrayBorder"),
                    fontFamily: "monospace",
                    fontSize: "9px",
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
