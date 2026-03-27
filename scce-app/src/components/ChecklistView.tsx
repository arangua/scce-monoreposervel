/**
 * ChecklistView.tsx
 * Vista de Checklist Electoral — completamente autónoma (estado local propio).
 * Extraída de App.tsx — R-4a refactor 2026-03-27.
 */
import React, { useState } from "react";
import { themeColor } from "../theme";
import { Badge } from "../ui/Badge";

// Tipos locales de estilo (simplificados — el componente los define inline)
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
    }) as React.CSSProperties,
};

const CHECKLIST_ITEMS = [
  { id: "c1",  cat: "Pre-apertura", text: "Verificar locales activos en catálogo (activoGlobal + activoEnEleccionActual)" },
  { id: "c2",  cat: "Pre-apertura", text: "Confirmar año electoral correcto en Config" },
  { id: "c3",  cat: "Pre-apertura", text: "Revisar divergencias pendientes del catálogo (panel naranja)" },
  { id: "c4",  cat: "Pre-apertura", text: "Verificar acceso de todos los roles al SCCE" },
  { id: "c5",  cat: "Apertura",     text: "Confirmar apertura de mesas en locales críticos" },
  { id: "c6",  cat: "Apertura",     text: "Testear registro de incidente con snapshot de local" },
  { id: "c7",  cat: "Operación",    text: "Monitorear panel de divergencias en Dashboard" },
  { id: "c8",  cat: "Operación",    text: "Revisar bypass flagged pendientes de validación" },
  { id: "c9",  cat: "Operación",    text: "Verificar integridad cadena auditoría (badge verde)" },
  { id: "c10", cat: "Cierre",       text: "Exportar CSV y JSON de casos" },
  { id: "c11", cat: "Cierre",       text: "Exportar auditoría completa" },
  { id: "c12", cat: "Cierre",       text: "Verificar casos sin cerrar y completitud ≥80%" },
] as const;

export function ChecklistView() {
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const cats = [...new Set(CHECKLIST_ITEMS.map((i) => i.cat))];
  const done = Object.values(checks).filter(Boolean).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: "16px" }}>Checklist Electoral</h2>
        <Badge
          style={S.badge(done === CHECKLIST_ITEMS.length ? themeColor("success") : themeColor("primary"))}
          size="sm"
        >
          {done}/{CHECKLIST_ITEMS.length}
        </Badge>
      </div>

      {cats.map((cat) => (
        <div key={cat} style={{ ...S.card, marginBottom: 8 }}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>
            {cat.toUpperCase()}
          </div>
          {CHECKLIST_ITEMS.filter((i) => i.cat === cat).map((it) => (
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
