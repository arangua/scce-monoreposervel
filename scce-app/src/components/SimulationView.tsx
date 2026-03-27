/**
 * SimulationView.tsx
 * Vista de Simulación de Día de Elección.
 * Extraída de App.tsx — R-4a refactor 2026-03-27.
 * Dependencias recibidas por props (sin closure sobre App state).
 */
import React from "react";
import { themeColor } from "../theme";
import { Badge } from "../ui/Badge";
import { critColor } from "../domain/caseUtils";
import type { CaseItem } from "../domain/types";

export type SimulationViewProps = {
  simCases: CaseItem[];
  simReport: {
    total: number;
    critica?: number;
    alta?: number;
    avgScore?: number;
  } | null;
  simSurvey: { claridad: number; respaldo: number; submitted: boolean };
  setSimSurvey: React.Dispatch<React.SetStateAction<{ claridad: number; respaldo: number; submitted: boolean }>>;
  onRunSimulation: () => void;
  onLoadSimCases: () => void;
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
  btn: (variant: string) =>
    ({
      padding: "6px 14px",
      borderRadius: 4,
      border: "none",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
      background:
        variant === "primary" ? themeColor("primary") :
        variant === "warning" ? themeColor("warning") :
        variant === "success" ? themeColor("success") :
        "#374151",
      color: "#fff",
    }) as React.CSSProperties,
  g4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 8,
  } as React.CSSProperties,
};

const SURVEY_QUESTIONS = [
  { key: "claridad",  label: "¿El sistema fue claro bajo presión?" },
  { key: "respaldo",  label: "¿Los snapshots de local aportan confianza?" },
] as const;

export function SimulationView({
  simCases,
  simReport,
  simSurvey,
  setSimSurvey,
  onRunSimulation,
  onLoadSimCases,
}: SimulationViewProps) {
  return (
    <div>
      <h2 style={{ margin: "0 0 12px", fontSize: "16px" }}>Simulación de Día de Elección</h2>

      <div style={{ ...S.card, marginBottom: 10, border: "1px solid #6366f144" }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", marginBottom: 8 }}>
          Genera 10 incidentes para entrenamiento. Los casos incluyen snapshot de local (v1.9).
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={S.btn("primary")} onClick={onRunSimulation}>
            ▶ Generar Simulación
          </button>
          {simCases.length > 0 && (
            <button style={S.btn("warning")} onClick={onLoadSimCases}>
              Cargar en Dashboard
            </button>
          )}
        </div>
      </div>

      {simReport && (
        <div style={{ ...S.g4, marginBottom: 10 }}>
          {[
            { l: "Total",      v: simReport.total,    c: themeColor("primary") },
            { l: "Críticos",   v: simReport.critica,  c: themeColor("danger") },
            { l: "Altos",      v: simReport.alta,     c: themeColor("warning") },
            { l: "Score prom.", v: simReport.avgScore, c: themeColor("warningAlt") },
          ].map((k) => (
            <div key={k.l} style={S.card}>
              <div style={{ color: k.c, fontSize: "22px", fontWeight: 700 }}>{k.v}</div>
              <div style={{ color: themeColor("muted"), fontSize: "11px" }}>{k.l}</div>
            </div>
          ))}
        </div>
      )}

      {simCases.map((c) => (
        <div
          key={c.id}
          style={{ ...S.card, borderLeft: `3px solid ${critColor(c.criticality)}`, marginBottom: 4 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace", color: themeColor("muted"), fontSize: "10px" }}>
                {c.id}
              </span>
              <Badge style={S.badge(critColor(c.criticality))} size="sm">
                {c.criticality}
              </Badge>
              <span style={{ fontSize: "11px", fontWeight: 600 }}>{c.summary}</span>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: themeColor("infoIcon") }}>
                🏫 {c.local}
              </span>
              {c.localSnapshot && (
                <span style={{ fontSize: "9px", color: themeColor("purple") }}>📸</span>
              )}
            </div>
          </div>
        </div>
      ))}

      {simCases.length > 0 && !simSurvey.submitted && (
        <div style={{ ...S.card, marginTop: 10, border: "1px solid #6366f144" }}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>
            Encuesta post-simulación
          </div>
          {SURVEY_QUESTIONS.map((q) => (
            <div key={q.key} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: "12px", color: themeColor("mutedAlt"), marginBottom: 4 }}>
                {q.label}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const selected = (simSurvey as Record<string, number | boolean>)[q.key] === n;
                  return (
                    <button
                      key={n}
                      onClick={() => setSimSurvey((p) => ({ ...p, [q.key]: n }))}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 3,
                        border: "1px solid",
                        cursor: "pointer",
                        background: selected ? themeColor("primary") : "transparent",
                        borderColor: selected ? themeColor("primary") : themeColor("mutedDarker"),
                        color: selected ? themeColor("white") : themeColor("muted"),
                      }}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <button
            style={S.btn("success")}
            onClick={() => setSimSurvey((p) => ({ ...p, submitted: true }))}
          >
            Enviar
          </button>
        </div>
      )}

      {simSurvey.submitted && (
        <div style={{ ...S.card, marginTop: 10, color: themeColor("success"), fontWeight: 600 }}>
          ✓ Encuesta registrada — Claridad: {simSurvey.claridad}/5 · Snapshots: {simSurvey.respaldo}/5
        </div>
      )}
    </div>
  );
}
