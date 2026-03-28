/**
 * ConfigView.tsx
 * Vista de Configuración del sistema SCCE.
 * Extraída de App.tsx — R-4c refactor 2026-03-27.
 * Dependencias recibidas por props (sin closure sobre App state).
 */
import React, { useState, useRef } from "react";
import { themeColor } from "../theme";
import { appendEvent } from "../domain/audit";
import type { AuditLogEntry, LocalCatalog, ElectionConfig } from "../domain/types";
import type { PolicyUser } from "../domain/policyEngine";
import { importarLocalesDesdeExcel, type ExcelRow } from "../domain/catalog";
import { importCatalogToApi } from "../hooks/useCatalogApi";
import { getToken, getActiveMembership } from "../domain/authSession";

export type { ElectionConfig }; // re-exportar para compatibilidad con imports existentes

const APP_VERSION = "1.9";
const MIN_ELECTION_YEAR = 2026;

export type ConfigViewProps = {
  electionConfig: ElectionConfig;
  setElectionConfig: React.Dispatch<React.SetStateAction<ElectionConfig>>;
  localCatalog: LocalCatalog;
  setLocalCatalog: React.Dispatch<React.SetStateAction<LocalCatalog>>;
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
  setLocalCatalog,
  currentUser,
  setAuditLog,
  notify,
  chainResult,
  divergencias,
  onReset,
}: ConfigViewProps) {
  const [draft, setDraft] = useState({ ...electionConfig });
  const [confirmYear, setConfirmYear] = useState(false);

  // ── Cargador de locales Excel ──────────────────────────────────────
  const fileRefEleccion   = useRef<HTMLInputElement>(null);
  const fileRefSimulacion = useRef<HTMLInputElement>(null);
  type ImportState = {
    loading: boolean;
    resultado: { totalImportados: number; totalDescartados: number; errores: string[]; advertencias: string[] } | null;
  };
  const [importEleccion,   setImportEleccion]   = useState<ImportState>({ loading: false, resultado: null });
  const [importSimulacion, setImportSimulacion] = useState<ImportState>({ loading: false, resultado: null });

  async function procesarExcel(
    file: File,
    modo: "eleccion" | "simulacion",
    setEstado: React.Dispatch<React.SetStateAction<ImportState>>
  ) {
    setEstado({ loading: true, resultado: null });
    try {
      // 1. Leer y parsear Excel con SheetJS
      const XLSX = await import("https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs");
      const buffer = await file.arrayBuffer();
      const wb     = XLSX.read(buffer, { type: "array" });
      const ws     = wb.Sheets[wb.SheetNames[0]];
      const filas  = XLSX.utils.sheet_to_json(ws, { defval: "" }) as ExcelRow[];

      // 2. Validar contra DPA oficial
      const resultado = importarLocalesDesdeExcel(filas, modo);
      if (resultado.errores.length > 0) {
        setEstado({ loading: false, resultado });
        return;
      }

      // 3. Persistir en la API si hay sesión activa
      const tieneSession = !!getToken() && !!getActiveMembership();
      if (tieneSession) {
        const itemsApi = resultado.catalog.map(l => ({
          regionCode:  l.region,
          communeCode: l.commune,
          nombre:      l.nombre,
          direccion:   (l as { direccion?: string }).direccion,
          mesas:       (l as { mesas?: number }).mesas,
        }));
        const apiRes = await importCatalogToApi(itemsApi, modo);
        if (!apiRes) {
          // API falló — advertir pero continuar con localStorage
          notify("⚠️ No se pudo persistir en el servidor. El catálogo se guardó localmente.", "warning");
        }
      }

      // 4. Actualizar estado local (y localStorage via useEffect en AppContext)
      setLocalCatalog(prev => {
        if (modo === "eleccion") {
          const simLocales = prev.filter(l => !l.activoEnEleccionActual);
          return [...simLocales, ...resultado.catalog];
        } else {
          const elecLocales = prev.filter(l => l.activoEnEleccionActual);
          return [...elecLocales, ...resultado.catalog];
        }
      });

      if (currentUser) {
        setAuditLog(prev => appendEvent(
          prev, "CATALOG_IMPORTED",
          currentUser.id, currentUser.role, null,
          `Catálogo ${modo}: ${resultado.totalImportados} locales desde ${file.name}${
            tieneSession ? " [API+local]" : " [local]"
          }`
        ));
      }

      setEstado({ loading: false, resultado });
      notify(
        `${resultado.totalImportados} locales importados` +
        (tieneSession ? " y guardados en el servidor" : " (guardados localmente)") +
        (resultado.advertencias.length > 0 ? ` — ${resultado.advertencias.length} advertencias` : ""),
        resultado.advertencias.length > 0 ? "warning" : "success"
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al leer el archivo";
      setEstado({ loading: false, resultado: { totalImportados: 0, totalDescartados: 0, errores: [msg], advertencias: [] } });
      notify("Error al procesar el archivo Excel", "error");
    }
  }

  const activosEleccion   = localCatalog.filter(l => l.activoEnEleccionActual).length;
  const activosSimulacion = localCatalog.filter(l => !l.activoEnEleccionActual).length;

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

      {/* Locales de votación */}
      <div style={{ ...S.card, marginBottom: 10, background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 10 }}>
          CATÁLOGO DE LOCALES DE VOTACIÓN
        </div>

        {/* Estado actual */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div style={{ background: "var(--primary-light)", borderRadius: 6, padding: "10px 14px", borderLeft: "3px solid var(--primary)" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>{activosEleccion}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>Locales eleción activa</div>
          </div>
          <div style={{ background: "var(--bg-surface-2)", borderRadius: 6, padding: "10px 14px", borderLeft: "3px solid var(--text-muted)" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-secondary)", lineHeight: 1 }}>{activosSimulacion}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, textTransform: "uppercase" as const, letterSpacing: "0.04em" }}>Locales simulación</div>
          </div>
        </div>

        {/* Template descargable */}
        <div style={{ background: "var(--info-light)", border: "1px solid var(--primary)", borderRadius: 6, padding: "8px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>📥</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>Plantilla Excel</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>Descargue la plantilla oficial con el formato requerido e instrucciones.</div>
          </div>
          <a
            href="/SCCE_Template_Locales.xlsx"
            download="SCCE_Template_Locales.xlsx"
            style={{
              background: "var(--primary)", color: "#fff", textDecoration: "none",
              padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            }}
            onClick={(e) => {
              // Si no hay archivo estático, notificar
              e.preventDefault();
              notify("ℹ️ Descargue la plantilla desde la sesión de Claude — archivo SCCE_Template_Locales.xlsx", "info");
            }}
          >
            Descargar plantilla
          </a>
        </div>

        {/* Cargadores */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* Elección activa */}
          {["eleccion" as const, "simulacion" as const].map(modo => {
            const esEleccion = modo === "eleccion";
            const fileRef    = esEleccion ? fileRefEleccion : fileRefSimulacion;
            const estado     = esEleccion ? importEleccion  : importSimulacion;
            const setEstado  = esEleccion ? setImportEleccion : setImportSimulacion;
            const color      = esEleccion ? "var(--primary)" : "var(--text-secondary)";
            const colorLight = esEleccion ? "var(--primary-light)" : "var(--bg-surface-2)";

            return (
              <div key={modo} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "12px", background: "var(--bg-surface)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{esEleccion ? "🗳️" : "🎯"}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                      {esEleccion ? "Elección activa" : "Simulación"}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {esEleccion ? "Locales habilitados para el proceso en curso" : "Locales históricos para entrenamiento"}
                    </div>
                  </div>
                </div>

                <button
                  style={{
                    width: "100%", padding: "8px", borderRadius: 6,
                    border: `2px dashed ${color}`, background: colorLight,
                    cursor: estado.loading ? "wait" : "pointer",
                    fontSize: 12, fontWeight: 600, color,
                    opacity: estado.loading ? 0.7 : 1,
                  }}
                  onClick={() => fileRef.current?.click()}
                  disabled={estado.loading}
                >
                  {estado.loading ? "Procesando..." : "Seleccionar archivo Excel (.xlsx)"}
                </button>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) await procesarExcel(file, modo, setEstado);
                  }}
                />

                {/* Resultado */}
                {estado.resultado && (
                  <div style={{ marginTop: 8 }}>
                    {estado.resultado.errores.length > 0 ? (
                      <div style={{ background: "var(--danger-light)", border: "1px solid var(--danger)", borderRadius: 5, padding: "6px 10px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--danger)", marginBottom: 4 }}>Errores al importar:</div>
                        {estado.resultado.errores.map((e, i) => (
                          <div key={i} style={{ fontSize: 10, color: "var(--danger)" }}>{e}</div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ background: "var(--success-light)", border: "1px solid var(--success)", borderRadius: 5, padding: "6px 10px" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--success)" }}>
                          ✅ {estado.resultado.totalImportados} locales importados
                          {estado.resultado.totalDescartados > 0 && (
                            <span style={{ color: "var(--warning)", marginLeft: 8 }}>
                              ({estado.resultado.totalDescartados} descartados)
                            </span>
                          )}
                        </div>
                        {estado.resultado.advertencias.length > 0 && (
                          <div style={{ marginTop: 4, maxHeight: 80, overflowY: "auto" as const }}>
                            {estado.resultado.advertencias.slice(0, 5).map((a, i) => (
                              <div key={i} style={{ fontSize: 10, color: "var(--warning)" }}>⚠️ {a}</div>
                            ))}
                            {estado.resultado.advertencias.length > 5 && (
                              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>... y {estado.resultado.advertencias.length - 5} más</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 8, fontSize: 10, color: "var(--text-muted)" }}>
          El sistema valida los códigos de comuna contra la división político-administrativa oficial de Chile (16 regiones, 346 comunas).
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
