/**
 * Vista Configuración. Recibe gate con datos y callbacks inyectados.
 */
import { useState } from "react";
import type React from "react";
import type { ConfigGate, ElectionConfigShape } from "./types";

export interface ConfigViewProps {
  gate: ConfigGate;
}

export function ConfigView({ gate }: ConfigViewProps) {
  const {
    electionConfig,
    applyConfig,
    localCatalog,
    chainResult,
    divergencias,
    APP_VERSION,
    MIN_ELECTION_YEAR,
    doReset,
    S,
    themeColor,
  } = gate;

  const [draft, setDraft] = useState<ElectionConfigShape>({ ...electionConfig });
  const [confirmYear, setConfirmYear] = useState(false);

  const yearChanged = draft.year !== electionConfig.year;
  const activeCatalogCount = localCatalog.filter((l) => l.activoEnEleccionActual).length;

  const handleApply = () => {
    applyConfig(draft, confirmYear);
    setConfirmYear(false);
  };

  const Sg = S as Record<string, (...args: unknown[]) => unknown> & Record<string, React.CSSProperties>;
  const btn = (variant: string) => (typeof Sg.btn === "function" ? Sg.btn(variant) : Sg.btn) as React.CSSProperties;
  const lbl = Sg.lbl as React.CSSProperties;
  const inp = Sg.inp as React.CSSProperties;

  const infoRows: [string, string | number][] = [
    ["Versión", `SCCE v${APP_VERSION}`],
    ["Elección activa", electionConfig.name],
    ["Año electoral", electionConfig.year],
    ["Locales en catálogo", localCatalog.length],
    ["Activos en elección", activeCatalogCount],
    ["Cadena auditoría", chainResult.ok ? "ÍNTEGRA ✓" : "COMPROMETIDA ⚠️"],
    ["Divergencias activas", divergencias.length],
  ];

  return (
    <div>
      <h2 style={{ margin: "0 0 12px", fontSize: "16px" }}>Configuración</h2>
      <div style={{ ...Sg.card, marginBottom: 10 }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 10 }}>
          DATOS DE LA ELECCIÓN
        </div>
        <div style={{ ...Sg.g2, marginBottom: 8 }}>
          <div>
            <label style={lbl} htmlFor="election-name">
              Nombre del proceso
            </label>
            <input
              id="election-name"
              style={inp}
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label style={lbl} htmlFor="election-date">
              Fecha
            </label>
            <input
              id="election-date"
              style={inp}
              type="date"
              value={draft.date}
              onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))}
            />
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl} htmlFor="election-year">
            Año Electoral (≥{MIN_ELECTION_YEAR})
          </label>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
            <input
              id="election-year"
              style={{ ...inp, width: 100 }}
              type="number"
              min={MIN_ELECTION_YEAR}
              max={2099}
              value={draft.year}
              onChange={(e) => {
                const y = Number.parseInt(e.target.value, 10);
                if (y >= MIN_ELECTION_YEAR && y <= 2099) {
                  setDraft((p) => ({ ...p, year: y, name: `Elecciones Generales ${y}`, date: `${y}-11-15` }));
                  setConfirmYear(false);
                }
              }}
            />
            {yearChanged && (
              <div
                style={{
                  ...Sg.card,
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
                <label
                  style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                  htmlFor="election-confirm-year"
                >
                  <input
                    id="election-confirm-year"
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
        <button style={btn("success")} onClick={handleApply}>
          Guardar configuración
        </button>
      </div>
      <div style={{ ...Sg.card, marginBottom: 10 }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>
          INFORMACIÓN DEL SISTEMA
        </div>
        <div style={{ fontSize: "12px", color: themeColor("muted") }}>
          {infoRows.map(([l, v]) => (
            <div key={l} style={{ marginBottom: 3 }}>
              <span style={{ color: themeColor("mutedDark") }}>{l}:</span>{" "}
              <span style={{ color: themeColor("mutedAlt") }}>{String(v)}</span>
            </div>
          ))}
          <div style={{ marginTop: 6, color: themeColor("mutedDarker"), fontSize: "10px" }}>
            Sin backend · Sin BD · Auditoría append-only · Snapshots v1.9
          </div>
        </div>
      </div>
      <div id="config-reset" style={{ ...Sg.card, scrollMarginTop: 80 }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>
          RESETEAR SISTEMA
        </div>
        <div style={{ color: themeColor("muted"), fontSize: "11px", marginBottom: 6 }}>
          Restaura datos de demostración. No reversible.
        </div>
        <button
          style={btn("danger")}
          onClick={() => {
            if (globalThis.confirm("¿Resetear todo el sistema?")) doReset();
          }}
        >
          Reset Demo
        </button>
      </div>
    </div>
  );
}
