/**
 * Vista Panel de Operación (Dashboard). Recibe gate con datos y callbacks inyectados.
 */
import type React from "react";
import { useState } from "react";
import type { CaseItem, CaseStatus } from "../../domain/types";
import { getCommuneDisplayName } from "../../domain/territoryCatalog";
import type { DashboardGate } from "./types";

export interface DashboardViewProps {
  gate: DashboardGate;
}

function DivBadge({ gate, c }: { gate: DashboardGate; c: CaseItem }) {
  const div = gate.checkLocalDivergence(c, gate.localCatalog);
  if (!div) return null;
  const S = gate.S as Record<string, (...args: unknown[]) => unknown> & Record<string, React.CSSProperties>;
  return (
    <gate.Tooltip
      placement="bottom-start"
      maxWidth={300}
      panelStyle={{
        background: gate.themeColor("orangeBlock"),
        color: gate.themeColor("textPrimary"),
        border: "1px solid #f9731644",
      }}
      content={
        <div>
          <div style={{ fontWeight: 800, marginBottom: 4, color: gate.themeColor("warning") }}>⚡ Divergencia de catálogo</div>
          <div style={{ color: gate.themeColor("mutedAlt") }}>{div.msg}</div>
          <div style={{ color: gate.themeColor("muted"), marginTop: 4, fontSize: "10px" }}>El caso es válido. Revisar estado operacional del local.</div>
        </div>
      }
    >
      <gate.Badge style={{ ...(S.badge?.(gate.themeColor("warning")) as React.CSSProperties), cursor: "help" }} size="xs">⚡ CAT</gate.Badge>
    </gate.Tooltip>
  );
}

