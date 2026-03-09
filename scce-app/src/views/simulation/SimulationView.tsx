/**
 * Vista Simulación de Día de Elección. Recibe gate con datos y callbacks inyectados.
 */
import type React from "react";
import type { SimulationGate } from "./types";
import { SIMULATED_ROLE_HELP } from "../../config/simulatedRoleHelp";

export interface SimulationViewProps {
  gate: SimulationGate;
}

const SURVEY_QUESTIONS = [
  { key: "claridad" as const, label: "¿El sistema fue claro bajo presión?" },
  { key: "respaldo" as const, label: "¿Los snapshots de local aportan confianza?" },
];

export function SimulationView({ gate }: SimulationViewProps) {
  const {
    simCases,
    simReport,
    simSurvey,
    setSimSurvey,
    runSimulation,
    loadSimCases,
    S,
    themeColor,
    critColor,
    Badge,
  } = gate;

  const Sg = S as Record<string, (...args: unknown[]) => unknown> & Record<string, React.CSSProperties>;
  const btn = (variant: string) => (typeof Sg.btn === "function" ? Sg.btn(variant) : Sg.btn) as React.CSSProperties;

  return (
    <div>
      <h2 style={{ margin: "0 0 12px", fontSize: "16px" }}>Simulación de Día de Elección</h2>
      {gate.contextType === "SIMULACION" && gate.simulatedRoleLabel && (
        <>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", marginBottom: 4 }}>
            Ejercicio actual: actuando como {gate.simulatedRoleLabel}
          </div>
          {gate.simulatedRoleId && SIMULATED_ROLE_HELP[gate.simulatedRoleId] && (
            <div style={{ color: themeColor("muted"), fontSize: "11px", marginBottom: 8, fontStyle: "italic" }}>
              {SIMULATED_ROLE_HELP[gate.simulatedRoleId]}
            </div>
          )}
        </>
      )}
      <div style={{ ...Sg.card, marginBottom: 10, border: "1px solid #6366f144" }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", marginBottom: 8 }}>
          Genera 10 incidentes para entrenamiento. Los casos incluyen snapshot de local (v1.9).
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={btn("primary")} onClick={runSimulation}>
            ▶ Generar Simulación
          </button>
          {simCases.length > 0 && (
            <button style={btn("warning")} onClick={loadSimCases}>
              Cargar en Dashboard
            </button>
          )}
        </div>
      </div>
      {simReport && (
        <div style={{ ...Sg.g4, marginBottom: 10 }}>
          {[
            { l: "Total", v: simReport.total, c: themeColor("primary") },
            { l: "Críticos", v: simReport.critica, c: themeColor("danger") },
            { l: "Altos", v: simReport.alta, c: themeColor("warning") },
            { l: "Score prom.", v: simReport.avgScore, c: themeColor("warningAlt") },
          ].map((k) => (
            <div key={k.l} style={Sg.card}>
              <div style={{ color: k.c, fontSize: "22px", fontWeight: 700 }}>{k.v}</div>
              <div style={{ color: themeColor("muted"), fontSize: "11px" }}>{k.l}</div>
            </div>
          ))}
        </div>
      )}
      {simCases.map((c) => (
        <div
          key={c.id}
          style={{
            ...Sg.card,
            borderLeft: `3px solid ${critColor(c.criticality ?? "BAJA")}`,
            marginBottom: 4,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace", color: themeColor("muted"), fontSize: "10px" }}>{c.id}</span>
              <Badge
                style={
                  (typeof Sg.badge === "function"
                    ? (Sg.badge(critColor(c.criticality ?? "BAJA")) as React.CSSProperties)
                    : {}) as React.CSSProperties
                }
                size="sm"
              >
                {c.criticality}
              </Badge>
              <span style={{ fontSize: "11px", fontWeight: 600 }}>{c.summary}</span>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: themeColor("infoIcon") }}>🏫 {c.local}</span>
              {c.localSnapshot && (
                <span style={{ fontSize: "9px", color: themeColor("purple") }}>📸</span>
              )}
            </div>
          </div>
        </div>
      ))}
      {simCases.length > 0 && !simSurvey.submitted && (
        <div style={{ ...Sg.card, marginTop: 10, border: "1px solid #6366f144" }}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>
            Encuesta post-simulación
          </div>
          {SURVEY_QUESTIONS.map((q) => (
            <div key={q.key} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: "12px", color: themeColor("mutedAlt"), marginBottom: 4 }}>{q.label}</div>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const isSelected = simSurvey[q.key] === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setSimSurvey((p) => ({ ...p, [q.key]: n }))}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 3,
                        border: "1px solid",
                        cursor: "pointer",
                        background: isSelected ? themeColor("primary") : "transparent",
                        borderColor: isSelected ? themeColor("primary") : themeColor("mutedDarker"),
                        color: isSelected ? themeColor("white") : themeColor("muted"),
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button style={btn("success")} onClick={() => setSimSurvey((p) => ({ ...p, submitted: true }))}>
            Enviar
          </button>
        </div>
      )}
      {simSurvey.submitted && (
        <div style={{ ...Sg.card, marginTop: 10, color: themeColor("success"), fontWeight: 600 }}>
          ✓ Encuesta registrada — Claridad: {simSurvey.claridad}/5 · Snapshots: {simSurvey.respaldo}/5
        </div>
      )}
    </div>
  );
}
