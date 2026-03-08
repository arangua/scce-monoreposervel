/**
 * Vista Catálogo Maestro de Locales. Recibe gate con datos y callbacks inyectados.
 */
import React, { useState, useMemo } from "react";
import type { CatalogGate } from "./types";

export interface CatalogViewProps {
  gate: CatalogGate;
}

export function CatalogView({ gate }: CatalogViewProps) {
  const {
    activeRegion,
    regionOptions,
    regionsMap,
    localCatalog,
    divergencias,
    cases,
    S,
    themeColor,
    catalogSelfCheck,
    currentUser,
    catalogAddLocal,
    catalogToggleEleccion,
    catalogDeactivate,
    catalogReactivate,
    auditLog,
    USERS,
    fmtDate,
    UI_TEXT_GOVERNANCE,
    Badge,
  } = gate;

  const [catRegion, setCatRegion] = useState(activeRegion);
  const [catCommune, setCatCommune] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [searchCat, setSearchCat] = useState("");

  const violations = useMemo(() => catalogSelfCheck(localCatalog), [localCatalog, catalogSelfCheck]);
  const filtered = useMemo(
    () =>
      localCatalog.filter((l) => {
        if (catRegion !== "ALL" && l.region !== catRegion) return false;
        if (catCommune && l.commune !== catCommune) return false;
        if (!showInactive && !l.activoGlobal) return false;
        if (searchCat && !l.nombre.toLowerCase().includes(searchCat.toLowerCase())) return false;
        return true;
      }),
    [localCatalog, catRegion, catCommune, showInactive, searchCat]
  );
  const rData = catRegion === "ALL" ? undefined : regionsMap[catRegion];
  const Sx = S as Record<string, (...args: unknown[]) => unknown> & Record<string, React.CSSProperties>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: "16px" }}>🗂 Catálogo Maestro de Locales</h2>
        <Badge style={{ ...(Sx.badge?.(themeColor("mutedDarker")) as React.CSSProperties), fontSize: "9px" }} size="xs">
          v1.9 · Modelo B + Snapshots
        </Badge>
      </div>
      {violations.length > 0 && (
        <div style={{ ...(Sx.card as React.CSSProperties), background: themeColor("redBlock"), border: "2px solid #ef4444", marginBottom: 10 }}>
          <div style={{ color: themeColor("danger"), fontWeight: 700, marginBottom: 4 }}>⛔ INVARIANTES VIOLADAS ({violations.length})</div>
          {violations.map((v, i) => (
            <div key={`viol-${i}-${String(v).slice(0, 50)}`} style={{ fontSize: "11px", color: themeColor("legacyRedText") }}>{v}</div>
          ))}
        </div>
      )}
      {divergencias.length > 0 && (
        <div style={{ ...(Sx.card as React.CSSProperties), background: themeColor("orangeBlock"), border: "1px solid #f9731644", marginBottom: 10 }}>
          <div style={{ color: themeColor("warning"), fontWeight: 700, fontSize: "12px", marginBottom: 4 }}>⚡ {divergencias.length} caso(s) abierto(s) afectado(s) por cambios en catálogo</div>
          {divergencias.map((x) => (
            <div key={x.caseId} style={{ fontSize: "11px", color: themeColor("mutedAlt"), marginBottom: 2 }}>
              <span style={{ fontFamily: "monospace", color: themeColor("muted") }}>{x.caseId}</span> — {x.div?.msg}
            </div>
          ))}
        </div>
      )}
      <div style={{ ...(Sx.g4 as React.CSSProperties), marginBottom: 10 }}>
        {[
          { l: "Total", v: localCatalog.length, c: themeColor("primary") },
          { l: "Activos global", v: localCatalog.filter((l) => l.activoGlobal).length, c: themeColor("success") },
          { l: "Activos elección", v: localCatalog.filter((l) => l.activoEnEleccionActual).length, c: themeColor("purpleLight") },
          { l: "Inactivos (SD)", v: localCatalog.filter((l) => !l.activoGlobal).length, c: themeColor("danger") },
        ].map((k) => (
          <div key={k.l} style={Sx.card as React.CSSProperties}>
            <div style={{ color: k.c, fontSize: "20px", fontWeight: 700 }}>{k.v}</div>
            <div style={{ color: themeColor("muted"), fontSize: "11px" }}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={{ ...(Sx.card as React.CSSProperties), marginBottom: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <select style={{ ...(Sx.inp as React.CSSProperties), width: "180px" }} value={catRegion} onChange={(e) => { setCatRegion(e.target.value); setCatCommune(""); }}>
          {regionOptions.map((o) => (
            <option key={o.code} value={o.code}>{o.name}</option>
          ))}
        </select>
        <select style={{ ...(Sx.inp as React.CSSProperties), width: "160px" }} value={catCommune} onChange={(e) => setCatCommune(e.target.value)} disabled={catRegion === "ALL"}>
          <option value="">Todas las comunas</option>
          {Object.entries(rData?.communes || {}).map(([k, v]) => (
            <option key={k} value={k}>{(v as { name?: string }).name}</option>
          ))}
        </select>
        <input style={{ ...(Sx.inp as React.CSSProperties), width: "160px" }} placeholder="🔍 Buscar local..." value={searchCat} onChange={(e) => setSearchCat(e.target.value)} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "12px", color: themeColor("mutedAlt"), whiteSpace: "nowrap" }} htmlFor="cat-show-inactive">
          <input id="cat-show-inactive" type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Ver inactivos
        </label>
      </div>
      <div style={{ ...(Sx.card as React.CSSProperties), marginBottom: 10, border: "1px solid #22c55e44" }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>+ AGREGAR LOCAL</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={Sx.lbl as React.CSSProperties} htmlFor="cat-region">Región</label>
            <select id="cat-region" style={Sx.inp as React.CSSProperties} value={catRegion} onChange={(e) => { setCatRegion(e.target.value); setCatCommune(""); }}>
              {Object.entries(regionsMap).map(([k, v]) => (
                <option key={k} value={k}>{v?.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={Sx.lbl as React.CSSProperties} htmlFor="cat-commune">Comuna *</label>
            <select id="cat-commune" style={Sx.inp as React.CSSProperties} value={catCommune} onChange={(e) => setCatCommune(e.target.value)}>
              <option value="">Seleccione...</option>
              {Object.entries(rData?.communes || {}).map(([k, v]) => (
                <option key={k} value={k}>{v.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={Sx.lbl as React.CSSProperties} htmlFor="cat-nombre">Nombre *</label>
            <input
              id="cat-nombre"
              style={Sx.inp as React.CSSProperties}
              placeholder="Ej: Liceo Nuevo 2027"
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (!currentUser) return;
                  catalogAddLocal(newNombre, catRegion, catCommune, currentUser);
                  setNewNombre("");
                }
              }}
            />
          </div>
          <button type="button" style={{ ...(Sx.btn?.("success") as React.CSSProperties), height: 32, whiteSpace: "nowrap" }} onClick={() => { if (!currentUser) return; catalogAddLocal(newNombre, catRegion, catCommune, currentUser); setNewNombre(""); }}>+ Agregar</button>
        </div>
      </div>
      <div style={Sx.card as React.CSSProperties}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 80px 80px 70px 120px", gap: 6, padding: "4px 0", borderBottom: "1px solid #e5e7eb", fontSize: "10px", color: themeColor("mutedDark"), fontWeight: 700 }}>
          <span>LOCAL</span><span>CÓDIGO</span><span>GLOBAL</span><span>ELECCIÓN</span><span>ORIGEN</span><span>ACCIONES</span>
        </div>
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {filtered.length === 0 && <div style={{ color: themeColor("mutedDark"), textAlign: "center", padding: 20 }}>Sin locales para los filtros</div>}
          {filtered.map((l) => {
            const hasDivCase = divergencias.some((d) => cases.find((c) => c.id === d.caseId)?.localSnapshot?.idLocal === l.idLocal);
            return (
              <div key={l.idLocal} style={{ display: "grid", gridTemplateColumns: "1fr 110px 80px 80px 70px 120px", gap: 6, padding: "5px 0", borderBottom: "1px solid #e5e7eb", alignItems: "center", opacity: l.activoGlobal ? 1 : 0.5 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "12px", color: l.activoGlobal ? themeColor("legacySlate") : themeColor("mutedDark"), display: "flex", alignItems: "center", gap: 4 }}>
                    {l.nombre}
                    {hasDivCase && <Badge style={{ ...(Sx.badge?.(themeColor("warning")) as React.CSSProperties), fontSize: "8px" }} size="xs">⚡ caso activo</Badge>}
                  </div>
                  <div style={{ fontSize: "10px", color: themeColor("mutedDark") }}>{regionsMap[l.region]?.communes?.[l.commune]?.name || l.commune}</div>
                  {l.fechaDesactivacion && <div style={{ fontSize: "9px", color: themeColor("danger") }}>SD: {fmtDate(l.fechaDesactivacion)}</div>}
                </div>
                <span style={{ fontFamily: "monospace", fontSize: "10px", color: themeColor("mutedDark") }}>{l.idLocal}</span>
                <Badge style={Sx.badge?.(l.activoGlobal ? themeColor("success") : themeColor("danger")) as React.CSSProperties} size="sm">{l.activoGlobal ? "Activo" : "Inactivo"}</Badge>
                <Badge style={Sx.badge?.(l.activoEnEleccionActual ? themeColor("purpleLight") : themeColor("mutedDarker")) as React.CSSProperties} size="sm">{l.activoEnEleccionActual ? "Sí" : "No"}</Badge>
                <span style={{ fontSize: "10px", color: themeColor("mutedDark") }}>{l.origenSeed ? "Seed" : "Manual"}</span>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {l.activoGlobal ? (
                    <>
                      <button type="button" style={{ ...(Sx.btn?.(l.activoEnEleccionActual ? "dark" : "primary") as React.CSSProperties), fontSize: "9px", padding: "2px 6px" }} onClick={() => { if (!currentUser) return; catalogToggleEleccion(l.idLocal, currentUser); }}>{l.activoEnEleccionActual ? "↓ Elec." : "↑ Elec."}</button>
                      <button type="button" style={{ ...(Sx.btn?.("danger") as React.CSSProperties), fontSize: "9px", padding: "2px 6px" }} onClick={() => { if (!currentUser) return; if (globalThis.confirm(`¿Desactivar "${l.nombre}"?${hasDivCase ? " ⚠️ Tiene caso(s) activo(s)" : ""}`)) catalogDeactivate(l.idLocal, currentUser); }}>SD</button>
                    </>
                  ) : (
                    <button type="button" style={{ ...(Sx.btn?.("success") as React.CSSProperties), fontSize: "9px", padding: "2px 6px" }} onClick={() => { if (!currentUser) return; catalogReactivate(l.idLocal, currentUser); }}>Reactiv.</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ ...(Sx.card as React.CSSProperties), marginTop: 10 }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>AUDITORÍA DE CATÁLOGO</div>
        <div style={{ maxHeight: 130, overflowY: "auto" }}>
          {[...auditLog]
            .filter((e) => ["LOCAL_CREATED", "LOCAL_DEACTIVATED", "LOCAL_REACTIVATED", "LOCAL_ELECTION_TOGGLED"].includes(e.type ?? ""))
            .slice(-20)
            .reverse()
            .map((e, i) => {
              const u = USERS.find((u) => u.id === e.actor);
              const G = UI_TEXT_GOVERNANCE;
              const tc: Record<string, string> = { LOCAL_CREATED: themeColor("success"), LOCAL_DEACTIVATED: themeColor("danger"), LOCAL_REACTIVATED: themeColor("warning"), LOCAL_ELECTION_TOGGLED: themeColor("purpleLight") };
              const eventLabel = (G.eventLabels as Record<string, string>)[e.type ?? ""] ?? e.type;
              const actorLabel = u?.name ?? (e.role && (G.institutionalRole as Record<string, string>)[e.role]) ?? ((e.actor?.length ?? 0) > 20 ? "Usuario" : e.actor) ?? "—";
              const displaySummary = e.summary?.trim() ? e.summary : eventLabel;
              return (
                <div key={e.hash ?? `audit-cat-${e.at}-${e.actor}-${i}`} style={{ display: "flex", gap: 6, fontSize: "10px", padding: "3px 0", borderBottom: "1px solid #e5e7eb", flexWrap: "wrap" }}>
                  <span style={{ color: themeColor("mutedDark"), width: 108, flexShrink: 0 }}>{fmtDate(e.at)}</span>
                  <span style={{ color: tc[e.type ?? ""] || themeColor("muted"), fontWeight: 600, width: 160, flexShrink: 0 }}>{eventLabel}</span>
                  <span style={{ color: themeColor("muted"), width: 100, flexShrink: 0 }}>{actorLabel}</span>
                  <span style={{ color: themeColor("mutedAlt"), flexGrow: 1 }}>{displaySummary}</span>
                </div>
              );
            })}
          {!auditLog.some((e) => ["LOCAL_CREATED", "LOCAL_DEACTIVATED", "LOCAL_REACTIVATED", "LOCAL_ELECTION_TOGGLED"].includes(e.type ?? "")) && (
            <div style={{ color: themeColor("mutedDark"), textAlign: "center", padding: 12 }}>Sin operaciones de catálogo</div>
          )}
        </div>
      </div>
    </div>
  );
}
