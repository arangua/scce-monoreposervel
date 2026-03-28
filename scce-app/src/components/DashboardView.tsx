/**
 * components/DashboardView.tsx
 * Panel de Operacion SCCE — vista principal de casos.
 * Extraida de App.tsx — R-4 refactor 2026-03-27.
 *
 * Lee del store directamente. Callbacks de navegacion via store.
 */
import React, { useMemo } from "react";
import type { CaseItem, CaseStatus } from "../domain/types";
import { critColor, statusColor, normalizeStatus } from "../domain/caseUtils";
import { canDo } from "../domain/policyEngine";
import { checkLocalDivergence } from "../domain/localDivergence";
import { isCentralFromContext, getActiveMembership } from "../domain/authSession";
import { themeColor } from "../theme";
import { Badge } from "../ui/Badge";
import { IconButton } from "../components/IconButton";
import { UI_TEXT } from "../config/uiTextStandard";
import { CONFIG_REGIONS } from "../domain/catalog";
import { useAppStore } from "../store/useAppStore";
import { useCases } from "../hooks/useCases";
import { useAssignedLocalScope } from "../hooks/useAssignedLocalScope";
import { CaseCard, RecBadge, DivBadge } from "./CaseCard";

const CONFIG = { regions: CONFIG_REGIONS };

// Subset de estilos (mismo patron que App.tsx S)
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
  btn: (v = "primary") =>
    ({
      background:
        ({
          primary: themeColor("primary"),
          success: themeColor("success"),
          danger: themeColor("danger"),
          warning: themeColor("warning"),
          dark: themeColor("textSecondary"),
        } as Record<string, string>)[v] || themeColor("primary"),
      color: themeColor("white"),
      border: "none",
      padding: "6px 12px",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "12px",
      fontWeight: 500,
    }) as React.CSSProperties,
  inp: {
    background: themeColor("bgSurface"),
    border: "1px solid #e5e7eb",
    borderRadius: "4px",
    padding: "6px 8px",
    color: themeColor("textPrimary"),
    fontSize: "13px",
    width: "100%",
    boxSizing: "border-box",
  } as React.CSSProperties,
  g4: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: "8px",
  } as React.CSSProperties,
};

// ── Helper local (solo para filtro visibleCases) ───────────────────────────
function getCaseLocalIdSafe(
  c: { localScope?: string; localRef?: { idLocal?: string }; localSnapshot?: { idLocal?: string } | null },
  localCatalogById: Map<string, unknown>
): string | null {
  if (c?.localScope === "REGIONAL") return null;
  const raw =
    (c as { localRef?: { idLocal?: string } })?.localRef?.idLocal ??
    (c as { localSnapshot?: { idLocal?: string } | null })?.localSnapshot?.idLocal ??
    null;
  if (!raw) return null;
  const id = String(raw);
  return localCatalogById.has(id) ? id : null;
}

