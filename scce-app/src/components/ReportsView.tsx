/**
 * components/ReportsView.tsx
 * Vista de Respaldos y Reportes — extraida de App.tsx (R-4, 2026-03-27).
 *
 * Solo lee estado del store. Callbacks de export/import recibidos como props
 * porque esas funciones siguen en App (contienen logica de validacion pesada
 * y usaran los refs de input de archivo).
 */
import React, { useMemo } from "react";
import type { Criticality } from "../domain/types";
import { critColor } from "../domain/caseUtils";
import { timeDiff } from "../domain/date";
import { isSlaVencido } from "../domain/caseSla";
import { checkLocalDivergence } from "../domain/localDivergence";
import { canDo } from "../domain/policyEngine";
import { themeColor } from "../theme";
import { useAppStore } from "../store/useAppStore";

export interface ReportsViewProps {
  onExportCSV: () => void;
  onExportJSON: () => void;
  onExportAuditCSV: () => void;
  onImportJSONClick: () => void;
  /** ref for hidden file input — rendered here so it stays inside the view */
  importJSONInputSlot: React.ReactNode;
  /** ref for state-file input */
  importFileSlot: React.ReactNode;
}

const S = {
  card: {
    background: themeColor("bgSurface"),
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "12px",
  } as React.CSSProperties,
  btn: (v = "primary") =>
    ({
      background:
        ({
          primary: themeColor("primary"),
          success: themeColor("success"),
          danger: themeColor("danger"),
          warning: themeColor("warning"),
          dark: themeColor("textSecondary"),
        } as Record<string, string>)[v] || themeColor("primary"),
      color: themeColor("white"),
      border: "none",
      padding: "6px 12px",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: 500,
    }) as React.CSSProperties,
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } as React.CSSProperties,
  g4: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" } as React.CSSProperties,
};

