/**
 * Vista Respaldos y reportes. Recibe gate con datos y callbacks inyectados.
 */
import type React from "react";
import type { Criticality } from "../../domain/types";
import type { ReportsGate } from "./types";

export interface ReportsViewProps {
  gate: ReportsGate;
}

export function ReportsView({ gate }: ReportsViewProps) {
  const {
    cases,
    divergencias,
    S,
    themeColor,
    critColor,
    timeDiff,
    isSlaVencido,
    importJsonInputRef,
    importFileRef,
    importJSONSelected,
    onImportStateFile,
    canDo,
    currentUser,
    exportCSV,
    exportJSON,
    importJSONClick,
    exportAuditCSV,
  } = gate;

  const avgAct = cases
    .filter((c) => c.reportedAt && c.origin?.detectedAt)
    .map((c) => timeDiff(c.origin!.detectedAt, c.reportedAt!))
    .filter((v): v is number => v != null);
  const avgAcc = cases
    .filter((c) => c.firstActionAt && c.reportedAt)
    .map((c) => timeDiff(c.reportedAt!, c.firstActionAt!))
    .filter((v): v is number => v != null);
  const metricas = [
    ["T. prom. activación", avgAct.length ? Math.round(avgAct.reduce((a, b) => a + b, 0) / avgAct.length) : null, "min"],
    ["T. prom. 1ª acción", avgAcc.length ? Math.round(avgAcc.reduce((a, b) => a + b, 0) / avgAcc.length) : null, "min"],
    ["SLA vencidos", cases.filter((c) => isSlaVencido(c)).length, "casos"],
    ["Completitud promedio", cases.length ? Math.round(cases.reduce((s, c) => s + (c.completeness ?? 0), 0) / cases.length) : 0, "%"],
    ["Divergencias activas", divergencias.length, "casos"],
  ];

  const Sg = S as Record<string, (...args: unknown[]) => unknown> & Record<string, React.CSSProperties>;
  const btn = (variant: string) => (typeof Sg.btn === "function" ? Sg.btn(variant) : Sg.btn) as React.CSSProperties;

  return (
    <div>
      <h2 style={{ margin: "0 0 12px", fontSize: "16px" }}>Respaldos y reportes</h2>
      <div style={{ ...Sg.g4, marginBottom: 10 }}>
        {[
          { l: "Total casos", v: cases.length, c: themeColor("primary") },
          { l: "Críticos", v: cases.filter((c) => c.criticality === "CRITICA").length, c: themeColor("danger") },
          { l: "Bypass Flagged", v: cases.filter((c) => c.bypassFlagged && !c.bypassValidated).length, c: themeColor("warning") },
          { l: "Con Snapshot", v: cases.filter((c) => c.localSnapshot).length, c: themeColor("purple") },
        ].map((k) => (
          <div key={k.l} style={Sg.card}>
            <div style={{ color: k.c, fontSize: "22px", fontWeight: 700 }}>{k.v}</div>
            <div style={{ color: themeColor("muted"), fontSize: "11px" }}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={{ ...Sg.g2, marginBottom: 10 }}>
        <div style={Sg.card}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>MÉTRICAS</div>
          {metricas.map(([l, v, u]) => (
            <div key={String(l)} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: "12px" }}>
              <span style={{ color: themeColor("muted") }}>{l}</span>
              <span style={{ color: v != null ? themeColor("legacySlate") : themeColor("mutedDark"), fontWeight: 600 }}>
                {v != null ? `${v} ${u}` : "—"}
              </span>
            </div>
          ))}
        </div>
        <div style={Sg.card}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>CRITICIDAD</div>
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
      <div id="reports-export" style={{ ...Sg.card, marginBottom: 10, scrollMarginTop: 80 }}>
        <div style={{ color: themeColor("muted"), fontSize: "11px", fontWeight: 700, marginBottom: 8 }}>RESPALDOS</div>
        <input
          ref={importJsonInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={(e) => importJSONSelected(e)}
        />
        <input
          ref={importFileRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.currentTarget.value = "";
            if (f) onImportStateFile(f);
          }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {canDo("export", currentUser) && (
            <button style={btn("primary")} onClick={exportCSV}>
              📊 Excel — Lista de casos
            </button>
          )}
          {canDo("export", currentUser) && (
            <button style={btn("primary")} onClick={exportJSON}>
              📦 Respaldo completo
            </button>
          )}
          <span id="reports-import">
            {canDo("export", currentUser) && (
              <button style={btn("primary")} onClick={importJSONClick}>
                ⬆️ Cargar respaldo
              </button>
            )}
          </span>
          {canDo("export", currentUser) && (
            <button style={btn("dark")} onClick={exportAuditCSV}>
              📑 Excel — Historial
            </button>
          )}
        </div>
        <div style={{ fontSize: "11px", color: themeColor("muted"), marginTop: 8 }}>
          Puedes descargar un respaldo del sistema o cargar uno oficial cuando sea necesario.
        </div>
      </div>
      {divergencias.length > 0 && (
        <div style={{ ...Sg.card, border: "1px solid #f9731644" }}>
          <div style={{ color: themeColor("warning"), fontWeight: 700, fontSize: "12px", marginBottom: 8 }}>
            ⚡ Divergencias catálogo activas ({divergencias.length})
          </div>
          {divergencias.map((x) => (
            <div
              key={x.caseId}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 4,
                fontSize: "11px",
                padding: "4px 0",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <span style={{ fontFamily: "monospace", color: themeColor("muted"), flexShrink: 0 }}>{x.caseId}</span>
              <span style={{ color: themeColor("mutedAlt"), flex: 1 }}>{x.caseSummary.slice(0, 50)}</span>
              <span style={{ color: themeColor("warning") }}>{x.div?.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