// ── DashboardView ─────────────────────────────────────────────────────────
export function DashboardView() {
  const {
    cases,
    localCatalog,
    currentUser,
    activeRegion,
    filterState, setFilterState,
    crisisMode, setCrisisMode,
    setSelectedCase, setView,
    membershipScopes,
  } = useAppStore();

  const effectiveMembership = getActiveMembership();
  const isCentral = isCentralFromContext(effectiveMembership, currentUser?.role);

  const regionOptions = useMemo(() => {
    const entriesAll = Object.entries(CONFIG.regions).map(([code, d]) => ({
      code,
      name: (d as { name?: string }).name ?? code,
    }));
    if (isCentral) return [{ code: "ALL", name: "Todas las regiones" }, ...entriesAll];
    const mid = effectiveMembership?.id;
    const mode =
      effectiveMembership?.regionScopeMode ??
      (mid ? membershipScopes[mid]?.regionScopeMode : undefined);
    const scope =
      effectiveMembership?.regionScope ??
      (mid ? membershipScopes[mid]?.regionScope : undefined);
    if (mode === "LIST" && Array.isArray(scope) && scope.length) {
      const allowed = new Set(scope);
      return entriesAll.filter((e) => allowed.has(e.code));
    }
    const rc =
      effectiveMembership?.regionCode ?? (mid ? membershipScopes[mid]?.regionCode : undefined);
    if (rc) return entriesAll.filter((e) => e.code === rc);
    return entriesAll;
  }, [isCentral, effectiveMembership, membershipScopes]);

  const regionEffective = isCentral
    ? filterState.region || activeRegion || "ALL"
    : effectiveMembership?.regionCode || "";

  // R-4: scope de local/comuna delegado al hook canonico
  const {
    fixedLocalRole,
    assignedLocalIdEffective,
    assignedLocal,
    assignedCommuneEffective,
    localCatalogById,
  } = useAssignedLocalScope();

  const { changeStatus, recepcionar } = useCases({
    assignedCommuneEffective,
    assignedLocalIdEffective,
  });

  const divergencias = useMemo(
    () =>
      cases
        .filter((c) => !["Resuelto", "Cerrado"].includes(c.status))
        .map((c) => ({ caseId: c.id, caseSummary: c.summary, div: checkLocalDivergence(c, localCatalog) }))
        .filter((x) => x.div !== null),
    [cases, localCatalog]
  );

  const visibleCases = useMemo(
    () =>
      cases.filter((c) => {
        if (fixedLocalRole) {
          if (!assignedLocalIdEffective || !localCatalogById.has(assignedLocalIdEffective))
            return false;
          const cid = getCaseLocalIdSafe(c, localCatalogById);
          if (cid !== assignedLocalIdEffective) return false;
        }
        const regionToFilter =
          filterState.region ||
          (isCentral && filterState.commune && activeRegion ? activeRegion : null);
        if (regionToFilter) {
          const caseRegion =
            (c as { region?: string; regionCode?: string }).regionCode ??
            (c as { region?: string; regionCode?: string }).region ??
            null;
          if (!caseRegion) return false;
          if (caseRegion !== regionToFilter) return false;
        }
        if (!fixedLocalRole) {
          if (!canDo("viewAll", currentUser, c)) {
            if (c.createdBy !== currentUser?.id && c.assignedTo !== currentUser?.id) return false;
          }
        }
        if (filterState.criticality && c.criticality !== filterState.criticality) return false;
        if (filterState.status) {
          if (normalizeStatus(c.status) !== normalizeStatus(filterState.status)) return false;
        }
        if (filterState.commune && c.commune !== filterState.commune) return false;
        if (filterState.search) {
          const q = filterState.search.toLowerCase();
          const localText =
            (c.local || "") +
            " " +
            ((c as { localSnapshot?: { nombre?: string } }).localSnapshot?.nombre || "") +
            " " +
            ((c as { localRef?: { label?: string } }).localRef?.label || "");
          if (
            !String(c.summary ?? "").toLowerCase().includes(q) &&
            !String(c.id ?? "").toLowerCase().includes(q) &&
            !localText.toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      }),
    [cases, currentUser, activeRegion, filterState, fixedLocalRole, assignedLocalIdEffective, localCatalogById, isCentral]
  );

  const metrics = useMemo(
    () => ({
      total: visibleCases.length,
      critica: visibleCases.filter((c) => c.criticality === "CRITICA").length,
      alta: visibleCases.filter((c) => c.criticality === "ALTA").length,
      open: visibleCases.filter(
        (c) => !["Resuelto", "Cerrado"].includes(normalizeStatus(c.status))
      ).length,
      avgComp: visibleCases.length
        ? Math.round(
            visibleCases.reduce((s, c) => s + (c.completeness ?? 0), 0) / visibleCases.length
          )
        : 0,
      flagged: visibleCases.filter((c) => c.bypassFlagged && !c.bypassValidated).length,
    }),
    [visibleCases]
  );

  const regionsMap = CONFIG.regions as Record<
    string,
    { name?: string; communes?: Record<string, { name?: string }> }
  >;

  function openCase(c: CaseItem) {
    const found = cases.find((x) => x.id === c.id) ?? null;
    setSelectedCase(found);
    setView("detail");
  }

  const KNOWN_STATUSES = [
    "Nuevo",
    "Recepcionado por DR",
    "En gestion",
    "Escalado",
    "Mitigado",
    "Resuelto",
    "Cerrado",
  ];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "16px" }}>Panel de Operacion</h2>
          {metrics.critica > 0 && (
            <Badge style={S.badge(themeColor("danger"))} size="sm">
              {metrics.critica} CRITICOS
            </Badge>
          )}
          {metrics.flagged > 0 && (
            <Badge style={S.badge(themeColor("danger"))} size="sm">
              {metrics.flagged} {UI_TEXT.states.flagged}
            </Badge>
          )}
          {divergencias.length > 0 && (
            <Badge
              style={{ ...S.badge(themeColor("warning")) }}
              size="sm"
              onClick={() => setView("catalog")}
            >
              {divergencias.length} LOCAL(ES) MOD.
            </Badge>
          )}
        </div>
        <button
          style={S.btn(crisisMode ? "danger" : "dark")}
          onClick={() => setCrisisMode((p) => !p)}
        >
          {crisisMode ? "Normal" : "Crisis"}
        </button>
      </div>

      {/* Alerta divergencias */}
      {divergencias.length > 0 && (
        <div
          style={{
            ...S.card,
            background: themeColor("orangeBlock"),
            border: "1px solid #f9731644",
            marginBottom: 10,
          }}
        >
          <div
            style={{ color: themeColor("warning"), fontWeight: 700, fontSize: "12px", marginBottom: 6 }}
          >
            Locales modificados en catalogo post-creacion ({divergencias.length})
          </div>
          {divergencias.map((x) => (
            <div
              key={x.caseId}
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                marginBottom: 3,
                fontSize: "11px",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontFamily: "monospace", color: themeColor("muted") }}>{x.caseId}</span>
              <span style={{ color: themeColor("mutedAlt") }}>{x.caseSummary.slice(0, 40)}</span>
              <span style={{ color: themeColor("warning") }}>{x.div?.msg}</span>
              <button
                style={{ ...S.btn("dark"), fontSize: "9px", padding: "1px 6px" }}
                onClick={() => {
                  const found = cases.find((c: CaseItem) => c.id === x.caseId) ?? null;
                  setSelectedCase(found);
                  setView("detail");
                }}
              >
                Ver
              </button>
            </div>
          ))}
          <div style={{ fontSize: "10px", color: themeColor("muted"), marginTop: 4 }}>
            Los casos son validos. Verificar estado operacional del local.
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div style={{ ...S.g4, marginBottom: 10 }}>
        {[
          { l: "Total", v: metrics.total, c: themeColor("primary") },
          { l: "Abiertos", v: metrics.open, c: themeColor("warning") },
          { l: "Criticos+Altos", v: metrics.critica + metrics.alta, c: themeColor("danger") },
          { l: "Completitud", v: metrics.avgComp + "%", c: themeColor("success") },
        ].map((k) => (
          <div key={k.l} style={S.card}>
            <div style={{ color: k.c, fontSize: "22px", fontWeight: 700 }}>{k.v}</div>
            <div style={{ color: themeColor("muted"), fontSize: "11px" }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      {!crisisMode && (
        <div
          style={{
            ...S.card,
            marginBottom: 8,
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <select
            style={{ ...S.inp, width: "180px", borderColor: themeColor("primary") }}
            value={isCentral ? filterState.region || "ALL" : regionEffective}
            disabled={!isCentral}
            onChange={(e) => {
              if (!isCentral) return;
              const v = e.target.value;
              setFilterState((p) => ({ ...p, region: v === "ALL" ? "" : v, commune: "" }));
            }}
          >
            {regionOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.code} — {o.name}
              </option>
            ))}
          </select>
          <input
            style={{ ...S.inp, width: "150px" }}
            placeholder="ID, resumen, local..."
            value={filterState.search}
            onChange={(e) => setFilterState((p) => ({ ...p, search: e.target.value }))}
          />
          <select
            style={{ ...S.inp, width: "120px" }}
            value={filterState.criticality}
            onChange={(e) => setFilterState((p) => ({ ...p, criticality: e.target.value }))}
          >
            {["", "CRITICA", "ALTA", "MEDIA", "BAJA"].map((o) => (
              <option key={o} value={o}>
                {o || "Criticidad"}
              </option>
            ))}
          </select>
          <select
            style={{ ...S.inp, width: "130px" }}
            value={filterState.status}
            onChange={(e) => setFilterState((p) => ({ ...p, status: e.target.value }))}
          >
            {[
              "",
              "Nuevo",
              "Recepcionado por DR",
              "En gestion",
              "Escalado",
              "Mitigado",
              "Resuelto",
              "Cerrado",
            ].map((o) => (
              <option key={o} value={o}>
                {o || "Estado"}
              </option>
            ))}
          </select>
          <select
            style={{ ...S.inp, width: "150px" }}
            disabled={
              fixedLocalRole ||
              (isCentral ? !(filterState.region || activeRegion) : !filterState.region)
            }
            value={fixedLocalRole ? assignedCommuneEffective || "" : filterState.commune}
            onChange={(e) => {
              if (fixedLocalRole) return;
              const regionForCommune = isCentral
                ? filterState.region || activeRegion
                : filterState.region;
              if (!regionForCommune) return;
              setFilterState((p) => ({ ...p, commune: e.target.value }));
            }}
          >
            <option value="">Todas las comunas</option>
            {Object.entries(
              regionsMap[isCentral ? filterState.region || activeRegion : regionEffective]
                ?.communes || {}
            ).map(([k, v]) => (
              <option key={k} value={k}>
                {(v as { name?: string })?.name}
              </option>
            ))}
          </select>
          {fixedLocalRole && (
            <div
              style={{
                fontSize: 12,
                opacity: 0.85,
                color: assignedLocal ? themeColor("mutedAlt") : themeColor("warning"),
              }}
            >
              {assignedLocal
                ? `Comuna fijada: ${assignedLocal.nombre}`
                : "Sin local asignado valido"}
            </div>
          )}
          <IconButton
            onClick={() =>
              setFilterState((p) => ({
                ...p,
                criticality: "",
                status: "",
                commune: "",
                search: "",
                region: isCentral ? "" : regionEffective,
              }))
            }
            title="Limpiar filtros"
          >
            X
          </IconButton>
        </div>
      )}

      {/* Local asignado info */}
      {fixedLocalRole && (
        <div style={{ ...S.card, marginBottom: 8, padding: "8px 10px", fontSize: 13 }}>
          {assignedLocal ? (
            <div>
              Local asignado: {assignedLocal.nombre} — {assignedCommuneEffective}
            </div>
          ) : (
            <div>Sin local asignado valido — No se mostraran casos.</div>
          )}
        </div>
      )}

      {/* Lista de casos */}
      {crisisMode ? (
        <div>
          <div style={{ color: themeColor("danger"), fontWeight: 700, marginBottom: 8 }}>
            MODO CRISIS — Criticos y altos activos
          </div>
          {visibleCases
            .filter(
              (c) =>
                ["CRITICA", "ALTA"].includes(c.criticality) &&
                !["Resuelto", "Cerrado"].includes(normalizeStatus(c.status))
            )
            .map((c) => (
              <div
                key={c.id}
                style={{
                  ...S.card,
                  borderLeft: `4px solid ${critColor(c.criticality)}`,
                  marginBottom: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "monospace", color: themeColor("muted"), fontSize: "11px" }}>
                    {c.id}
                  </span>
                  <span style={{ fontWeight: 600 }}>{c.summary}</span>
                  <Badge style={S.badge(critColor(c.criticality))} size="sm">
                    {c.criticality}
                  </Badge>
                  <RecBadge c={c} />
                  <DivBadge c={c} />
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button style={S.btn("primary")} onClick={() => openCase(c)}>
                    Ver
                  </button>
                  {canDo("assign", currentUser, c) && (
                    <button style={S.btn("warning")} onClick={() => changeStatus(c.id, "Escalado")}>
                      Escalar
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div>
          {KNOWN_STATUSES.map((st) => {
            const bucket = visibleCases.filter((c) => normalizeStatus(c.status) === st);
            if (!bucket.length) return null;
            return (
              <div key={st} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: statusColor(st as CaseStatus),
                    }}
                  />
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "12px",
                      color: themeColor("mutedAlt"),
                    }}
                  >
                    {st} ({bucket.length})
                  </span>
                </div>
                {bucket.map((c) => (
                  <CaseCard key={c.id} c={c} onClick={() => openCase(c)} />
                ))}
              </div>
            );
          })}
          {(() => {
            const unknownCases = visibleCases.filter(
              (c) => normalizeStatus(c.status) === "Otros / Desconocido"
            );
            if (!unknownCases.length) return null;
            return (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div
                    style={{ width: 8, height: 8, borderRadius: "50%", background: themeColor("muted") }}
                  />
                  <span style={{ fontWeight: 600, fontSize: "12px", color: themeColor("mutedAlt") }}>
                    Otros / Desconocido ({unknownCases.length})
                  </span>
                </div>
                {unknownCases.map((c) => (
                  <CaseCard key={c.id} c={c} onClick={() => openCase(c)} />
                ))}
              </div>
            );
          })()}
          {visibleCases.length === 0 && (
            <div style={{ ...S.card, padding: 10, opacity: 0.85 }}>
              No hay casos para los filtros actuales
              {filterState.region ? ` (Region: ${filterState.region})` : ""}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
