/**
 * components/CopView.tsx
 * FASE 5 — Common Operating Picture (COP)
 * Vista consolidada de estado operacional para el Director Regional.
 * Lee del store directamente. Sin props de estado.
 */
import React, { useMemo } from "react";
import type { CaseItem } from "../domain/types";
import { normalizeStatus } from "../domain/caseUtils";
import { getSlaTrafficLight } from "../domain/caseSla";
import { themeColor } from "../theme";
import { Badge } from "../ui/Badge";
import { useAppStore } from "../store/useAppStore";

// ── Estilos locales ─────────────────────────────────────────────────────────
const S = {
  card: {
    background: themeColor("bgSurface"),
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "12px",
  } as React.CSSProperties,
  badge: (color: string) => ({
    background: color + "22",
    color,
    border: "1px solid " + color + "44",
    borderRadius: "3px",
    padding: "2px 6px",
    fontSize: "11px",
    fontWeight: 600,
  }),
  kpiVal: (color: string) => ({
    fontSize: "28px",
    fontWeight: 800,
    color,
    lineHeight: 1,
    marginBottom: 2,
  }),
  kpiLbl: {
    fontSize: "11px",
    color: themeColor("muted"),
    fontWeight: 600,
    textTransform: "uppercase" as const,
  },
};

// ── Colores por etapa decisional ────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  DETECTED:   "#9ca3af",
  VALIDATED:  "#60a5fa",
  ORIENTED:   "#34d399",
  CLASSIFIED: "#fbbf24",
  DECIDED:    "#f97316",
  EXECUTING:  "#a78bfa",
  VERIFIED:   "#22c55e",
  CLOSED:     "#6b7280",
};
const STAGE_LABELS: Record<string, string> = {
  DETECTED:   "Detectado",
  VALIDATED:  "Validado",
  ORIENTED:   "Orientado",
  CLASSIFIED: "Clasificado",
  DECIDED:    "Decidido",
  EXECUTING:  "En ejecución",
  VERIFIED:   "Verificado",
  CLOSED:     "Cerrado",
};
const STAGE_ORDER = ["DETECTED","VALIDATED","ORIENTED","CLASSIFIED","DECIDED","EXECUTING","VERIFIED","CLOSED"];

