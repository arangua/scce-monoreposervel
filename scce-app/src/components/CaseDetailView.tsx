/**
 * components/CaseDetailView.tsx
 * Vista de detalle de un caso SCCE — extraida de App.tsx (R-4, 2026-03-27).
 *
 * Lee del store directamente via useAppStore + useCases.
 * Unica prop externa: exportCaseTXT (viene de useExportImport en App).
 */
import React, { useState, useMemo } from "react";
import type { CaseItem, ImpactLevel, ScopeFunctional, CaseStatus, DataConfidence, OrientationData } from "../domain/types";
import { DATA_CONFIDENCE_LABELS, DATA_CONFIDENCE_COLORS } from "../domain/types";
import { critColor, statusColor, normalizeStatus } from "../domain/caseUtils";
import { checkLocalDivergence } from "../domain/localDivergence";
import { fmtDate, fmtTime, timeDiff, nowISO } from "../domain/date";
import { isInstructionForUser, isClosedStatus } from "../domain/cases/terrainSort";
import { canDo, isNivelCentral, USERS } from "../domain/policyEngine";
import { appendEvent } from "../domain/audit";
import { themeColor } from "../theme";
import { Badge } from "../ui/Badge";
import { Tooltip } from "../ui/Tooltip";
import { UI_TEXT } from "../config/uiTextStandard";
import { CONFIG_REGIONS } from "../domain/catalog";
import { useAppStore } from "../store/useAppStore";
import { useCases } from "../hooks/useCases";
import { useAssignedLocalScope } from "../hooks/useAssignedLocalScope";
import { SlaBadge, RecBadge, DivBadge, ClosedOverlay } from "./CaseCard";
// OperationMode importado vía store

const regionsMap = CONFIG_REGIONS as Record<string, { name?: string; communes?: Record<string, { name?: string }> }>;

// ── Estilos locales (subconjunto de S de App) ────────────────────────────────
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
  g2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" } as React.CSSProperties,
};

// ── Wrapper: busca el caso en el store ───────────────────────────────────────
export interface CaseDetailViewProps {
  exportCaseTXT: (c: CaseItem) => void;
}

export function CaseDetailView({ exportCaseTXT }: CaseDetailViewProps) {
  const { cases, selectedCase } = useAppStore();
  const c = cases.find((x): x is CaseItem => x.id === selectedCase?.id);
  if (!c) {
    return (
      <div style={{ color: themeColor("mutedDark"), padding: 20 }}>
        Caso no encontrado
      </div>
    );
  }
  return <CaseDetailContent c={c} exportCaseTXT={exportCaseTXT} />;
}

