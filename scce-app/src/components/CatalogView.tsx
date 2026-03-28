/**
 * components/CatalogView.tsx
 * Catálogo maestro de locales — extraído de App.tsx (R-4).
 */
import React, { useMemo, useState } from "react";
import { USERS, type PolicyUser } from "../domain/policyEngine";
import { CONFIG_REGIONS, catalogSelfCheck, newLocalId } from "../domain/catalog";
import { fmtDate, nowISO } from "../domain/date";
import { checkLocalDivergence } from "../domain/localDivergence";
import { appendEvent } from "../domain/audit";
import { isCentralFromContext, getActiveMembership } from "../domain/authSession";
import { themeColor } from "../theme";
import { Badge } from "../ui/Badge";
import { UI_TEXT } from "../config/uiTextStandard";
import { useAppStore } from "../store/useAppStore";

const CONFIG = { regions: CONFIG_REGIONS };
const regionsMap = CONFIG.regions as Record<
  string,
  { name?: string; communes?: Record<string, { name?: string }> }
>;

type User = PolicyUser;

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
  lbl: {
    display: "block",
    marginBottom: "3px",
    color: themeColor("textSecondary"),
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
  } as React.CSSProperties,
  g4: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: "8px",
  } as React.CSSProperties,
};

export function CatalogView() {
  const {
    localCatalog,
    setLocalCatalog,
    cases,
    auditLog,
    setAuditLog,
    activeRegion,
    currentUser,
    membershipScopes,
    setNotification,
  } = useAppStore();

  const notify = (msg: string, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  function catalogAddLocal(nombre: string, region: string, commune: string, actor: User) {
    if (!nombre?.trim()) return notify(UI_TEXT.errors.nombreObligatorio, "error");
    if (!commune) return notify(UI_TEXT.errors.seleccioneComuna, "error");
    if (localCatalog.find((l) => l.nombre === nombre && l.region === region && l.commune === commune))
      return notify(`Ya existe "${nombre}" en esa comarca`, "error");
    const entry = {
      idLocal: newLocalId(),
      nombre: nombre.trim(),
      region,
      commune,
      activoGlobal: true,
      activoEnEleccionActual: true,
      fechaCreacion: nowISO(),
      fechaDesactivacion: null,
      origenSeed: false,
    };
    setLocalCatalog((prev) => [...prev, entry]);
    setAuditLog((prev) =>
      appendEvent(prev, "LOCAL_CREATED", actor.id, actor.role, null, `Local: "${nombre}" [${region}/${commune}]`)
    );
    notify(`Local "${nombre}" añadido`, "success");
  }

  function catalogDeactivate(idLocal: string, actor: User) {
    const e = localCatalog.find((l) => l.idLocal === idLocal);
    if (!e || !e.activoGlobal) return notify("Ya está desactivado", "error");
    setLocalCatalog((prev) =>
      prev.map((l) =>
        l.idLocal !== idLocal
          ? l
          : { ...l, activoGlobal: false, activoEnEleccionActual: false, fechaDesactivacion: nowISO() }
      )
    );
    setAuditLog((prev) =>
      appendEvent(prev, "LOCAL_DEACTIVATED", actor.id, actor.role, null, `SD: "${e.nombre}" [${idLocal}]`)
    );
    notify(`Local "${e.nombre}" desactivado`, "warning");
  }

  function catalogReactivate(idLocal: string, actor: User) {
    const e = localCatalog.find((l) => l.idLocal === idLocal);
    if (!e || e.activoGlobal) return notify("Ya está activo", "error");
    setLocalCatalog((prev) =>
      prev.map((l) => (l.idLocal !== idLocal ? l : { ...l, activoGlobal: true, fechaDesactivacion: null }))
    );
    setAuditLog((prev) =>
      appendEvent(prev, "LOCAL_REACTIVATED", actor.id, actor.role, null, `Reactivado: "${e.nombre}" [${idLocal}]`)
    );
    notify(`Local "${e.nombre}" reactivado`, "success");
  }

  function catalogToggleEleccion(idLocal: string, actor: User) {
    const e = localCatalog.find((l) => l.idLocal === idLocal);
    if (!e) return;
    if (!e.activoGlobal) return notify("No se puede activar en elección: local desactivado globalmente", "error");
    const next = !e.activoEnEleccionActual;
    setLocalCatalog((prev) =>
      prev.map((l) => (l.idLocal !== idLocal ? l : { ...l, activoEnEleccionActual: next }))
    );
    setAuditLog((prev) =>
      appendEvent(
        prev,
        "LOCAL_ELECTION_TOGGLED",
        actor.id,
        actor.role,
        null,
        `"${e.nombre}": elección → ${next}`
      )
    );
    notify(`"${e.nombre}": elección → ${next ? "ACTIVO" : "INACTIVO"}`, "success");
  }

  const effectiveMembership = getActiveMembership();
  const isCentral = isCentralFromContext(effectiveMembership, currentUser?.role);

  const regionOptions = useMemo(() => {
    const entriesAll = Object.entries(CONFIG.regions).map(([code, d]) => ({
      code,
      name: (d as { name?: string }).name ?? code,
    }));
    if (isCentral) return [{ code: "ALL", name: "Todas las regiones" }, ...entriesAll];
    const mid = effectiveMembership?.id;
    const mode = effectiveMembership?.regionScopeMode ?? (mid ? membershipScopes[mid]?.regionScopeMode : undefined);
    const scope = effectiveMembership?.regionScope ?? (mid ? membershipScopes[mid]?.regionScope : undefined);
    if (mode === "LIST" && Array.isArray(scope) && scope.length) {
      const allowed = new Set(scope);
      return entriesAll.filter((e) => allowed.has(e.code));
    }
    const rc = effectiveMembership?.regionCode ?? (mid ? membershipScopes[mid]?.regionCode : undefined);
    if (rc) return entriesAll.filter((e) => e.code === rc);
    return entriesAll;
  }, [isCentral, effectiveMembership, membershipScopes]);

  const divergencias = useMemo(
    () =>
      cases
        .filter((c) => !["Resuelto", "Cerrado"].includes(c.status))
        .map((c) => ({ caseId: c.id, caseSummary: c.summary, div: checkLocalDivergence(c, localCatalog) }))
        .filter((x) => x.div !== null),
    [cases, localCatalog]
  );

  // Inicializar con la primera región disponible según scope del usuario
  const defaultRegion = regionOptions[0]?.code ?? activeRegion;
  const [catRegion, setCatRegion] = useState(() => {
    // Si activeRegion está en las opciones disponibles, usarla
    if (regionOptions.some(o => o.code === activeRegion)) return activeRegion;
    // Si no, usar la primera opción disponible (excluir ALL)
    return regionOptions.find(o => o.code !== "ALL")?.code ?? regionOptions[0]?.code ?? activeRegion;
  });
  const [catCommune, setCatCommune] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [searchCat, setSearchCat] = useState("");

  const violations = useMemo(() => catalogSelfCheck(localCatalog), [localCatalog]);
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

  if (!currentUser) return null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 6 }}>
        <h2 style={{ margin: 0, fontSize: "16px" }}>🗂 Catálogo Maestro de Locales</h2>
        <Badge style={{ ...S.badge(themeColor("mutedDarker")), fontSize: "9px" }} size="xs">
          v1.9 · Modelo B + Snapshots
        </Badge>
      </div>
      {violations.length > 0 && (
        <div style={{ ...S.card, background: themeColor("redBlock"), border: "2px solid #ef4444", marginBottom: 10 }}>
          <div style={{ color: themeColor("danger"), fontWeight: 700, marginBottom: 4 }}>
            ⛔ INVARIANTES VIOLADAS ({violations.length})
          </div>
          {violations.map((v, i) => (
            <div key={i} style={{ fontSize: "11px", color: themeColor("legacyRedText") }}>
              {v}
            </div>
          ))}
        </div>
      )}
      {divergencias.length > 0 && (
        <div style={{ ...S.card, background: themeColor("orangeBlock"), border: "1px solid #f9731644", marginBottom: 10 }}>
          <div style={{ color: themeColor("warning"), fontWeight: 700, fontSize: "12px", marginBottom: 4 }}>
            ⚡ {divergencias.length} caso(s) abierto(s) afectado(s) por cambios en catálogo
          </div>
          {divergencias.map((x) => (
            <div key={x.caseId} style={{ fontSize: "11px", color: themeColor("mutedAlt"), marginBottom: 2 }}>
              <span style={{ fontFamily: "monospace", color: themeColor("muted") }}>{x.caseId}</span> — {x.div?.msg}
            </div>
          ))}
        </div>
      )}
      <div style={{ ...S.g4, marginBottom: 10 }}>
        {[
          { l: "Total", v: localCatalog.length, c: themeColor("primary") },
          { l: "Activos global", v: localCatalog.filter((l) => l.activoGlobal).length, c: themeColor("success") },
          {
            l: "Activos elección",
            v: localCatalog.filter((l) => l.activoEnEleccionActual).length,
            c: themeColor("purpleLight"),
          },
          { l: "Inactivos (SD)", v: localCatalog.filter((l) => !l.activoGlobal).length, c: themeColor("danger") },
        ].map((k) => (
          <div key={k.l} style={S.card}>
            <div style={{ color: k.c, fontSize: "20px", fontWeight: 700 }}>{k.v}</div>
            <div style={{ color: themeColor("muted"), fontSize: "11px" }}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={{ ...S.card, marginBottom: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <select
          style={{ ...S.inp, width: "200px", background: "var(--bg-surface)", color: "var(--text-primary)", borderColor: "var(--border)" }}
          value={catRegion}
          onChange={(e) => {
            setCatRegion(e.target.value);
            setCatCommune("");
          }}
        >
          {regionOptions.map((o) => (
            <option key={o.code} value={o.code}>
              {o.code !== "ALL" ? `${o.code} — ${o.name}` : o.name}
            </option>
          ))}
        </select>
        <select
          style={{ ...S.inp, width: "180px", background: "var(--bg-surface)", color: "var(--text-primary)", borderColor: "var(--border)" }}
          value={catCommune}
          onChange={(e) => setCatCommune(e.target.value)}
          disabled={catRegion === "ALL"}
        >
          <option value="">Todas las comunas</option>
          {Object.entries(rData?.communes || {}).map(([k, v]) => (
            <option key={k} value={k}>
              {(v as { name?: string }).name}
            </option>
          ))}
        </select>
        <input style={{ ...S.inp, width: "160px" }} placeholder="🔍 Buscar local..." value={searchCat} onChange={(e) => setSearchCat(e.target.value)} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "12px", color: themeColor("mutedAlt"), whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Ver inactivos
        </label>
      </div>
      <div style={{ ...S.card, marginBottom: 10, border: "1px solid #22c55e44" }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>+ AGREGAR LOCAL</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <label style={S.lbl}>Región</label>
            <select
              style={{ ...S.inp, background: "var(--bg-surface)", color: "var(--text-primary)", borderColor: "var(--border)" }}
              value={catRegion}
              onChange={(e) => {
                setCatRegion(e.target.value);
                setCatCommune("");
              }}
            >
              {regionOptions
                .filter(o => o.code !== "ALL")
                .map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.code} — {o.name}
                  </option>
                ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={S.lbl}>Comuna *</label>
            <select
              style={{ ...S.inp, background: "var(--bg-surface)", color: "var(--text-primary)", borderColor: "var(--border)" }}
              value={catCommune}
              onChange={(e) => setCatCommune(e.target.value)}
            >
              <option value="">Seleccione...</option>
              {Object.entries(rData?.communes || {}).map(([k, v]) => (
                <option key={k} value={k}>
                  {(v as { name?: string }).name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={S.lbl}>Nombre *</label>
            <input
              style={S.inp}
              placeholder="Ej: Liceo Nuevo 2027"
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  catalogAddLocal(newNombre, catRegion, catCommune, currentUser);
                  setNewNombre("");
                }
              }}
            />
          </div>
          <button
            style={{ ...S.btn("success"), height: 32, whiteSpace: "nowrap" }}
            onClick={() => {
              catalogAddLocal(newNombre, catRegion, catCommune, currentUser);
              setNewNombre("");
            }}
          >
            + Agregar
          </button>
        </div>
      </div>
      <div style={S.card}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 110px 80px 80px 70px 120px",
            gap: 6,
            padding: "4px 0",
            borderBottom: "1px solid #e5e7eb",
            fontSize: "10px",
            color: themeColor("mutedDark"),
            fontWeight: 700,
          }}
        >
          <span>LOCAL</span>
          <span>CÓDIGO</span>
          <span>GLOBAL</span>
          <span>ELECCIÓN</span>
          <span>ORIGEN</span>
          <span>ACCIONES</span>
        </div>
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div style={{ color: themeColor("mutedDark"), textAlign: "center", padding: 20 }}>Sin locales para los filtros</div>
          )}
          {filtered.map((l) => {
            const hasDivCase = divergencias.some((d) => cases.find((c) => c.id === d.caseId)?.localSnapshot?.idLocal === l.idLocal);
            return (
              <div
                key={l.idLocal}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px 80px 80px 70px 120px",
                  gap: 6,
                  padding: "5px 0",
                  borderBottom: "1px solid #e5e7eb",
                  alignItems: "center",
                  opacity: l.activoGlobal ? 1 : 0.5,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: "12px",
                      color: l.activoGlobal ? themeColor("legacySlate") : themeColor("mutedDark"),
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {l.nombre}
                    {hasDivCase && (
                      <Badge style={{ ...S.badge(themeColor("warning")), fontSize: "8px" }} size="xs">
                        ⚡ caso activo
                      </Badge>
                    )}
                  </div>
                  <div style={{ fontSize: "10px", color: themeColor("mutedDark") }}>
                    {regionsMap[l.region]?.communes?.[l.commune]?.name || l.commune}
                  </div>
                  {l.fechaDesactivacion && (
                    <div style={{ fontSize: "9px", color: themeColor("danger") }}>SD: {fmtDate(l.fechaDesactivacion)}</div>
                  )}
                </div>
                <span style={{ fontFamily: "monospace", fontSize: "10px", color: themeColor("mutedDark") }}>{l.idLocal}</span>
                <Badge style={S.badge(l.activoGlobal ? themeColor("success") : themeColor("danger"))} size="sm">
                  {l.activoGlobal ? "Activo" : "Inactivo"}
                </Badge>
                <Badge style={S.badge(l.activoEnEleccionActual ? themeColor("purpleLight") : themeColor("mutedDarker"))} size="sm">
                  {l.activoEnEleccionActual ? "Sí" : "No"}
                </Badge>
                <span style={{ fontSize: "10px", color: themeColor("mutedDark") }}>{l.origenSeed ? "Seed" : "Manual"}</span>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {l.activoGlobal ? (
                    <>
                      <button
                        style={{ ...S.btn(l.activoEnEleccionActual ? "dark" : "primary"), fontSize: "9px", padding: "2px 6px" }}
                        onClick={() => catalogToggleEleccion(l.idLocal, currentUser)}
                      >
                        {l.activoEnEleccionActual ? "↓ Elec." : "↑ Elec."}
                      </button>
                      <button
                        style={{ ...S.btn("danger"), fontSize: "9px", padding: "2px 6px" }}
                        onClick={() => {
                          if (
                            globalThis.confirm(
                              `¿Desactivar "${l.nombre}"?${hasDivCase ? " ⚠️ Tiene caso(s) activo(s)" : ""}`
                            )
                          )
                            catalogDeactivate(l.idLocal, currentUser);
                        }}
                      >
                        SD
                      </button>
                    </>
                  ) : (
                    <button style={{ ...S.btn("success"), fontSize: "9px", padding: "2px 6px" }} onClick={() => catalogReactivate(l.idLocal, currentUser)}>
                      Reactiv.
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ ...S.card, marginTop: 10 }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>AUDITORÍA DE CATÁLOGO</div>
        <div style={{ maxHeight: 130, overflowY: "auto" }}>
          {[...auditLog]
            .filter((e) => ["LOCAL_CREATED", "LOCAL_DEACTIVATED", "LOCAL_REACTIVATED", "LOCAL_ELECTION_TOGGLED"].includes(e.type))
            .slice(-20)
            .reverse()
            .map((e, i) => {
              const u = USERS.find((u) => u.id === e.actor);
              const tc: Record<string, string> = {
                LOCAL_CREATED: themeColor("success"),
                LOCAL_DEACTIVATED: themeColor("danger"),
                LOCAL_REACTIVATED: themeColor("warning"),
                LOCAL_ELECTION_TOGGLED: themeColor("purpleLight"),
              };
              return (
                <div key={i} style={{ display: "flex", gap: 6, fontSize: "10px", padding: "3px 0", borderBottom: "1px solid #e5e7eb", flexWrap: "wrap" }}>
                  <span style={{ color: themeColor("mutedDark"), width: 108, flexShrink: 0 }}>{fmtDate(e.at)}</span>
                  <span style={{ color: tc[e.type] || themeColor("muted"), fontWeight: 600, width: 160, flexShrink: 0 }}>{e.type}</span>
                  <span style={{ color: themeColor("muted"), width: 100, flexShrink: 0 }}>{u?.name || e.actor}</span>
                  <span style={{ color: themeColor("mutedAlt"), flexGrow: 1 }}>{e.summary}</span>
                </div>
              );
            })}
          {!auditLog.some((e) =>
            ["LOCAL_CREATED", "LOCAL_DEACTIVATED", "LOCAL_REACTIVATED", "LOCAL_ELECTION_TOGGLED"].includes(e.type)
          ) && <div style={{ color: themeColor("mutedDark"), textAlign: "center", padding: 12 }}>Sin operaciones de catálogo</div>}
        </div>
      </div>
    </div>
  );
}