export function CopView() {
  const { cases, operationMode, setSelectedCase, setView } = useAppStore();

  // Solo casos activos (no cerrados)
  const active = useMemo(
    () => cases.filter((c) => normalizeStatus(c.status) !== "Cerrado"),
    [cases]
  );

  // KPIs principales
  const kpis = useMemo(() => ({
    total:      active.length,
    critica:    active.filter((c) => c.criticality === "CRITICA").length,
    alta:       active.filter((c) => c.criticality === "ALTA").length,
    slaVencido: active.filter((c) => getSlaTrafficLight(c, operationMode).vencido).length,
    sinAsignar: active.filter((c) => !c.assignedTo).length,
    bypass:     active.filter((c) => c.bypassFlagged && !c.bypassValidated).length,
  }), [active, operationMode]);

  // Distribución por etapa decisional
  const porEtapa = useMemo(() => {
    const counts: Record<string, CaseItem[]> = {};
    for (const stage of STAGE_ORDER) counts[stage] = [];
    for (const c of active) {
      const s = c.decisionStage ?? "DETECTED";
      if (counts[s]) counts[s].push(c);
      else counts["DETECTED"].push(c);
    }
    return counts;
  }, [active]);

  // Distribución por criticidad
  const porCrit = useMemo(() => ({
    CRITICA: active.filter((c) => c.criticality === "CRITICA"),
    ALTA:    active.filter((c) => c.criticality === "ALTA"),
    MEDIA:   active.filter((c) => c.criticality === "MEDIA"),
    BAJA:    active.filter((c) => c.criticality === "BAJA"),
  }), [active]);

  // Casos críticos activos con SLA vencido — requieren acción inmediata
  const alertas = useMemo(() =>
    active
      .filter((c) =>
        (c.criticality === "CRITICA" || c.criticality === "ALTA") &&
        getSlaTrafficLight(c, operationMode).vencido
      )
      .sort((a, b) => new Date(a.createdAt ?? "").getTime() - new Date(b.createdAt ?? "").getTime()),
    [active, operationMode]
  );

  function openCase(c: CaseItem) {
    setSelectedCase(c);
    setView("detail");
  }

  const critColors: Record<string, string> = {
    CRITICA: themeColor("danger"),
    ALTA:    themeColor("warning"),
    MEDIA:   themeColor("warningAlt"),
    BAJA:    themeColor("success"),
  };

  const modeColor = operationMode === "NORMAL"
    ? themeColor("success")
    : operationMode === "CONTINGENCIA"
    ? themeColor("warning")
    : themeColor("danger");

  return (
    <div>
      {/* Encabezado */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>COP — Estado Operacional</h2>
          <div style={{ fontSize: "11px", color: themeColor("muted"), marginTop: 2 }}>
            Common Operating Picture · Actualizado en tiempo real
          </div>
        </div>
        <Badge style={{ ...S.badge(modeColor), fontWeight: 800, fontSize: "12px" }} size="sm">
          {operationMode === "NORMAL" ? "🟢 NORMAL" : operationMode === "CONTINGENCIA" ? "⚠️ CONTINGENCIA" : "🔴 DEGRADADO"}
        </Badge>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
        {[
          { label: "Casos activos",    val: kpis.total,      color: themeColor("primary") },
          { label: "Críticos + Altos", val: kpis.critica + kpis.alta, color: themeColor("danger") },
          { label: "SLA vencido",      val: kpis.slaVencido, color: themeColor("danger") },
          { label: "Sin asignar",      val: kpis.sinAsignar, color: themeColor("warning") },
          { label: "Bypass pendiente", val: kpis.bypass,     color: themeColor("warningAlt") },
          { label: "Modo operacional", val: operationMode,   color: modeColor },
        ].map((k) => (
          <div key={k.label} style={S.card}>
            <div style={S.kpiVal(k.color)}>{k.val}</div>
            <div style={S.kpiLbl}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Alertas inmediatas */}
      {alertas.length > 0 && (
        <div style={{ ...S.card, border: "2px solid #ef4444", background: themeColor("redBlock"), marginBottom: 12 }}>
          <div style={{ color: themeColor("danger"), fontWeight: 700, fontSize: "12px", marginBottom: 6 }}>
            🚨 ATENCIÓN INMEDIATA — {alertas.length} caso{alertas.length > 1 ? "s" : ""} crítico{alertas.length > 1 ? "s" : ""} con SLA vencido
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {alertas.slice(0, 5).map((c) => (
              <div
                key={c.id}
                style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", cursor: "pointer", padding: "4px 6px", borderRadius: 4, background: "rgba(239,68,68,0.08)" }}
                onClick={() => openCase(c)}
              >
                <Badge style={{ ...S.badge(critColors[c.criticality] ?? themeColor("muted")), fontSize: "10px" }} size="xs">{c.criticality}</Badge>
                <span style={{ fontFamily: "monospace", color: themeColor("muted"), fontSize: "10px" }}>{c.id.slice(-8)}</span>
                <span style={{ fontSize: "12px", fontWeight: 600, flex: 1 }}>{c.summary.slice(0, 60)}</span>
                <Badge style={{ ...S.badge(STAGE_COLORS[c.decisionStage ?? "DETECTED"]), fontSize: "10px" }} size="xs">
                  {STAGE_LABELS[c.decisionStage ?? "DETECTED"]}
                </Badge>
              </div>
            ))}
            {alertas.length > 5 && (
              <div style={{ fontSize: "11px", color: themeColor("muted"), textAlign: "center" }}>
                +{alertas.length - 5} más
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Flujo C2 — distribución por etapa */}
        <div style={S.card}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 10 }}>
            FLUJO C2 — DISTRIBUCIÓN POR ETAPA
          </div>
          {STAGE_ORDER.filter(s => s !== "CLOSED").map((stage) => {
            const count = porEtapa[stage]?.length ?? 0;
            const pct = active.length ? Math.round((count / active.length) * 100) : 0;
            const color = STAGE_COLORS[stage];
            return (
              <div key={stage} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
                    <span style={{ fontSize: "11px", color: themeColor("textSecondary") }}>{STAGE_LABELS[stage]}</span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 700, color }}>{count}</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: themeColor("border"), overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })}
          {active.length === 0 && (
            <div style={{ fontSize: "12px", color: themeColor("mutedAlt"), fontStyle: "italic" }}>Sin casos activos</div>
          )}
        </div>

        {/* Distribución por criticidad */}
        <div style={S.card}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 10 }}>
            DISTRIBUCIÓN POR CRITICIDAD
          </div>
          {(["CRITICA", "ALTA", "MEDIA", "BAJA"] as const).map((crit) => {
            const list = porCrit[crit];
            const pct = active.length ? Math.round((list.length / active.length) * 100) : 0;
            const color = critColors[crit];
            return (
              <div key={crit} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <Badge style={{ ...S.badge(color), fontSize: "10px" }} size="xs">{crit}</Badge>
                  <span style={{ fontSize: "11px", fontWeight: 700, color }}>{list.length} <span style={{ color: themeColor("muted"), fontWeight: 400 }}>({pct}%)</span></span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: themeColor("border"), overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.3s" }} />
                </div>
              </div>
            );
          })}

          {/* Semáforo SLA global */}
          <div style={{ marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 8 }}>
            <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>SEMÁFORO SLA</div>
            {(() => {
              const verde    = active.filter((c) => getSlaTrafficLight(c, operationMode).color === "green").length;
              const amarillo = active.filter((c) => getSlaTrafficLight(c, operationMode).color === "yellow").length;
              const rojo     = active.filter((c) => getSlaTrafficLight(c, operationMode).color === "red").length;
              return (
                <div style={{ display: "flex", gap: 12 }}>
                  {[
                    { icon: "🟢", label: "OK",       val: verde,    color: themeColor("success") },
                    { icon: "🟡", label: "Próximo",  val: amarillo, color: themeColor("warning") },
                    { icon: "🔴", label: "Vencido",  val: rojo,     color: themeColor("danger")  },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: "center", flex: 1 }}>
                      <div style={{ fontSize: "18px" }}>{s.icon}</div>
                      <div style={{ fontSize: "16px", fontWeight: 800, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: "10px", color: themeColor("muted") }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Lista de casos activos ordenados por urgencia */}
      {active.length > 0 && (
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>
            CASOS ACTIVOS — ORDEN DE URGENCIA ({active.length})
          </div>
          <div style={{ maxHeight: 280, overflowY: "auto" }}>
            {[...active]
              .sort((a, b) => {
                const critOrder: Record<string, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
                const ca = critOrder[a.criticality] ?? 9;
                const cb = critOrder[b.criticality] ?? 9;
                if (ca !== cb) return ca - cb;
                const slaA = getSlaTrafficLight(a, operationMode).percent;
                const slaB = getSlaTrafficLight(b, operationMode).percent;
                return slaB - slaA;
              })
              .map((c) => {
                const tl = getSlaTrafficLight(c, operationMode);
                const slaColor = tl.color === "red" ? themeColor("danger") : tl.color === "yellow" ? themeColor("warning") : themeColor("success");
                const stage = c.decisionStage ?? "DETECTED";
                return (
                  <div
                    key={c.id}
                    style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", borderBottom: "1px solid #e5e7eb", cursor: "pointer", flexWrap: "wrap" }}
                    onClick={() => openCase(c)}
                  >
                    <Badge style={{ ...S.badge(critColors[c.criticality] ?? themeColor("muted")), fontSize: "10px", flexShrink: 0 }} size="xs">
                      {c.criticality}
                    </Badge>
                    <span style={{ fontFamily: "monospace", color: themeColor("muted"), fontSize: "10px", flexShrink: 0 }}>{c.id.slice(-8)}</span>
                    <span style={{ fontSize: "12px", flex: 1, minWidth: 120 }}>{c.summary.slice(0, 50)}</span>
                    <Badge style={{ ...S.badge(STAGE_COLORS[stage]), fontSize: "10px", flexShrink: 0 }} size="xs">
                      {STAGE_LABELS[stage]}
                    </Badge>
                    {tl.label && (
                      <Badge style={{ ...S.badge(slaColor), fontSize: "10px", flexShrink: 0 }} size="xs">
                        {tl.color === "green" ? "🟢" : tl.color === "yellow" ? "🟡" : "🔴"} {tl.label}
                      </Badge>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