function CaseCard({ gate, c, onClick }: { gate: DashboardGate; c: CaseItem; onClick: () => void }) {
  const S = gate.S as Record<string, (...args: unknown[]) => unknown> & Record<string, React.CSSProperties>;
  const div = gate.checkLocalDivergence(c, gate.localCatalog);
  const ns = gate.normalizeStatus(c.status);
  const comp = c.completeness ?? 0;
  const commName = getCommuneDisplayName(gate.regionsMap, c.region ?? "", c.commune ?? "");
  const summaryTrim = c.summary?.trim();
  const hasLocal = !!c.local?.trim();
  const hasComm = !!(commName && commName !== "—");
  const genericTitles = new Set(["", "NUEVO", "CRITICO", "CRÍTICO", "ALTA", "MEDIA", "BAJA", "OK", "—", "-", "SIN RESUMEN"]);
  const isGenericTitle = !summaryTrim || genericTitles.has(summaryTrim.toUpperCase()) || (summaryTrim.length <= 3 && /^[\s\-—]*$/i.test(summaryTrim));
  const fallbackFromData = hasLocal && c.local ? `Caso en ${c.local}` : hasComm && commName ? `Caso en ${commName}` : c.region ? `Caso — Región ${c.region}` : (gate.UI_TEXT_GOVERNANCE.emptyStates as { noSummary?: string })?.noSummary ?? "Sin resumen";
  const displaySummary = summaryTrim && !isGenericTitle ? c.summary : fallbackFromData;
  const locationLine = hasLocal && hasComm ? `🏫 ${c.local} · ${commName}` : hasLocal ? `🏫 ${c.local}` : hasComm ? `🏫 ${commName}` : (gate.UI_TEXT_GOVERNANCE.emptyStates as { noLocation?: string })?.noLocation ?? "Sin ubicación";
  const compColor = comp >= 80 ? gate.themeColor("success") : comp >= 50 ? gate.themeColor("warningAlt") : gate.themeColor("muted");
  return (
    <button
      type="button"
      style={{ ...(S.card as React.CSSProperties), padding: 10, cursor: "pointer", borderLeft: `3px solid ${gate.critColor(c.criticality)}`, marginBottom: 6, position: "relative", width: "100%", textAlign: "left", font: "inherit", borderRight: "none", borderTop: "none", borderBottom: "none", borderRadius: 6 }}
      onClick={onClick}
    >
      {div && <div style={{ position: "absolute", top: 0, right: 0, width: 3, bottom: 0, background: gate.themeColor("warning"), borderRadius: "0 6px 6px 0" }} />}
      <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: 6, lineHeight: 1.3 }}>{displaySummary}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "10px", color: gate.themeColor("mutedDark"), marginBottom: 2 }}>{locationLine}</div>
          <div style={{ fontSize: "9px", color: gate.themeColor("muted"), display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span>🕐 {gate.fmtDate(c.createdAt)}</span>
            <span style={{ fontFamily: "monospace" }}>{c.id}</span>
            <span>Región: {c.region ?? (c as { regionCode?: string }).regionCode ?? "—"}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
          <gate.Badge style={S.badge?.(gate.critColor(c.criticality)) as React.CSSProperties} size="sm">{c.criticality}</gate.Badge>
          <gate.Badge style={S.badge?.(gate.statusColor(ns as CaseStatus)) as React.CSSProperties} size="sm">{ns === "Otros / Desconocido" ? String(c.status) : ns}</gate.Badge>
          <gate.SlaBadge c={c} />
          {gate.canDo("recepcionar", gate.currentUser, c) && c.status === "Nuevo" && !c.bypass && (
            <button type="button" style={{ ...(S.btn?.("primary") as React.CSSProperties), fontSize: "10px", padding: "2px 8px" }} onClick={(e) => { e.stopPropagation(); gate.recepcionar(c.id); }}>Recepcionar</button>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", fontSize: "9px", opacity: 0.88 }}>
        <gate.RecBadge c={c} />
        <DivBadge gate={gate} c={c} />
        {c.bypassFlagged && !c.bypassValidated && (
          <gate.Badge style={{ ...(S.badge?.(gate.themeColor("danger")) as React.CSSProperties), fontSize: "9px" }} size="xs">⚠️ {(gate.UI_TEXT.states as { modoUrgente?: string })?.modoUrgente}</gate.Badge>
        )}
        {c.isSim && <gate.Badge style={{ ...(S.badge?.(gate.themeColor("purple")) as React.CSSProperties), fontSize: "9px" }} size="xs">SIM</gate.Badge>}
        <span style={{ marginLeft: 4, color: compColor }}>✓ {comp}%</span>
      </div>
    </button>
  );
}

export function DashboardView({ gate }: DashboardViewProps) {
  const {
    setView,
    setSelectedCase,
    cases,
    visibleCases,
    metrics,
    divergencias,
    S,
    themeColor,
    crisisMode,
    setCrisisMode,
    filterState,
    setFilterState,
    regionOptions,
    isCentral,
    regionEffective,
    activeRegion,
    fixedLocalRole,
    assignedCommuneEffective,
    assignedLocal,
    assignedLocalIdEffective,
    regionsMap,
    normalizeStatus,
    statusColor,
    critColor,
    currentUser,
    canDo,
    changeStatus,
    RecBadge,
    UI_TEXT,
  } = gate;
  const [quickFilter, setQuickFilter] = useState<"all" | "open" | "criticalHigh" | "overdue">("all");
  const quickFilteredCases = visibleCases.filter((c) => {
    if (quickFilter === "open") {
      return !["Resuelto", "Cerrado"].includes(normalizeStatus(c.status));
    }
    if (quickFilter === "criticalHigh") {
      return ["CRITICA", "ALTA"].includes(c.criticality);
    }
    if (quickFilter === "overdue") {
      return gate.isSlaVencido(c);
    }
    return true;
  });
  const Sx = S as Record<string, (...args: unknown[]) => unknown> & Record<string, React.CSSProperties>;

  const isQuickFilterActive = (label: string) =>
    (label === "Total" && quickFilter === "all") ||
    (label === "Abiertos" && quickFilter === "open") ||
    (label === "Críticos+Altos (todos)" && quickFilter === "criticalHigh") ||
    (label === "Casos atrasados" && quickFilter === "overdue");

  const handleQuickFilterCardClick = (label: string) => {
    if (label === "Total") return setQuickFilter("all");
    if (label === "Abiertos") return setQuickFilter(quickFilter === "open" ? "all" : "open");
    if (label === "Críticos+Altos (todos)") return setQuickFilter(quickFilter === "criticalHigh" ? "all" : "criticalHigh");
    if (label === "Casos atrasados") return setQuickFilter(quickFilter === "overdue" ? "all" : "overdue");
  };

  const QUICK_FILTER_LABELS = ["Total", "Abiertos", "Críticos+Altos (todos)", "Casos atrasados"] as const;
  const getQuickFilterCardTitle = (label: string): string | undefined => {
    if (label === "Total") return "Mostrar todos los casos";
    if (label === "Abiertos") return "Mostrar solo casos abiertos";
    if (label === "Críticos+Altos (todos)") return "Mostrar solo casos críticos y altos";
    if (label === "Casos atrasados") return "Mostrar solo casos atrasados";
    return undefined;
  };
  const getQuickFilterHighlightStyle = (label: string): React.CSSProperties => {
    if (label === "Total") return { border: "2px solid #2563eb", boxShadow: "0 0 0 2px rgba(37,99,235,0.15)" };
    if (label === "Abiertos") return { border: "2px solid #f97316", boxShadow: "0 0 0 2px rgba(249,115,22,0.15)" };
    if (label === "Críticos+Altos (todos)") return { border: "2px solid #dc2626", boxShadow: "0 0 0 2px rgba(220,38,38,0.15)" };
    if (label === "Casos atrasados") return { border: "2px solid #b91c1c", boxShadow: "0 0 0 2px rgba(185,28,28,0.15)" };
    return {};
  };

  const quickFilterDisplayLabel: Record<typeof quickFilter, string> = {
    all: "Todos",
    open: "Abiertos",
    criticalHigh: "Críticos + Altos",
    overdue: "Casos atrasados",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "16px" }}>Panel de Operación</h2>
          {metrics.critica > 0 && (
            <gate.Badge style={Sx.badge?.(themeColor("danger")) as React.CSSProperties} size="sm">🚨 {metrics.critica} CRÍTICOS</gate.Badge>
          )}
          {metrics.flagged > 0 && (
            <gate.Badge style={Sx.badge?.(themeColor("danger")) as React.CSSProperties} size="sm">⚠️ {metrics.flagged} {(UI_TEXT.states as { flagged?: string })?.flagged}</gate.Badge>
          )}
          {divergencias.length > 0 && (
            <gate.Badge style={{ ...(Sx.badge?.(themeColor("warning")) as React.CSSProperties) }} size="sm" onClick={() => setView("catalog")}>
              ⚡ {divergencias.length} LOCAL(ES) MOD.
            </gate.Badge>
          )}
        </div>
        <button type="button" style={Sx.btn?.(crisisMode ? "danger" : "dark") as React.CSSProperties} onClick={() => setCrisisMode((p) => !p)}>{crisisMode ? "🔄 Normal" : "⚡ Crisis"}</button>
      </div>

      {divergencias.length > 0 && (
        <div style={{ ...(Sx.card as React.CSSProperties), background: themeColor("orangeBlock"), border: "1px solid #f9731644", marginBottom: 10 }}>
          <div style={{ color: themeColor("warning"), fontWeight: 700, fontSize: "12px", marginBottom: 6 }}>⚡ Locales modificados en catálogo post-creación ({divergencias.length})</div>
          {divergencias.map((x) => (
            <div key={x.caseId} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3, fontSize: "11px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "monospace", color: themeColor("muted") }}>{x.caseId}</span>
              <span style={{ color: themeColor("mutedAlt") }}>{x.caseSummary.slice(0, 40)}</span>
              <span style={{ color: themeColor("warning") }}>→ {x.div?.msg}</span>
              <button type="button" style={{ ...(Sx.btn?.("dark") as React.CSSProperties), fontSize: "9px", padding: "1px 6px" }} onClick={() => { const found = cases.find((c: CaseItem) => c.id === x.caseId) ?? null; setSelectedCase(found); setView("detail"); }}>Ver</button>
            </div>
          ))}
          <div style={{ fontSize: "10px", color: themeColor("muted"), marginTop: 4 }}>Los casos son válidos. Verificar estado operacional del local.</div>
        </div>
      )}

      <div style={{ ...(Sx.g4 as React.CSSProperties), marginBottom: 10 }}>
        {[{ l: "Total", v: metrics.total, c: themeColor("primary") }, { l: "Abiertos", v: metrics.open, c: themeColor("warning") }, { l: "Críticos+Altos (todos)", v: metrics.critica + metrics.alta, c: themeColor("danger") }, { l: "Casos atrasados", v: metrics.slaVencido, c: themeColor("danger") }].map((k) => {
          const isQuickFilterCard = QUICK_FILTER_LABELS.includes(k.l as (typeof QUICK_FILTER_LABELS)[number]);
          return (
          <div
            key={k.l}
            title={getQuickFilterCardTitle(k.l)}
            style={{
              ...(Sx.card as React.CSSProperties),
              ...(isQuickFilterCard ? { cursor: "pointer" as const } : {}),
              ...(isQuickFilterActive(k.l) ? getQuickFilterHighlightStyle(k.l) : {}),
            }}
            onClick={isQuickFilterCard ? () => handleQuickFilterCardClick(k.l) : undefined}
          >
            <div style={{ color: k.c, fontSize: "22px", fontWeight: 700 }}>{k.v}</div>
            <div style={{ color: themeColor("muted"), fontSize: "11px" }}>{k.l}</div>
          </div>
          );
        })}
      </div>

      {!crisisMode && (
        <div style={{ ...(Sx.card as React.CSSProperties), marginBottom: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <select
            style={{ ...(Sx.inp as React.CSSProperties), width: "180px", borderColor: themeColor("primary") }}
            value={isCentral ? (filterState.region || "ALL") : regionEffective}
            disabled={!isCentral}
            onChange={(e) => { if (!isCentral) return; const v = e.target.value; setFilterState((p) => ({ ...p, region: v === "ALL" ? "" : v, commune: "" })); }}
          >
            {regionOptions.map((o) => (
              <option key={o.code} value={o.code}>{o.code} — {o.name}</option>
            ))}
          </select>
          <input style={{ ...(Sx.inp as React.CSSProperties), width: "150px" }} placeholder="🔍 ID, resumen, local..." value={filterState.search} onChange={(e) => setFilterState((p) => ({ ...p, search: e.target.value }))} />
          <select style={{ ...(Sx.inp as React.CSSProperties), width: "120px" }} value={filterState.criticality} onChange={(e) => setFilterState((p) => ({ ...p, criticality: e.target.value }))}>
            {["", "CRITICA", "ALTA", "MEDIA", "BAJA"].map((o) => <option key={o} value={o}>{o || "Criticidad"}</option>)}
          </select>
          <select style={{ ...(Sx.inp as React.CSSProperties), width: "130px" }} value={filterState.status} onChange={(e) => setFilterState((p) => ({ ...p, status: e.target.value }))}>
            {["", "Nuevo", "Recepcionado por DR", "En gestión", "Escalado", "Mitigado", "Resuelto", "Cerrado"].map((o) => <option key={o} value={o}>{o || "Estado"}</option>)}
          </select>
          <select
            style={{ ...(Sx.inp as React.CSSProperties), width: "150px" }}
            disabled={fixedLocalRole || (isCentral ? !(filterState.region || activeRegion) : !filterState.region)}
            value={fixedLocalRole ? (assignedCommuneEffective || "") : filterState.commune}
            onChange={(e) => { if (fixedLocalRole) return; const regionForCommune = isCentral ? (filterState.region || activeRegion) : filterState.region; if (regionForCommune == null || regionForCommune === "") return; setFilterState((p) => ({ ...p, commune: e.target.value })); }}
          >
            <option value="">Todas las comunas</option>
            {Object.entries(regionsMap[(isCentral ? (filterState.region || activeRegion) : regionEffective)]?.communes || {}).map(([k, v]) => <option key={k} value={k}>{(v as { name?: string })?.name}</option>)}
          </select>
          {fixedLocalRole && <div style={{ fontSize: 12, opacity: 0.85, color: assignedLocal ? themeColor("mutedAlt") : themeColor("warning") }}>{assignedLocal ? `📍 Comuna fijada por local asignado: ${assignedLocal.nombre}` : "⚠️ Sin local asignado válido (no se mostrarán casos)"}</div>}
          <gate.IconButton onClick={() => setFilterState((p) => ({ ...p, criticality: "", status: "", commune: "", search: "", region: isCentral ? "" : regionEffective }))} title="Limpiar filtros">✕</gate.IconButton>
        </div>
      )}

      {fixedLocalRole && (
        <div style={{ ...(Sx.card as React.CSSProperties), marginBottom: 8, padding: "8px 10px", fontSize: 13, opacity: 0.95 }}>
          {assignedLocal ? (
            <div>
              📍 Local asignado: {assignedLocal.nombre} — {assignedCommuneEffective} ({assignedLocalIdEffective})
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>Alcance: solo este local.</div>
            </div>
          ) : (
            <div>⚠️ Sin local asignado válido — No se mostrarán casos.</div>
          )}
        </div>
      )}

      {crisisMode ? (
        <div>
          <div style={{ color: themeColor("danger"), fontWeight: 700, marginBottom: 8 }}>⚡ MODO CRISIS — Críticos y altos activos</div>
          <div style={{ fontSize: 11, color: themeColor("muted"), marginBottom: 6, lineHeight: 1.35 }}>
            Muestra solo contingencias críticas y altas que siguen activas para priorizar atención y escalamiento.
          </div>
          {(() => {
            const crisisCases = visibleCases.filter((c) => ["CRITICA", "ALTA"].includes(c.criticality) && !["Resuelto", "Cerrado"].includes(normalizeStatus(c.status)));
            return (
              <>
                <div style={{ fontSize: 12, color: themeColor("muted"), marginTop: 2, marginBottom: 6 }}>
                  {crisisCases.length} {crisisCases.length === 1 ? "caso activo" : "casos activos"}
                </div>
                {crisisCases.map((c) => (
                  <div key={c.id} style={{ ...(Sx.card as React.CSSProperties), borderLeft: `4px solid ${critColor(c.criticality)}`, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                    <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "monospace", color: themeColor("muted"), fontSize: "11px" }}>{c.id}</span>
                      <span style={{ fontWeight: 600 }}>{c.summary}</span>
                      <gate.Badge style={Sx.badge?.(critColor(c.criticality)) as React.CSSProperties} size="sm">{c.criticality}</gate.Badge>
                      <RecBadge c={c} /><DivBadge gate={gate} c={c} />
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button type="button" style={Sx.btn?.("primary") as React.CSSProperties} onClick={() => { const found = cases.find((x) => x.id === c.id) ?? null; setSelectedCase(found); setView("detail"); }}>Ver</button>
                      {canDo("assign", currentUser, c) && <button type="button" style={Sx.btn?.("warning") as React.CSSProperties} onClick={() => changeStatus(c.id, "Escalado")}>{(gate.UI_TEXT_GOVERNANCE.buttons as { escalate?: string })?.escalate}</button>}
                    </div>
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 12, color: themeColor("muted"), marginBottom: 8 }}>
            Mostrando: {quickFilterDisplayLabel[quickFilter]} · {quickFilteredCases.length} {quickFilteredCases.length === 1 ? "caso" : "casos"}
          </div>
          {(() => {
            const KNOWN_STATUSES = ["Nuevo", "Recepcionado por DR", "En gestión", "Escalado", "Mitigado", "Resuelto", "Cerrado"];
            const unknownCases = quickFilteredCases.filter((c) => normalizeStatus(c.status) === "Otros / Desconocido");
            return (
              <>
                {KNOWN_STATUSES.map((st) => {
                  const bucket = quickFilteredCases.filter((c) => normalizeStatus(c.status) === st);
                  if (!bucket.length) return null;
                  return (
                    <div key={st} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(st as CaseStatus) }} />
                        <span style={{ fontWeight: 600, fontSize: "12px", color: themeColor("mutedAlt") }}>{st} ({bucket.length})</span>
                      </div>
                      {bucket.map((c) => <CaseCard key={c.id} gate={gate} c={c} onClick={() => { const found = cases.find((x) => x.id === c.id) ?? null; setSelectedCase(found); setView("detail"); }} />)}
                    </div>
                  );
                })}
                {unknownCases.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: themeColor("muted") }} />
                      <span style={{ fontWeight: 600, fontSize: "12px", color: themeColor("mutedAlt") }}>Otros / Desconocido ({unknownCases.length})</span>
                    </div>
                    {unknownCases.map((c) => <CaseCard key={c.id} gate={gate} c={c} onClick={() => { const found = cases.find((x) => x.id === c.id) ?? null; setSelectedCase(found); setView("detail"); }} />)}
                  </div>
                )}
              </>
            );
          })()}
          {quickFilteredCases.length === 0 && (
            <div style={{ ...(Sx.card as React.CSSProperties), padding: 10, opacity: 0.85 }}>
              No hay casos para los filtros actuales{filterState.region ? ` (Región: ${filterState.region})` : ""}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