export function ReportsView({
  onExportCSV,
  onExportJSON,
  onExportAuditCSV,
  onImportJSONClick,
  importJSONInputSlot,
  importFileSlot,
}: ReportsViewProps) {
  const { cases, localCatalog, currentUser } = useAppStore();

  const divergencias = useMemo(
    () =>
      cases
        .filter((c) => !["Resuelto", "Cerrado"].includes(c.status))
        .map((c) => ({ caseId: c.id, caseSummary: c.summary, div: checkLocalDivergence(c, localCatalog) }))
        .filter((x) => x.div !== null),
    [cases, localCatalog]
  );

  const avgAct = cases
    .filter((c) => c.reportedAt && c.origin?.detectedAt)
    .map((c) => timeDiff(c.origin!.detectedAt, c.reportedAt!))
    .filter((v): v is number => v != null);

  const avgAcc = cases
    .filter((c) => c.firstActionAt && c.reportedAt)
    .map((c) => timeDiff(c.reportedAt, c.firstActionAt))
    .filter((v): v is number => v != null);

  const metricas: [string, number | null, string][] = [
    ["T. prom. activacion", avgAct.length ? Math.round(avgAct.reduce((a, b) => a + b, 0) / avgAct.length) : null, "min"],
    ["T. prom. 1a accion", avgAcc.length ? Math.round(avgAcc.reduce((a, b) => a + b, 0) / avgAcc.length) : null, "min"],
    ["SLA vencidos", cases.filter((c) => isSlaVencido(c)).length, "casos"],
    ["Completitud promedio", cases.length ? Math.round(cases.reduce((s, c) => s + (c.completeness ?? 0), 0) / cases.length) : 0, "%"],
    ["Divergencias activas", divergencias.length, "casos"],
  ];

  return (
    <div>
      <h2 style={{ margin: "0 0 12px", fontSize: "16px" }}>Respaldos y reportes</h2>

      {/* KPIs */}
      <div style={{ ...S.g4, marginBottom: 10 }}>
        {[
          { l: "Total casos", v: cases.length, c: themeColor("primary") },
          { l: "Criticos", v: cases.filter((c) => c.criticality === "CRITICA").length, c: themeColor("danger") },
          { l: "Bypass Flagged", v: cases.filter((c) => c.bypassFlagged && !c.bypassValidated).length, c: themeColor("warning") },
          { l: "Con Snapshot", v: cases.filter((c) => c.localSnapshot).length, c: themeColor("purple") },
        ].map((k) => (
          <div key={k.l} style={S.card}>
            <div style={{ color: k.c, fontSize: "22px", fontWeight: 700 }}>{k.v}</div>
            <div style={{ color: themeColor("muted"), fontSize: "11px" }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Metricas + Criticidad */}
      <div style={{ ...S.g2, marginBottom: 10 }}>
        <div style={S.card}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>
            METRICAS
          </div>
          {metricas.map(([l, v, u]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "12px" }}>
              <span style={{ color: themeColor("muted") }}>{l}</span>
              <span style={{ color: v != null ? themeColor("legacySlate") : themeColor("mutedDark"), fontWeight: 600 }}>
                {v != null ? `${v} ${u}` : "—"}
              </span>
            </div>
          ))}
        </div>
        <div style={S.card}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>
            CRITICIDAD
          </div>
          {(["CRITICA", "ALTA", "MEDIA", "BAJA"] as Criticality[]).map((cr) => {
            const n = cases.filter((c) => c.criticality === cr).length;
            return (
              <div key={cr} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: 2 }}>
                  <span style={{ color: critColor(cr) }}>{cr}</span>
                  <span style={{ color: themeColor("mutedAlt") }}>{n}</span>
                </div>
                <div style={{ height: 4, background: themeColor("legacyDark3"), borderRadius: 2 }}>
                  <div
                    style={{
                      height: "100%",
                      width: cases.length ? `${(n / cases.length) * 100}%` : "0%",
                      background: critColor(cr),
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Respaldos */}
      <div id="reports-export" style={{ ...S.card, marginBottom: 10, scrollMarginTop: 80 }}>
        <div style={{ color: themeColor("muted"), fontSize: "11px", fontWeight: 700, marginBottom: 8 }}>
          RESPALDOS
        </div>
        {/* hidden file inputs pasados como slots */}
        {importJSONInputSlot}
        {importFileSlot}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {canDo("export", currentUser) && (
            <button style={S.btn("primary")} onClick={onExportCSV}>
              Excel — Lista de casos
            </button>
          )}
          {canDo("export", currentUser) && (
            <button style={S.btn("primary")} onClick={onExportJSON}>
              Respaldo completo
            </button>
          )}
          <span id="reports-import">
            {canDo("export", currentUser) && (
              <button style={S.btn("primary")} onClick={onImportJSONClick}>
                Cargar respaldo
              </button>
            )}
          </span>
          {canDo("export", currentUser) && (
            <button style={S.btn("dark")} onClick={onExportAuditCSV}>
              Excel — Historial
            </button>
          )}
        </div>
        <div style={{ fontSize: "11px", color: themeColor("muted"), marginTop: 8 }}>
          Puedes descargar un respaldo del sistema o cargar uno oficial cuando sea necesario.
        </div>
      </div>

      {/* Divergencias activas */}
      {divergencias.length > 0 && (
        <div style={{ ...S.card, border: "1px solid #f9731644" }}>
          <div style={{ color: themeColor("warning"), fontWeight: 700, fontSize: "12px", marginBottom: 8 }}>
            Divergencias catalogo activas ({divergencias.length})
          </div>
          {divergencias.map((x) => (
            <div
              key={x.caseId}
              style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, fontSize: "11px", padding: "4px 0", borderBottom: "1px solid #e5e7eb" }}
            >
              <span style={{ fontFamily: "monospace", color: themeColor("muted"), flexShrink: 0 }}>
                {x.caseId}
              </span>
              <span style={{ color: themeColor("mutedAlt"), flex: 1 }}>{x.caseSummary.slice(0, 50)}</span>
              <span style={{ color: themeColor("warning") }}>{x.div?.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
