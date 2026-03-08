/**
 * Vista Checklist Electoral. Recibe gate con estilos y Badge inyectados.
 */
import { useState } from "react";
import type React from "react";
import type { ChecklistGate, ChecklistItem } from "./types";

export interface ChecklistViewProps {
  gate: ChecklistGate;
}

const ITEMS: ChecklistItem[] = [
  { id: "c1", cat: "Pre-apertura", text: "Verificar locales activos en catálogo (activoGlobal + activoEnEleccionActual)" },
  { id: "c2", cat: "Pre-apertura", text: "Confirmar año electoral correcto en Config" },
  { id: "c3", cat: "Pre-apertura", text: "Revisar divergencias pendientes del catálogo (panel naranja)" },
  { id: "c4", cat: "Pre-apertura", text: "Verificar acceso de todos los roles al SCCE" },
  { id: "c5", cat: "Apertura", text: "Confirmar apertura de mesas en locales críticos" },
  { id: "c6", cat: "Apertura", text: "Testear registro de incidente con snapshot de local" },
  { id: "c7", cat: "Operación", text: "Monitorear panel de divergencias en Dashboard" },
  { id: "c8", cat: "Operación", text: "Revisar bypass flagged pendientes de validación" },
  { id: "c9", cat: "Operación", text: "Verificar integridad cadena auditoría (badge verde)" },
  { id: "c10", cat: "Cierre", text: "Exportar CSV y JSON de casos" },
  { id: "c11", cat: "Cierre", text: "Exportar auditoría completa" },
  { id: "c12", cat: "Cierre", text: "Verificar casos sin cerrar y completitud ≥80%" },
];

export function ChecklistView({ gate }: ChecklistViewProps) {
  const { S, themeColor, Badge } = gate;
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const Sg = S as Record<string, (...args: unknown[]) => unknown> & Record<string, React.CSSProperties>;
  const cats = [...new Set(ITEMS.map((i) => i.cat))];
  const done = Object.values(checks).filter(Boolean).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: "16px" }}>Checklist Electoral</h2>
        <Badge
          style={
            (typeof Sg.badge === "function"
              ? (Sg.badge(done === ITEMS.length ? themeColor("success") : themeColor("primary")) as React.CSSProperties)
              : {}) as React.CSSProperties
          }
          size="sm"
        >
          {done}/{ITEMS.length}
        </Badge>
      </div>
      {cats.map((cat) => (
        <div key={cat} style={{ ...Sg.card, marginBottom: 8 }}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>
            {cat.toUpperCase()}
          </div>
          {ITEMS.filter((i) => i.cat === cat).map((it) => (
            <label
              key={it.id}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={!!checks[it.id]}
                onChange={(e) => setChecks((p) => ({ ...p, [it.id]: e.target.checked }))}
              />
              <span
                style={{
                  color: checks[it.id] ? themeColor("success") : themeColor("legacySlate"),
                  fontSize: "12px",
                  textDecoration: checks[it.id] ? "line-through" : "none",
                }}
              >
                {it.text}
              </span>
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}
