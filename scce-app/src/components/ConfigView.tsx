/**
 * ConfigView.tsx
 * Vista de Configuración del sistema SCCE.
 * Extraída de App.tsx — R-4c refactor 2026-03-27.
 * Dependencias recibidas por props (sin closure sobre App state).
 */
import React, { useState } from "react";
import { themeColor } from "../theme";
import { appendEvent } from "../domain/audit";
import type { AuditLogEntry, LocalCatalog, ElectionConfig } from "../domain/types";
import type { PolicyUser } from "../domain/policyEngine";

export type { ElectionConfig }; // re-exportar para compatibilidad con imports existentes

const APP_VERSION = "1.9";
const MIN_ELECTION_YEAR = 2026;

export type ConfigViewProps = {
  electionConfig: ElectionConfig;
  setElectionConfig: React.Dispatch<React.SetStateAction<ElectionConfig>>;
  localCatalog: LocalCatalog;
  currentUser: PolicyUser | null;
  setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  notify: (msg: string, type?: string) => void;
  chainResult: { ok: boolean; failIndex: number };
  divergencias: { caseId: string }[];
  onReset: () => void;
};

const S = {
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "10px 12px",
  } as React.CSSProperties,
  g2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  } as React.CSSProperties,
  btn: (variant: string) =>
    ({
      padding: "6px 14px",
      borderRadius: 4,
      border: "none",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
      background:
        variant === "success" ? themeColor("success") :
        variant === "danger"  ? themeColor("danger") :
        "#374151",
      color: "#fff",
    }) as React.CSSProperties,
  inp: {
    width: "100%",
    padding: "6px 8px",
    borderRadius: 4,
    border: "1px solid #e5e7eb",
    fontSize: 12,
    boxSizing: "border-box" as const,
  } as React.CSSProperties,
  lbl: {
    display: "block",
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
    fontWeight: 600,
  } as React.CSSProperties,
};

export function ConfigView({
  electionConfig,
  setElectionConfig,
  localCatalog,
  currentUser,
  setAuditLog,
  notify,
  chainResult,
  divergencias,
  onReset,
}: ConfigViewProps) {
  const [draft, setDraft] = useState({ ...electionConfig });
  const [confirmYear, setConfirmYear] = useState(false);

  const yearChanged = draft.year !== electionConfig.year;
  const activeCatalogCount = localCatalog.filter((l) => (l as { activoEnEleccionActual?: boolean }).activoEnEleccionActual).length;

  function applyConfig() {
    if (!currentUser) return;
    if (yearChanged && !confirmYear)
      return notify("Confirma el cambio de año electoral", "error");
    setElectionConfig({
      ...draft,
      name: draft.name || `Elecciones Generales ${draft.year}`,
    });
    if (yearChanged) {
      setAuditLog((prev) =>
        appendEvent(
          prev,
          "ELECTION_YEAR_CHANGED",
          currentUser.id,
          currentUser.role,
          null,
          `Año: ${electionConfig.year} → ${draft.year}. Locales activos: ${activeCatalogCount}`
        )
      );
      notify(`Año actualizado a ${draft.year}. Revise activación de locales en Catálogo.`, "warning");
    } else {
      notify("Configuración guardada", "success");
    }
    setConfirmYear(false);
  }

  const systemInfo: [string, string][] = [
    ["Versión",           `SCCE v${APP_VERSION}`],
    ["Elección activa",   electionConfig.name],
    ["Año electoral",     String(electionConfig.year)],
    ["Locales en catálogo", String(localCatalog.length)],
    ["Activos en elección", String(activeCatalogCount)],
    ["Cadena auditoría",  chainResult.ok ? "ÍNTEGRA ✓" : "COMPROMETIDA ⚠️"],
    ["Divergencias activas", String(divergencias.length)],
  ];

  return (
    <div>
      <h2 style={{ margin: "0 0 12px", fontSize: "16px" }}>Configuración</h2>

      {/* Datos de la elección */}
      <div style={{ ...S.card, marginBottom: 10 }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 10 }}>
          DATOS DE LA ELECCIÓN
        </div>
        <div style={{ ...S.g2, marginBottom: 8 }}>
          <div>
            <label style={S.lbl}>Nombre del proceso</label>
            <input
              style={S.inp}
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label style={S.lbl}>Fecha</label>
            <input
              style={S.inp}
              type="date"
              value={draft.date}
              onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={S.lbl}>Año Electoral (≥{MIN_ELECTION_YEAR})</label>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
            <input
              style={{ ...S.inp, width: 100 }}
              type="number"
              min={MIN_ELECTION_YEAR}
              max={2099}
              value={draft.year}
              onChange={(e) => {
                const y = parseInt(e.target.value);
                if (y >= MIN_ELECTION_YEAR && y <= 2099) {
                  setDraft((p) => ({ ...p, year: y, name: `Elecciones Generales ${y}`, date: `${y}-11-15` }));
                  setConfirmYear(false);
                }
              }}
            />
            {yearChanged && (
              <div
                style={{
                  ...S.card,
                  background: themeColor("orangeBlock"),
                  border: "1px solid #f9731644",
                  padding: "8px 10px",
                  flex: 1,
                }}
              >
                <div style={{ color: themeColor("warning"), fontSize: "11px", fontWeight: 600, marginBottom: 4 }}>
                  ⚠️ Cambio: {electionConfig.year} → {draft.year}
                </div>
                <div style={{ color: themeColor("muted"), fontSize: "10px", marginBottom: 6 }}>
                  {activeCatalogCount} local(es) activos en elección actual. Snapshots existentes quedan intactos.
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={confirmYear}
                    onChange={(e) => setConfirmYear(e.target.checked)}
                  />
                  <span style={{ fontSize: "11px", color: themeColor("warning"), fontWeight: 600 }}>
                    Confirmo el cambio de año
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        <button style={S.btn("success")} onClick={applyConfig}>
          Guardar configuración
        </button>
      </div>

      {/* Información del sistema */}
      <div style={{ ...S.card, marginBottom: 10 }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>
          INFORMACIÓN DEL SISTEMA
        </div>
        <div style={{ fontSize: "12px", color: themeColor("muted") }}>
          {systemInfo.map(([l, v]) => (
            <div key={l} style={{ marginBottom: 3 }}>
              <span style={{ color: themeColor("mutedDark") }}>{l}:</span>{" "}
              <span style={{ color: themeColor("mutedAlt") }}>{v}</span>
            </div>
          ))}
          <div style={{ marginTop: 6, color: themeColor("mutedDarker"), fontSize: "10px" }}>
            Sin backend · Sin BD · Auditoría append-only · Snapshots v1.9
          </div>
        </div>
      </div>

      {/* Reset */}
      <div id="config-reset" style={{ ...S.card, scrollMarginTop: 80 }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>
          RESETEAR SISTEMA
        </div>
        <div style={{ color: themeColor("muted"), fontSize: "11px", marginBottom: 6 }}>
          Restaura datos de demostración. No reversible.
        </div>
        <button
          style={S.btn("danger")}
          onClick={() => {
            if (window.confirm("¿Resetear todo el sistema?")) onReset();
          }}
        >
          Reset Demo
        </button>
      </div>
    </div>
  );
}