// ── Contenido completo del detalle ───────────────────────────────────────────
function CaseDetailContent({
  c,
  exportCaseTXT,
}: {
  c: CaseItem;
  exportCaseTXT: (c: CaseItem) => void;
}) {
  const {
    cases,
    setCases,
    auditLog,
    setAuditLog,
    localCatalog,
    currentUser,
    uiMode,
    busyAction,
    setBusyAction,
    setNotification,
    setView,
    chainResult,
  } = useAppStore();

  const { assignedCommuneEffective, assignedLocalIdEffective } = useAssignedLocalScope();

  const {
    changeStatus,
    validateBypass,
    requestReassessment,
    addAction,
    addDecision,
    addComment,
    addInstructionReply,
    isInstructionAckedByUser,
    lastAck,
    createInstruction,
    ackInstruction,
    closeInstruction,
  } = useCases({ assignedCommuneEffective, assignedLocalIdEffective });

  const notify = (msg: string, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  function withBusy(key: string, fn: () => void) {
    if (busyAction[key]) return;
    setBusyAction((prev) => ({ ...prev, [key]: true }));
    try {
      fn();
    } finally {
      setTimeout(() => setBusyAction((prev) => ({ ...prev, [key]: false })), 350);
    }
  }

  // ── Estado local del formulario ──────────────────────────────────────────
  const [aForm, setAForm] = useState({ action: "", responsible: currentUser?.id ?? "", result: "" });
  const [cmtTxt, setCmtTxt] = useState("");
  const [decForm, setDecForm] = useState("");
  const [insScope, setInsScope] = useState("");
  const [insAudience, setInsAudience] = useState("");
  const [insSummary, setInsSummary] = useState("");
  const [insDetails, setInsDetails] = useState("");
  const [insImpactLevel, setInsImpactLevel] = useState<ImpactLevel>("L1");
  const [insScopeFunctional, setInsScopeFunctional] = useState<ScopeFunctional>("OPERACIONES");
  const [insBypassEnabled, setInsBypassEnabled] = useState(false);
  const [insBypassReason, setInsBypassReason] = useState("");
  const [showRA, setShowRA] = useState(false);
  const [raEval, setRaEval] = useState({ ...(c.evaluation ?? {}) });
  const [raJust, setRaJust] = useState("");
  const [motDraft, setMotDraft] = useState(c.closingMotivo ?? "");
  const [bvForm, setBvForm] = useState({ decision: "VALIDATED", fundament: "" });
  const [replyingToInstructionId, setReplyingToInstructionId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [draftCc, setDraftCc] = useState<{ role?: string; userId?: string; label: string }[]>([]);
  // FASE 1B: formulario de orientación
  const [showOrientationForm, setShowOrientationForm] = useState(false);
  const [orientationDraft, setOrientationDraft] = useState<Omit<OrientationData, 'orientedBy' | 'orientedAt'>>({
    operationalMeaning: (c.orientation as OrientationData | undefined)?.operationalMeaning ?? "",
    legalRisk: (c.orientation as OrientationData | undefined)?.legalRisk ?? "",
    reputationalRisk: (c.orientation as OrientationData | undefined)?.reputationalRisk ?? "",
  });
  // FIX: guard defensivo — si dataConfidence viene undefined/null de la API, usar UNKNOWN
  const VALID_CONFIDENCES: DataConfidence[] = ["VERIFIED", "HIGH", "MEDIUM", "LOW", "UNKNOWN"];
  const safeInitialConfidence = ((): DataConfidence => {
    const v = c.dataConfidence as DataConfidence | undefined | null;
    return v && VALID_CONFIDENCES.includes(v) ? v : "UNKNOWN";
  })();
  const [confidenceDraft, setConfidenceDraft] = useState<DataConfidence>(safeInitialConfidence);
  // Derivado seguro — nunca undefined, siempre fallback a UNKNOWN
  const safeCD: DataConfidence = VALID_CONFIDENCES.includes(confidenceDraft) ? confidenceDraft : "UNKNOWN";
  const cdColor = DATA_CONFIDENCE_COLORS[safeCD] ?? "#9ca3af";
  const cdLabel = DATA_CONFIDENCE_LABELS[safeCD] ?? "Sin evaluar";

  // ── Derivados ────────────────────────────────────────────────────────────
  const isClosed = c.status === "Cerrado";
  const isOpView = uiMode === "OP";
  const canAssign =
    !isClosed &&
    canDo("assign", currentUser, c) &&
    (c.status === "Recepcionado por DR" || c.bypass || c.status === "En gestion" || c.status === "Escalado");
  const ca = auditLog.filter((e) => e.caseId === c.id);
  const assignee = USERS.find((u) => u.id === c.assignedTo);
  const div = checkLocalDivergence(c, localCatalog);

  const insUserId = currentUser?.id ?? null;
  const insUserRole = (currentUser as { role?: string } | null)?.role ?? null;
  /* eslint-disable react-hooks/exhaustive-deps */
  const instructionsSorted = useMemo(() => {
    const list = (c.instructions ?? []).filter((ins) =>
      isInstructionForUser(ins, currentUser ?? undefined)
    );
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [c.instructions, insUserId, insUserRole]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const tlC: Record<string, string> = {
    DETECTED: themeColor("success"), REPORTED: themeColor("primary"),
    FIRST_ACTION: themeColor("warning"), ESCALATED: themeColor("danger"),
    RESOLVED: themeColor("success"), CLOSED: themeColor("gray"),
    BYPASS: themeColor("purpleLight"), COMMENT: themeColor("muted"),
    MITIGATED: themeColor("warningAlt"), RECEPCIONADO: themeColor("purpleLight"),
    REASSESSMENT: themeColor("warning"), IN_MANAGEMENT: themeColor("primary"),
    BYPASS_VALIDATED: themeColor("success"), BYPASS_REVOKED: themeColor("danger"),
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative" }}>
      {isClosed && <ClosedOverlay />}

      {/* Cabecera */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <button style={S.btn("dark")} onClick={() => setView("dashboard")}>← Volver</button>
          {!isOpView && <span style={{ fontFamily: "monospace", color: themeColor("muted"), fontSize: "12px" }}>{c.id}</span>}
          <Badge style={S.badge(critColor(c.criticality))} size="sm">{c.criticality}</Badge>
          <Badge style={S.badge(statusColor(normalizeStatus(c.status) as CaseStatus))} size="sm">
            {normalizeStatus(c.status) === "Otros / Desconocido" ? String(c.status) : normalizeStatus(c.status)}
          </Badge>
          {c.bypass && (
            <Badge style={S.badge(c.bypassFlagged && !c.bypassValidated ? themeColor("danger") : themeColor("warning"))} size="sm">
              {UI_TEXT.states.modoUrgente}
              {c.bypassFlagged && !c.bypassValidated ? " " + UI_TEXT.states.flaggedShort : ""}
              {c.bypassValidated ? " [" + c.bypassValidated + "]" : ""}
            </Badge>
          )}
          {!isOpView && <SlaBadge c={c} />}
          <RecBadge c={c} variant={isOpView ? "OP" : "FULL"} />
        </div>
        {!isOpView && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button style={S.btn("dark")} onClick={() => exportCaseTXT(c)}>TXT</button>
            <button style={S.btn("dark")} onClick={() => {
              const txt = `MINUTA SCCE\nID: ${c.id} | ${fmtDate(nowISO())}\nLocal: ${c.local || "—"}\nResumen: ${c.summary}\nCriticidad: ${c.criticality} | Estado: ${c.status}`;
              navigator.clipboard?.writeText(txt);
              notify(UI_TEXT.buttons.minutaCopiada);
            }}>Minuta</button>
            {canAssign && (
              <select style={{ ...S.inp, width: "auto" }} onChange={e => {
                if (!e.target.value) return;
                const val = e.target.value;
                setCases(prev => prev.map(x => x.id !== c.id ? x : { ...x, assignedTo: val, updatedAt: nowISO() }));
                setAuditLog(prev => appendEvent(prev, "ASSIGNED", currentUser!.id, currentUser!.role, c.id, "Asignado a " + USERS.find(u => u.id === val)?.name));
              }}>
                <option value="">Asignar a...</option>
                {USERS.filter(u => u.region === c.region || !u.region).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            {(canDo("update", currentUser, c) || canDo("close", currentUser, c)) && (
              <select style={{ ...S.inp, width: "auto" }} value={c.status} onChange={e => changeStatus(c.id, e.target.value as CaseStatus)}>
                {["Nuevo", "Recepcionado por DR", "En gestion", "Escalado", "Mitigado", "Resuelto", "Cerrado"].map(st => <option key={st}>{st}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Banner divergencia */}
      {!isOpView && div && (
        <div style={{ ...S.card, background: themeColor("orangeBlock"), border: "2px solid #f97316", marginBottom: 8 }}>
          <div style={{ color: themeColor("warning"), fontWeight: 700, marginBottom: 4 }}>Divergencia de catalogo</div>
          <div style={{ fontSize: "12px", color: themeColor("legacyAmberText"), marginBottom: 4 }}>{div.msg}</div>
          <div style={{ fontSize: "11px", color: themeColor("muted") }}>
            Snapshot: <span style={{ fontFamily: "monospace", color: themeColor("mutedAlt") }}>{c.localSnapshot?.nombre} [{c.localSnapshot?.idLocal}]</span> @ {fmtDate(c.localSnapshot?.snapshotAt)}
          </div>
          <div style={{ fontSize: "10px", color: themeColor("mutedDark"), marginTop: 4 }}>El caso es juridicamente valido. Verificar disponibilidad del local.</div>
        </div>
      )}

      {/* Banner bypass flagged */}
      {c.bypassFlagged && !c.bypassValidated && (
        <div style={{ ...S.card, background: themeColor("redBlock"), border: "2px solid #ef4444", marginBottom: 8 }}>
          <div style={{ color: themeColor("danger"), fontWeight: 700, marginBottom: 4 }}>
            {UI_TEXT.states.modoUrgente} — {UI_TEXT.misc.validacionExpost}
          </div>
          <div style={{ fontSize: "11px", color: themeColor("legacyRedText"), marginBottom: 8 }}>Motivo: {c.bypassMotivo || "—"}</div>
          {canDo("validateBypass", currentUser) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <select style={{ ...S.inp, width: "auto" }} value={bvForm.decision} onChange={e => setBvForm(p => ({ ...p, decision: e.target.value }))}>
                <option value="VALIDATED">{UI_TEXT.labels.validarExcepcion}</option>
                <option value="REVOKED">{UI_TEXT.labels.revocarExcepcion}</option>
              </select>
              <input style={{ ...S.inp, flex: 1, minWidth: 200 }} placeholder={UI_TEXT.labels.fundamentoObligatorio} value={bvForm.fundament} onChange={e => setBvForm(p => ({ ...p, fundament: e.target.value }))} />
              <button style={S.btn(bvForm.decision === "VALIDATED" ? "success" : "danger")} onClick={() => validateBypass(c.id, bvForm.decision, bvForm.fundament)}>
                {bvForm.decision === "VALIDATED" ? UI_TEXT.labels.validar : UI_TEXT.labels.revocar}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid principal */}
      <div style={{ display: "grid", gridTemplateColumns: isOpView ? "1fr" : "1fr 1fr", gap: 10 }}>
        {/* Columna izquierda */}
        <div>
          {/* Info del caso */}
          <div style={{ ...S.card, marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: 4 }}>{c.summary}</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8, padding: "5px 8px", background: themeColor("infoBg"), border: "1px solid #93c5fd", borderRadius: 4 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: "11px", color: themeColor("infoIcon"), fontWeight: 700 }}>Local:</span>
                  <span style={{ fontWeight: 600 }}>{c.local || "—"}</span>
                  {div && <Badge style={{ ...S.badge(themeColor("warning")), fontSize: "8px" }} size="xs">MODIF.</Badge>}
                </div>
                {c.localSnapshot && (
                  <div style={{ fontSize: "9px", color: themeColor("mutedDark"), marginTop: 1 }}>
                    {c.localSnapshot.idLocal} · {fmtDate(c.localSnapshot.snapshotAt)}
                  </div>
                )}
              </div>
            </div>
            <div style={{ color: themeColor("mutedAlt"), fontSize: "12px", marginBottom: 8 }}>{c.detail || "—"}</div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>{UI_TEXT.labels.evidenceTitle}</div>
              {c.evidence && c.evidence.length > 0
                ? c.evidence.map((ev, i) => <div key={i} style={{ fontSize: "12px", marginBottom: 4 }}>📎 {ev}</div>)
                : <div style={{ fontSize: "12px", color: themeColor("mutedAlt") }}>—</div>}
            </div>
            <div style={S.g2}>
              <div><span style={{ color: themeColor("muted") }}>Region:</span> {regionsMap[c.region]?.name}</div>
              <div><span style={{ color: themeColor("muted") }}>Comuna:</span> {regionsMap[c.region]?.communes?.[c.commune]?.name || c.commune}</div>
              <div><span style={{ color: themeColor("muted") }}>Canal:</span> {c.origin?.channel}</div>
              <div><span style={{ color: themeColor("muted") }}>Asignado:</span> {assignee?.name || "—"}</div>
              {!isOpView && (
                <>
                  <div><span style={{ color: themeColor("muted") }}>SLA:</span> {c.slaMinutes} min</div>
                  {(() => { const comp = c.completeness ?? 0; return <div><span style={{ color: themeColor("muted") }}>Complet.:</span> <span style={{ color: comp >= 80 ? themeColor("success") : comp >= 50 ? themeColor("warningAlt") : themeColor("danger") }}>{comp}%</span></div>; })()}
                </>
              )}
            </div>
          </div>

          {/* Motivo de cierre */}
          {!isClosed && (canDo("close", currentUser, c) || c.status === "Resuelto") && (
            <div style={{ ...S.card, marginBottom: 8, border: "1px solid #22c55e44" }}>
              <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>MOTIVO DE CIERRE</div>
              <textarea style={{ ...S.inp, height: 50, resize: "vertical" }} value={motDraft} onChange={e => setMotDraft(e.target.value)} placeholder="Fundamento formal..." />
              <button style={{ ...S.btn("success"), marginTop: 4, fontSize: "11px" }} onClick={() => {
                if (!motDraft) return notify("Ingresa el motivo", "error");
                setCases(prev => prev.map(x => x.id !== c.id ? x : { ...x, closingMotivo: motDraft, updatedAt: nowISO() }));
                setAuditLog(prev => appendEvent(prev, "CASE_UPDATED", currentUser!.id, currentUser!.role, c.id, "Motivo de cierre registrado"));
                notify("Motivo guardado", "success");
              }}>{c.closingMotivo ? "Actualizar" : "Guardar motivo"}</button>
              {c.closingMotivo && <div style={{ marginTop: 4, fontSize: "11px", color: themeColor("success") }}>✓ {c.closingMotivo.slice(0, 60)}</div>}
            </div>
          )}

          {/* Ficha evaluacion */}
          {!isOpView && (
            <div style={{ ...S.card, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600 }}>FICHA EVALUACION</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Badge style={{ ...S.badge(themeColor("success")), fontSize: "9px" }} size="xs">BLOQUEADA</Badge>
                  {!isClosed && canDo("update", currentUser, c) && (
                    <button style={{ ...S.btn("dark"), fontSize: "10px", padding: "2px 8px" }} onClick={() => setShowRA(p => !p)}>
                      {showRA ? "✕" : "Reevaluar"}
                    </button>
                  )}
                </div>
              </div>
              {(() => {
                const ev = (c.evaluation ?? {}) as Record<string, number>;
                return Object.entries({ continuidad: "Continuidad", integridad: "Integridad juridica", seguridad: "Seguridad", exposicion: "Exposicion", capacidadLocal: "Capacidad local" }).map(([k, lbl]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ color: themeColor("mutedAlt"), fontSize: "11px" }}>{lbl}</span>
                    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                      {[0, 1, 2, 3].map(n => <div key={n} style={{ width: 14, height: 14, borderRadius: 2, background: (ev[k] ?? 0) >= n ? [themeColor("success"), themeColor("warningAlt"), themeColor("warning"), themeColor("danger")][n] : themeColor("border") }} />)}
                      <span style={{ marginLeft: 4, color: [themeColor("success"), themeColor("warningAlt"), themeColor("warning"), themeColor("danger")][ev[k] ?? 0], fontWeight: 700 }}>{ev[k] ?? 0}</span>
                    </div>
                  </div>
                ));
              })()}
              <div style={{ marginTop: 6, borderTop: "1px solid #e5e7eb", paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: themeColor("muted"), fontSize: "11px" }}>Nivel:</span>
                <span style={{ color: critColor(c.criticality), fontWeight: 700 }}>{c.criticalityScore}/15 — {c.criticality}</span>
              </div>
              {showRA && (
                <div style={{ ...S.card, background: themeColor("bgSurface"), marginTop: 8, border: "1px solid #f9731644" }}>
                  <div style={{ color: themeColor("warning"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>REEVALUACION</div>
                  {Object.entries({ continuidad: "Continuidad", integridad: "Integridad", seguridad: "Seguridad", exposicion: "Exposicion", capacidadLocal: "Cap. Local" }).map(([k, lbl]) => (
                    <div key={k} style={{ marginBottom: 6, display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ color: themeColor("mutedAlt"), fontSize: "11px", width: 90, flexShrink: 0 }}>{lbl}</span>
                      {[0, 1, 2, 3].map(n => (
                        <button key={n} onClick={() => setRaEval(p => ({ ...p, [k]: n }))} style={{ padding: "3px 9px", borderRadius: 3, border: "1px solid", cursor: "pointer", fontWeight: 700, fontSize: "12px", background: (raEval as Record<string, number>)[k] === n ? [themeColor("success"), themeColor("warningAlt"), themeColor("warning"), themeColor("danger")][n] : "transparent", borderColor: ["#22c55e44", "#eab30844", "#f9731644", "#ef444444"][n], color: (raEval as Record<string, number>)[k] === n ? themeColor("white") : [themeColor("success"), themeColor("warningAlt"), themeColor("warning"), themeColor("danger")][n] }}>{n}</button>
                      ))}
                    </div>
                  ))}
                  <label style={S.lbl}>Justificacion *</label>
                  <input style={S.inp} placeholder="Fundamento..." value={raJust} onChange={e => setRaJust(e.target.value)} />
                  <button style={{ ...S.btn("warning"), marginTop: 6 }} onClick={() => {
                    if (!raJust) return notify("Justificacion obligatoria", "error");
                    requestReassessment(c.id, raEval, raJust);
                    setShowRA(false);
                    setRaJust("");
                  }}>Registrar Reevaluacion</button>
                </div>
              )}
            </div>
          )}

          {/* FASE 1B: Panel Confianza + Orientación — visible para DR y Director Regional */}
          {!isOpView && canDo("recepcionar", currentUser, c) && (() => {
            return (
            <div style={{ ...S.card, marginBottom: 8, border: `1px solid ${cdColor}44` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600 }}>C2 — CONFIANZA Y ORIENTACIÓN</div>
                {!isClosed && (
                  <button style={{ ...S.btn("dark"), fontSize: "10px", padding: "2px 8px" }} onClick={() => setShowOrientationForm(p => !p)}>
                    {showOrientationForm ? "✕ Cancelar" : "✏ Editar"}
                  </button>
                )}
              </div>

              {/* Nivel de confianza actual */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", background: cdColor + "15", borderRadius: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: cdColor, flexShrink: 0, display: "inline-block" }} />
                <span style={{ fontSize: "12px", color: themeColor("textSecondary") }}>Confianza del dato:</span>
                <span style={{ fontWeight: 700, color: cdColor, fontSize: "12px" }}>
                  {cdLabel}
                </span>
                {(confidenceDraft === "LOW" || confidenceDraft === "UNKNOWN") && (
                  <span style={{ marginLeft: "auto", fontSize: "10px", color: themeColor("warning") }}>⚠️ No apto para decidir</span>
                )}
              </div>

              {/* Orientación actual */}
              {c.orientation && !showOrientationForm ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {[{key: "operationalMeaning", label: "Significado operacional"}, {key: "legalRisk", label: "Riesgo jurídico"}, {key: "reputationalRisk", label: "Riesgo reputacional"}].map(({key, label}) => (
                    <div key={key} style={{ padding: "6px 8px", background: themeColor("bgSurface"), borderRadius: 4, border: "1px solid #e5e7eb" }}>
                      <div style={{ fontSize: "10px", color: themeColor("muted"), fontWeight: 600, marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: "12px", color: themeColor("textPrimary") }}>
                        {(c.orientation as OrientationData)[key as keyof OrientationData] || "—"}
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: "10px", color: themeColor("mutedDark") }}>
                    Orientado por {(c.orientation as OrientationData).orientedBy} · {fmtDate((c.orientation as OrientationData).orientedAt)}
                  </div>
                </div>
              ) : !showOrientationForm ? (
                <div style={{ fontSize: "12px", color: themeColor("mutedAlt"), fontStyle: "italic" }}>Orientación pendiente — etapa 3 del flujo C2</div>
              ) : null}

              {/* Formulario de edición */}
              {showOrientationForm && (
                <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
                  <div>
                    <label style={S.lbl}>Confianza del dato</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                      {(["VERIFIED", "HIGH", "MEDIUM", "LOW", "UNKNOWN"] as DataConfidence[]).map(val => (
                        <button key={val} type="button" onClick={() => setConfidenceDraft(val)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 4, border: `1px solid ${confidenceDraft === val ? DATA_CONFIDENCE_COLORS[val] : "#e5e7eb"}`, background: confidenceDraft === val ? DATA_CONFIDENCE_COLORS[val] + "22" : "transparent", cursor: "pointer", fontSize: "11px", fontWeight: confidenceDraft === val ? 700 : 400 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: DATA_CONFIDENCE_COLORS[val], flexShrink: 0 }} />
                          {DATA_CONFIDENCE_LABELS[val]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={S.lbl}>Significado operacional *</label>
                    <textarea style={{ ...S.inp, height: 48, resize: "vertical", fontSize: "12px" }} placeholder="¿Qué implica para la operación del local?" value={orientationDraft.operationalMeaning} onChange={e => setOrientationDraft(p => ({ ...p, operationalMeaning: e.target.value }))} />
                  </div>
                  <div>
                    <label style={S.lbl}>Riesgo jurídico</label>
                    <textarea style={{ ...S.inp, height: 40, resize: "vertical", fontSize: "12px" }} placeholder="¿Hay riesgo de impugnación o nulidad?" value={orientationDraft.legalRisk} onChange={e => setOrientationDraft(p => ({ ...p, legalRisk: e.target.value }))} />
                  </div>
                  <div>
                    <label style={S.lbl}>Riesgo reputacional</label>
                    <textarea style={{ ...S.inp, height: 40, resize: "vertical", fontSize: "12px" }} placeholder="¿Hay exposición mediática o ciudadana?" value={orientationDraft.reputationalRisk} onChange={e => setOrientationDraft(p => ({ ...p, reputationalRisk: e.target.value }))} />
                  </div>
                  <button
                    style={{ ...S.btn("primary"), marginTop: 4 }}
                    onClick={() => {
                      if (!orientationDraft.operationalMeaning.trim()) return notify("El significado operacional es obligatorio", "error");
                      const now = nowISO();
                      const newOrientation: OrientationData = {
                        ...orientationDraft,
                        orientedBy: currentUser?.name ?? currentUser?.id ?? "desconocido",
                        orientedAt: now,
                      };
                      setCases(prev => prev.map(x => x.id !== c.id ? x : { ...x, dataConfidence: confidenceDraft, orientation: newOrientation, updatedAt: now }));
                      setAuditLog(prev => appendEvent(prev, "CASE_UPDATED", currentUser!.id, currentUser!.role, c.id, `Orientación C2 registrada — confianza: ${confidenceDraft}`));
                      setShowOrientationForm(false);
                      notify("Orientación registrada", "success");
                    }}
                  >
                    Guardar orientación
                  </button>
                </div>
              )}
            </div>
            );
          })()}

          {/* Metricas */}
          {!isOpView && (
            <div style={S.card}>
              <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>METRICAS</div>
              {[["T. Activacion", timeDiff(c.origin?.detectedAt, c.reportedAt)], ["T. 1a Accion", timeDiff(c.reportedAt, c.firstActionAt)], ["T. Escalamiento", timeDiff(c.reportedAt, c.escalatedAt)], ["T. Resolucion", timeDiff(c.reportedAt, c.resolvedAt)]].map(([l, v]) => (
                <div key={String(l)} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: "12px" }}>
                  <span style={{ color: themeColor("muted") }}>{l}</span>
                  <span style={{ color: v != null ? themeColor("legacySlate") : themeColor("mutedDark") }}>{v != null ? `${v} min` : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha */}
        <div>
          {/* Timeline */}
          <div style={{ ...S.card, marginBottom: 8 }}>
            <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>LINEA DE TIEMPO</div>
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {(c.timeline ?? []).map((t, i) => {
                const u = USERS.find(u => u.id === t.actor);
                const te = t as typeof t & { eventId?: string; kind?: string; refInstructionId?: string };
                const eventKey = te.eventId ?? `${t.at}_${t.actor}_${i}`;
                const formalLabels: Record<string, string> = { INSTRUCTION_CREATED: UI_TEXT.labels.instructionCreated, INSTRUCTION_ACK: UI_TEXT.labels.instructionAck, INSTRUCTION_CLOSED: UI_TEXT.labels.instructionClosed };
                const formalLabel = te.kind && formalLabels[te.kind];
                const isReply = te.kind === "INSTRUCTION_REPLY" && te.refInstructionId;
                const ins = isReply ? (c.instructions ?? []).find(ins => ins.id === te.refInstructionId) : null;
                const impact = ins?.impactLevel ?? "L1";
                const scopeFLabel = { OPERACIONES: UI_TEXT.labels.scopeOperaciones, FISCALIZACION: UI_TEXT.labels.scopeFiscalizacion, SEGURIDAD: UI_TEXT.labels.scopeSeguridad, TI: UI_TEXT.labels.scopeTI, INFRAESTRUCTURA: UI_TEXT.labels.scopeInfraestructura, OTRO: UI_TEXT.labels.scopeOtro }[ins?.scopeFunctional ?? "OPERACIONES"] ?? ins?.scopeFunctional ?? "";
                const replyPrefix = ins ? `Respuesta a instruccion ${impact} ${scopeFLabel} (${fmtTime(ins.createdAt)}): ` : (isReply ? `${UI_TEXT.labels.instructionUnavailable}: ` : "");
                const displayNote = formalLabel ? (t.note ?? "") : replyPrefix ? (replyPrefix + (t.note ?? "")) : (t.note ?? "");
                const typeLabel = formalLabel ?? (isReply ? UI_TEXT.labels.instructionReplyLabel : t.type);
                return (
                  <div key={eventKey} style={{ display: "flex", gap: 8, alignItems: "flex-start", paddingBottom: 8, borderBottom: "1px solid #e5e7eb" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: tlC[t.type] || themeColor("muted"), marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "10px", color: themeColor("mutedDark") }}>{fmtDate(t.at)}</div>
                      <div style={{ fontSize: "11px", color: tlC[t.type] || themeColor("muted"), fontWeight: 600 }}>{typeLabel}</div>
                      <div style={{ fontSize: "11px", color: themeColor("mutedAlt") }}>
                        {displayNote}
                        {u && <span style={{ color: themeColor("mutedDark") }}> — {u.name}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Acciones */}
          <div style={{ ...S.card, marginBottom: 8 }}>
            <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>ACCIONES</div>
            {((c.actions ?? []) as { id?: string; action?: string; responsible?: string; at?: string; result?: string }[]).map((a) => {
              const u = USERS.find(u => u.id === a.responsible);
              return (
                <div key={a.id ?? ""} style={{ ...S.card, background: themeColor("bgSurface"), marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: "12px" }}>{a.action}</div>
                  <div style={{ fontSize: "10px", color: themeColor("mutedDark") }}>{u?.name} | {fmtDate(a.at)}</div>
                  {a.result && <div style={{ fontSize: "11px", color: themeColor("success"), marginTop: 2 }}>→ {a.result}</div>}
                </div>
              );
            })}
            {!isClosed && canDo("update", currentUser, c) && (
              <div style={{ marginTop: 6, borderTop: "1px solid #e5e7eb", paddingTop: 6 }}>
                <input style={{ ...S.inp, marginBottom: 4 }} placeholder="Accion..." value={aForm.action} onChange={e => setAForm(p => ({ ...p, action: e.target.value }))} />
                <div style={{ ...S.g2, marginBottom: 4 }}>
                  <select style={S.inp} value={aForm.responsible} onChange={e => setAForm(p => ({ ...p, responsible: e.target.value }))}>
                    {USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <input style={S.inp} placeholder="Resultado..." value={aForm.result} onChange={e => setAForm(p => ({ ...p, result: e.target.value }))} />
                </div>
                <button style={S.btn("primary")} onClick={() => {
                  if (!aForm.action) return;
                  addAction(c.id, aForm.action, aForm.responsible, aForm.result);
                  setAForm({ action: "", responsible: currentUser?.id ?? "", result: "" });
                  notify("Accion registrada");
                }}>+ Accion</button>
              </div>
            )}
          </div>

          {/* Decisiones */}
          <div style={{ ...S.card, marginBottom: 8 }}>
            <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>DECISIONES</div>
            {((c.decisions ?? []) as { who?: string; fundament?: string }[]).map((d, i) => {
              const u = USERS.find(u => u.id === d.who);
              return (
                <div key={i} style={{ fontSize: "11px", marginBottom: 4, padding: 4, background: themeColor("legacyGrayBg"), borderRadius: 3 }}>
                  <span style={{ color: themeColor("muted") }}>{u?.name}: </span>{d.fundament}
                </div>
              );
            })}
            {!isClosed && (canDo("update", currentUser, c) || canDo("close", currentUser, c)) && (
              <div style={{ marginTop: 6 }}>
                <input style={S.inp} placeholder="Fundamento de decision..." value={decForm} onChange={e => setDecForm(e.target.value)} />
                <button style={{ ...S.btn("dark"), marginTop: 4 }} onClick={() => {
                  if (!decForm) return;
                  addDecision(c.id, decForm);
                  setDecForm("");
                  notify("Decision registrada");
                }}>+ Decision</button>
              </div>
            )}
            {canDo("close", currentUser, c) && c.status !== "Cerrado" && (
              <div style={{ marginTop: 8, padding: 6, background: themeColor("legacyGrayBg"), borderRadius: 4, fontSize: "10px" }}>
                <div style={{ color: themeColor("muted"), fontWeight: 600, marginBottom: 3 }}>PRE-REQUISITOS DE CIERRE:</div>
                {[[c.actions?.length, "Al menos 1 accion"], [c.decisions?.length, "Al menos 1 decision"], [c.status === "Resuelto", "Estado = Resuelto"], [!!c.closingMotivo, "Motivo guardado"], [!c.bypassFlagged || !!c.bypassValidated, "Bypass resuelto"]].map(([ok, lbl], idx) => (
                  <div key={`req-${idx}`} style={{ color: ok ? themeColor("success") : themeColor("danger") }}>{ok ? "✓" : "✕"} {lbl}</div>
                ))}
              </div>
            )}
          </div>

          {/* Instrucciones */}
          <div style={{ ...S.card, marginBottom: 8 }}>
            <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>{UI_TEXT.labels.instructionsTitle}</div>
            {instructionsSorted.length === 0 ? (
              <div style={{ fontSize: "12px", color: themeColor("muted") }}>{UI_TEXT.labels.instructionsEmpty}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {instructionsSorted.map((ins) => {
                  const acked = currentUser?.id && isInstructionAckedByUser(ins, currentUser.id);
                  const last = lastAck(ins);
                  const impact = ins.impactLevel ?? "L1";
                  const scopeF = ins.scopeFunctional ?? "OPERACIONES";
                  const scopeFLabel = { OPERACIONES: UI_TEXT.labels.scopeOperaciones, FISCALIZACION: UI_TEXT.labels.scopeFiscalizacion, SEGURIDAD: UI_TEXT.labels.scopeSeguridad, TI: UI_TEXT.labels.scopeTI, INFRAESTRUCTURA: UI_TEXT.labels.scopeInfraestructura, OTRO: UI_TEXT.labels.scopeOtro }[scopeF] ?? scopeF;
                  const hasBypass = ins.bypass?.enabled === true;
                  return (
                    <div key={ins.id} style={{ ...S.card, background: themeColor("bgSurface"), padding: 8 }}>
                      <div style={{ fontSize: "11px", color: themeColor("muted"), marginBottom: 4, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        <span>{ins.scope} · {ins.audience} · {fmtDate(ins.createdAt)}</span>
                        <Badge style={S.badge(impact === "L3" ? themeColor("danger") : impact === "L2" ? themeColor("warning") : themeColor("muted"))} size="sm">{impact}</Badge>
                        <span style={{ color: themeColor("mutedAlt") }}>{scopeFLabel}</span>
                        {hasBypass && (
                          <Tooltip content={ins.bypass?.reason || ""}>
                            <Badge style={{ ...S.badge(themeColor("legacyRedDark")), cursor: "help" }} size="sm">
                              {UI_TEXT.labels.instructionBypassBadge}
                            </Badge>
                          </Tooltip>
                        )}
                      </div>
                      <div style={{ fontSize: "10px", color: themeColor("mutedDark"), marginBottom: 2 }}>{USERS.find(u => u.id === ins.createdBy)?.name ?? ins.createdBy}</div>
                      <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: 4 }}>{ins.summary}</div>
                      {ins.details && <div style={{ fontSize: "11px", color: themeColor("mutedAlt"), marginBottom: 4 }}>{ins.details}</div>}
                      {ins.cc?.length ? <div style={{ fontSize: 10, color: themeColor("muted"), marginBottom: 4 }}>{UI_TEXT.labelsCc?.ccReadOnly ?? "Con copia:"} {ins.cc.map(x => x.label).join(", ")}</div> : null}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                        <Badge style={S.badge(acked ? themeColor("success") : themeColor("warningAlt"))} size="sm">
                          {acked ? UI_TEXT.labels.statusAcked : UI_TEXT.labels.statusPending}
                        </Badge>
                        {isClosedStatus(ins.status) && <Badge style={S.badge(themeColor("muted"))} size="sm">Cerrada</Badge>}
                        {last && <span style={{ fontSize: "10px", color: themeColor("muted") }}>Acusado: {USERS.find(u => u.id === last.userId)?.name ?? last.userId} @ {fmtDate(last.at)}</span>}
                        {!acked && currentUser?.id && ins.ackRequired && (
                          <button style={{ ...S.btn("primary"), fontSize: "10px", padding: "4px 8px" }} title={UI_TEXT.tooltips.ackConfirmReceipt} disabled={!!busyAction[`ack_${c.id}_${ins.id}`]} onClick={() => withBusy(`ack_${c.id}_${ins.id}`, () => ackInstruction(c.id, ins.id))}>
                            {UI_TEXT.buttons.ackConfirmReceipt}
                          </button>
                        )}
                        {!isClosedStatus(ins.status) && canDo("instruct", currentUser) && (
                          <button style={{ ...S.btn("dark"), fontSize: "10px", padding: "4px 8px" }} disabled={!!busyAction[`close_${c.id}_${ins.id}`]} onClick={() => withBusy(`close_${c.id}_${ins.id}`, () => closeInstruction(c.id, ins.id))}>
                            {UI_TEXT.buttons.closeInstruction}
                          </button>
                        )}
                      </div>
                      {currentUser?.id && (
                        <div style={{ marginTop: 6, borderTop: "1px solid #e5e7eb", paddingTop: 6 }}>
                          {replyingToInstructionId !== ins.id ? (
                            <button style={{ ...S.btn("dark"), fontSize: "10px", padding: "4px 8px" }} onClick={() => { setReplyingToInstructionId(ins.id); setReplyDraft(""); }}>
                              {UI_TEXT.buttons.replyToInstruction}
                            </button>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <textarea style={{ ...S.inp, height: 48, resize: "vertical", fontSize: "11px" }} placeholder={UI_TEXT.misc.instructionReplyPlaceholder} value={replyDraft} onChange={e => setReplyDraft(e.target.value)} rows={2} />
                              <div style={{ display: "flex", gap: 6 }}>
                                <button style={{ ...S.btn("primary"), fontSize: "10px", padding: "4px 10px" }} onClick={() => {
                                  if (!replyDraft.trim()) return;
                                  addInstructionReply(c.id, ins.id, replyDraft);
                                  setReplyDraft("");
                                  setReplyingToInstructionId(null);
                                  notify(UI_TEXT.misc.instructionReplySaved);
                                }}>{UI_TEXT.buttons.sendReply}</button>
                                <button style={{ ...S.btn("dark"), fontSize: "10px", padding: "4px 8px" }} onClick={() => { setReplyingToInstructionId(null); setReplyDraft(""); }}>Cancelar</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Crear instruccion */}
          {canDo("instruct", currentUser) && (
            <div style={{ ...S.card, marginBottom: 8 }}>
              <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>{UI_TEXT.labels.instructionCreateTitle}</div>
              <div style={S.g2}>
                <label style={S.lbl}>{UI_TEXT.labels.scopeLabel}</label>
                <select style={S.inp} value={insScope} onChange={e => setInsScope(e.target.value)}>
                  <option value="LOCAL">{UI_TEXT.labels.scopeLocal}</option>
                  <option value="COMUNAL">{UI_TEXT.labels.scopeComunal}</option>
                  <option value="REGIONAL">{UI_TEXT.labels.scopeRegional}</option>
                </select>
                <label style={S.lbl}>{UI_TEXT.labels.audienceLabel}</label>
                <select style={S.inp} value={insAudience} onChange={e => setInsAudience(e.target.value)}>
                  <option value="AMBOS">{UI_TEXT.labels.audienceBoth}</option>
                  <option value="PESE">{UI_TEXT.labels.audiencePese}</option>
                  <option value="DELEGADO">{UI_TEXT.labels.audienceDelegado}</option>
                </select>
                <label style={S.lbl}>{UI_TEXT.labels.impactLevelLabel}</label>
                <select style={S.inp} value={insImpactLevel} onChange={e => setInsImpactLevel(e.target.value as ImpactLevel)}>
                  <option value="L1">{UI_TEXT.labels.impactL1}</option>
                  <option value="L2">{UI_TEXT.labels.impactL2}</option>
                  <option value="L3">{UI_TEXT.labels.impactL3}</option>
                </select>
                <label style={S.lbl}>{UI_TEXT.labels.scopeFunctionalLabel}</label>
                <select style={S.inp} value={insScopeFunctional} onChange={e => setInsScopeFunctional(e.target.value as ScopeFunctional)}>
                  <option value="OPERACIONES">{UI_TEXT.labels.scopeOperaciones}</option>
                  <option value="FISCALIZACION">{UI_TEXT.labels.scopeFiscalizacion}</option>
                  <option value="SEGURIDAD">{UI_TEXT.labels.scopeSeguridad}</option>
                  <option value="TI">{UI_TEXT.labels.scopeTI}</option>
                  <option value="INFRAESTRUCTURA">{UI_TEXT.labels.scopeInfraestructura}</option>
                  <option value="OTRO">{UI_TEXT.labels.scopeOtro}</option>
                </select>
              </div>
              {isNivelCentral(currentUser?.id ?? "") && (insAudience === "PESE" || insAudience === "DELEGADO") && (
                <div style={{ marginBottom: 8, padding: 8, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.5)", borderRadius: 4, fontSize: 11, color: themeColor("legacyAmberBadge") }}>
                  {UI_TEXT.warnings?.centralToPeseOrDelegado ?? "Advertencia: instruccion desde Nivel Central a PESE/DELEGADO."}
                </div>
              )}
              <label style={S.lbl}>{UI_TEXT.labels.summaryLabelRequired}</label>
              <input style={S.inp} placeholder={UI_TEXT.misc.instructionSummaryPlaceholder} value={insSummary} onChange={e => setInsSummary(e.target.value)} />
              <label style={S.lbl}>{UI_TEXT.labels.detailsLabelOptional}</label>
              <textarea style={{ ...S.inp, height: 40, resize: "vertical" }} placeholder={UI_TEXT.misc.instructionDetailsPlaceholder} value={insDetails} onChange={e => setInsDetails(e.target.value)} />
              <div style={{ marginTop: 8, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" id="ins-bypass" checked={insBypassEnabled} onChange={e => setInsBypassEnabled(e.target.checked)} />
                <label htmlFor="ins-bypass" style={{ ...S.lbl, margin: 0 }}>{UI_TEXT.labels.bypassLabel}</label>
              </div>
              {insBypassEnabled && (
                <textarea style={{ ...S.inp, height: 36, resize: "vertical", marginBottom: 6 }} placeholder={UI_TEXT.labels.bypassReasonPlaceholder} value={insBypassReason} onChange={e => setInsBypassReason(e.target.value)} />
              )}
              <div style={{ marginTop: 8, marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={S.lbl}>{UI_TEXT.labelsCc?.ccLabel ?? "Con copia (CC)"}</span>
                  <button type="button" style={{ ...S.btn("dark"), fontSize: 10, padding: "4px 8px" }} onClick={() => setDraftCc(prev => [...prev, { label: "Copia" }])}>
                    {UI_TEXT.buttons.addCc ?? "+ Agregar copia"}
                  </button>
                </div>
                {draftCc.map((ccRow, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <input style={{ ...S.inp, flex: 1 }} value={ccRow.label} onChange={e => setDraftCc(prev => prev.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} placeholder={UI_TEXT.labelsCc?.ccPlaceholder ?? "Ej: Direccion Regional"} />
                    <button type="button" style={{ ...S.btn("dark"), fontSize: 10, padding: "4px 6px" }} onClick={() => setDraftCc(prev => prev.filter((_, idx) => idx !== i))}>
                      {UI_TEXT.buttons.removeCc ?? "Quitar"}
                    </button>
                  </div>
                ))}
              </div>
              <button style={{ ...S.btn("primary"), marginTop: 6 }} title={UI_TEXT.tooltips.caseCreateInstruction} onClick={() => {
                createInstruction(c.id, insScope, insAudience, insSummary, insDetails, insImpactLevel, insScopeFunctional, insBypassEnabled ? { enabled: true, reason: insBypassReason } : undefined, draftCc.length ? draftCc : undefined);
                setInsSummary("");
                setInsDetails("");
                setInsBypassReason("");
                setInsBypassEnabled(false);
                setDraftCc([]);
              }}>{UI_TEXT.buttons.caseCreateInstruction}</button>
            </div>
          )}

          {/* Comentario */}
          <div style={S.card}>
            <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>{UI_TEXT.labels.commentTitle}</div>
            <textarea style={{ ...S.inp, height: 50, resize: "vertical" }} value={cmtTxt} onChange={e => setCmtTxt(e.target.value)} placeholder={UI_TEXT.misc.commentPlaceholder} />
            <button style={{ ...S.btn("dark"), marginTop: 4 }} onClick={() => {
              if (!cmtTxt) return;
              addComment(c.id, cmtTxt);
              setCmtTxt("");
              notify("Registrado");
            }}>+ {UI_TEXT.buttons.addComment}</button>
          </div>
        </div>
      </div>

      {/* Auditoria */}
      {!isOpView && (
        <div style={{ ...S.card, marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600 }}>AUDITORIA ({ca.length} eventos)</div>
            <Tooltip content={chainResult?.ok ? "Cadena integra (hashes coinciden)" : "Cadena comprometida (revisar eventos)"}>
              <Badge style={{ ...S.badge(chainResult?.ok ? themeColor("success") : themeColor("danger")), cursor: "help" }} size="sm">
                {chainResult?.ok ? "Cadena integra" : "Comprometida"}
              </Badge>
            </Tooltip>
          </div>
          <div style={{ maxHeight: 140, overflowY: "auto" }}>
            {ca.map((e, i) => {
              const u = USERS.find(u => u.id === e.actor);
              const tc: Record<string, string> = { CASE_CREATED: themeColor("success"), BYPASS_USED: themeColor("warning"), BYPASS_FLAGGED: themeColor("danger"), INSTRUCTION_BYPASS_USED: themeColor("legacyRedDarkText"), ESCALATED: themeColor("danger"), STATUS_CHANGED: themeColor("warningAlt"), ACTION_ADDED: themeColor("mutedAlt"), EXPORT_DONE: themeColor("purple"), COMMENT_ADDED: themeColor("muted"), REASSESSMENT: themeColor("warning"), DECISION_ADDED: themeColor("primary"), ASSIGNED: themeColor("purpleLight") };
              return (
                <div key={i} style={{ display: "flex", gap: 6, fontSize: "10px", padding: "3px 0", borderBottom: "1px solid #e5e7eb", flexWrap: "wrap" }}>
                  <span style={{ color: themeColor("mutedDark"), flexShrink: 0, width: 108 }}>{fmtDate(e.at)}</span>
                  <span style={{ color: tc[e.type] || themeColor("muted"), fontWeight: 600, flexShrink: 0, width: 130 }}>{e.type}</span>
                  <span style={{ color: themeColor("muted"), flexShrink: 0, width: 100 }}>{u?.name || e.actor}</span>
                  <span style={{ color: themeColor("mutedAlt"), flexGrow: 1 }}>{e.summary}</span>
                  <span style={{ color: themeColor("legacyGrayBorder"), fontFamily: "monospace", fontSize: "9px" }}>{e.hash}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
