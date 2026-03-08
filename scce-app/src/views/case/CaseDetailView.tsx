/**
 * Vista de detalle de caso. Recibe un gate con callbacks y datos inyectados (sin acoplamiento a App).
 */
import React, { useState, useMemo, useEffect } from "react";
import type { CaseItem, CaseStatus, ImpactLevel, ScopeFunctional, OperationalValidationResult, LocalCatalog, AuditLogEntry } from "../../domain/types";
import { getOperationalValidationClosureResult } from "../../domain/caseProgress";
import { checkLocalDivergence } from "../../domain/localDivergence";
import { fmtDate, fmtTime, timeDiff, nowISO, uuidSimple } from "../../domain/date";
import { appendEvent } from "../../domain/audit";
import { isInstructionForUser, isClosedStatus } from "../../domain/cases/terrainSort";
import { UI_TEXT } from "../../config/uiTextStandard";
import { UI_TEXT_GOVERNANCE } from "../../config/uiTextGovernance";
import { CaseProgressSection } from "./CaseProgressSection";
import { GovernanceSection } from "./GovernanceSection";
import { Badge } from "../../ui/Badge";
import { Tooltip } from "../../ui/Tooltip";
import type { CaseDetailGate } from "./types";
import { SIMULATED_ROLE_HELP } from "../../config/simulatedRoleHelp";
import { getCommuneDisplayName } from "../../domain/territoryCatalog";

export interface CaseDetailViewProps {
  gate: CaseDetailGate;
  selectedCaseId: string | null;
}

export function CaseDetailView({ gate, selectedCaseId }: CaseDetailViewProps) {
  const c = gate.cases.find((x): x is CaseItem => x.id === selectedCaseId);
  const currentUser = gate.currentUser;

  if (!c) {
    return (
      <div style={{ color: gate.themeColor("mutedDark"), padding: 20 }}>
        Caso no encontrado
      </div>
    );
  }
  if (!currentUser) return null;

  return (
    <CaseDetailContent gate={gate} c={c} currentUser={currentUser} />
  );
}

interface CaseDetailContentProps {
  gate: CaseDetailGate;
  c: CaseItem;
  currentUser: { id: string; name: string; role?: string };
}

function CaseDetailContent({ gate, c, currentUser }: CaseDetailContentProps) {
  const S = gate.S as Record<string, (...args: unknown[]) => unknown> & Record<string, React.CSSProperties>;
  const themeColor = gate.themeColor;
  const {
    setView,
    setCases,
    setAuditLog,
    auditLog,
    localCatalog,
    uiMode,
    notify,
    exportCaseTXT,
    assignCaseResponsible,
    changeStatus,
    canDo,
    addAction,
    addDecision,
    addComment,
    validateBypass,
    addOperationalValidation,
    requestReassessment,
    ackInstruction,
    closeInstruction,
    addInstructionReply,
    createInstruction,
    withBusy,
    busyAction,
    chainResult,
    isNivelCentral,
    normalizeStatus,
    critColor,
    statusColor,
    USERS,
    regionsMap,
    ClosedOverlay,
    SlaBadge,
    RecBadge,
    isInstructionAckedByUser,
    lastAck,
  } = gate;

  const [aForm, setAForm] = useState({ action: "", responsible: currentUser.id, result: "" });
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
  const [raEval, setRaEval] = useState(c.evaluation ? { ...c.evaluation } : {} as Record<string, number>);
  const [raJust, setRaJust] = useState("");
  const [motDraft, setMotDraft] = useState(c.closingMotivo ?? "");
  const [bvForm, setBvForm] = useState({ decision: "VALIDATED", fundament: "" });
  const [replyingToInstructionId, setReplyingToInstructionId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [draftCc, setDraftCc] = useState<{ id: string; role?: string; userId?: string; label: string }[]>([]);
  const [showOpValDialog, setShowOpValDialog] = useState(false);
  const [opValForm, setOpValForm] = useState<{ result: OperationalValidationResult; note: string }>({ result: "OK", note: "" });
  const [opValBusy, setOpValBusy] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 768 : false));

  useEffect(() => {
    const onResize = () => setIsMobile(typeof window !== "undefined" ? window.innerWidth <= 768 : false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isClosed = normalizeStatus(c.status) === "Cerrado";
  const hasOperationalValidation = getOperationalValidationClosureResult(c).isOperationalValidationSatisfied;
  const ns = normalizeStatus(c.status);
  const criticalityLabel = (UI_TEXT_GOVERNANCE.criticality as Record<string, string>)[{ CRITICA: "C4_CRITICAL", ALTA: "C3_HIGH", MEDIA: "C2_MEDIUM", BAJA: "C1_LOW" }[c.criticality] ?? ""] ?? c.criticality;
  const canAssign =
    !isClosed &&
    canDo("assign", currentUser, c);
  const ca = (auditLog as { caseId?: string }[]).filter((e) => e.caseId === c.id);
  const assignee = USERS.find((u) => u.id === c.assignedTo) || (c.assignedTo ? { name: c.assignedTo } : null);
  const div = checkLocalDivergence(c, localCatalog as LocalCatalog);
  const tlC: Record<string, string> = {
    DETECTED: themeColor("success"), REPORTED: themeColor("primary"), FIRST_ACTION: themeColor("warning"), ESCALATED: themeColor("danger"), RESOLVED: themeColor("success"),
    CLOSED: themeColor("gray"), BYPASS: themeColor("purpleLight"), COMMENT: themeColor("muted"), MITIGATED: themeColor("warningAlt"), RECEPCIONADO: themeColor("purpleLight"),
    REASSESSMENT: themeColor("warning"), IN_MANAGEMENT: themeColor("primary"), BYPASS_VALIDATED: themeColor("success"), BYPASS_REVOKED: themeColor("danger"),
    OPERATIONAL_VALIDATION: themeColor("success"),
  };
  const insUserId = currentUser?.id ?? null;
  const insUserRole = (currentUser as { role?: string } | null)?.role ?? null;
  const instructionsSorted = useMemo(() => {
    const list = (c.instructions ?? []).filter((ins) => isInstructionForUser(ins, currentUser ?? undefined));
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [c.instructions, insUserId, insUserRole]);
  const isOpView = uiMode === "OP";

  return (
    <div style={{ position: "relative" }}>
      {isClosed && <ClosedOverlay />}
      {gate.contextType === "SIMULACION" && gate.simulatedRoleLabel && (
        <>
          <div style={{ color: gate.themeColor("mutedAlt"), fontSize: "11px", marginBottom: 4 }}>
            Ejercicio actual: actuando como {gate.simulatedRoleLabel}
          </div>
          {gate.simulatedRoleId && SIMULATED_ROLE_HELP[gate.simulatedRoleId] && (
            <div style={{ color: gate.themeColor("muted"), fontSize: "11px", marginBottom: 6, fontStyle: "italic" }}>
              {SIMULATED_ROLE_HELP[gate.simulatedRoleId]}
            </div>
          )}
        </>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" style={S.btn?.("dark") as React.CSSProperties} onClick={() => setView("dashboard")}>← Volver</button>
          {!isOpView && <span style={{ fontFamily: "monospace", color: themeColor("muted"), fontSize: "12px" }}>{c.id}</span>}
          <Badge style={S.badge?.(critColor(c.criticality)) as React.CSSProperties} size="sm">{criticalityLabel}</Badge>
          <Badge style={S.badge?.(statusColor(normalizeStatus(c.status) as CaseStatus)) as React.CSSProperties} size="sm">
            {normalizeStatus(c.status) === "Otros / Desconocido" ? String(c.status) : normalizeStatus(c.status)}
          </Badge>
          {c.bypass && (
            <Badge style={S.badge?.(c.bypassFlagged && !c.bypassValidated ? themeColor("danger") : themeColor("warning")) as React.CSSProperties} size="sm">
              ⚡ {UI_TEXT.states.modoUrgente}{c.bypassFlagged && !c.bypassValidated ? " ⚠️ " + UI_TEXT.states.flaggedShort : ""}{c.bypassValidated ? " [" + c.bypassValidated + "]" : ""}
            </Badge>
          )}
          {!isOpView && <SlaBadge c={c} />}<RecBadge c={c} variant={isOpView ? "OP" : "FULL"} />
          {isOpView && normalizeStatus(c.status) === "Resuelto" && (
            hasOperationalValidation ? (
              <button id="btn-operational-validate" type="button" style={{ ...(S.btn?.("dark") as React.CSSProperties), opacity: 0.8, cursor: "default" }} disabled title={UI_TEXT.buttons.operationalValidated}>
                {UI_TEXT.buttons.operationalValidated}
              </button>
            ) : (
              <button id="btn-operational-validate" type="button" style={S.btn?.("primary") as React.CSSProperties} onClick={() => setShowOpValDialog(true)}>
                {UI_TEXT_GOVERNANCE.buttons.validateOperation}
              </button>
            )
          )}
        </div>
        {!isOpView && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button type="button" style={S.btn?.("dark") as React.CSSProperties} onClick={() => exportCaseTXT(c)}>⬇ TXT</button>
            <button type="button" style={S.btn?.("dark") as React.CSSProperties} onClick={() => { const txt = `MINUTA SCCE\nID: ${c.id} | ${fmtDate(nowISO())}\nLocal: ${c.local || "—"}\nResumen: ${c.summary}\nCriticidad: ${c.criticality} | Estado: ${c.status}`; navigator.clipboard?.writeText(txt); notify(UI_TEXT.buttons.minutaCopiada); }}>📋 Minuta</button>
            {canAssign && (
              <select style={{ ...(S.inp as React.CSSProperties), width: "auto" }} onChange={(e) => { const v = e.target.value; if (v) assignCaseResponsible(c.id, v); }}>
                <option value="">{UI_TEXT_GOVERNANCE.buttons.assignCommand}...</option>
                {USERS.filter((u) => u.region === c.region || !u.region).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            {normalizeStatus(c.status) === "Resuelto" && (
              hasOperationalValidation ? (
                <button id="btn-operational-validate-full" type="button" style={{ ...(S.btn?.("dark") as React.CSSProperties), opacity: 0.8, cursor: "default" }} disabled title={UI_TEXT.buttons.operationalValidated}>
                  {UI_TEXT.buttons.operationalValidated}
                </button>
              ) : (
                <button id="btn-operational-validate-full" type="button" style={S.btn?.("primary") as React.CSSProperties} onClick={() => setShowOpValDialog(true)}>
                  {UI_TEXT_GOVERNANCE.buttons.validateOperation}
                </button>
              )
            )}
            {(canDo("update", currentUser, c) || canDo("close", currentUser, c)) && (
              <select style={{ ...(S.inp as React.CSSProperties), width: "auto" }} value={normalizeStatus(c.status)} onChange={(e) => changeStatus(c.id, e.target.value as CaseStatus)}>
                {["Nuevo", "Recepcionado por DR", "En gestión", "Escalado", "Mitigado", "Resuelto", "Cerrado"].map((st) => <option key={st}>{st}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      <CaseProgressSection c={c} />
      <GovernanceSection
        c={c}
        normalizedStatus={ns}
        assignee={assignee ? { name: assignee.name, role: (assignee as { role?: string }).role } : null}
      />

      {!isOpView && div && (
        <div style={{ ...(S.card as React.CSSProperties), background: themeColor("orangeBlock"), border: "2px solid #f97316", marginBottom: 8 }}>
          <div style={{ color: themeColor("warning"), fontWeight: 700, marginBottom: 4 }}>⚡ Divergencia de catálogo</div>
          <div style={{ fontSize: "12px", color: themeColor("legacyAmberText"), marginBottom: 4 }}>{div.msg}</div>
          <div style={{ fontSize: "11px", color: themeColor("muted") }}>Snapshot: <span style={{ color: themeColor("mutedAlt"), fontFamily: "monospace" }}>{c.localSnapshot?.nombre} [{c.localSnapshot?.idLocal}]</span> @ {fmtDate(c.localSnapshot?.snapshotAt ?? "")}</div>
          <div style={{ fontSize: "10px", color: themeColor("mutedDark"), marginTop: 4 }}>{UI_TEXT_GOVERNANCE.helperText.divergenceLegalNote}</div>
        </div>
      )}

      {c.bypassFlagged && !c.bypassValidated && (
        <div style={{ ...(S.card as React.CSSProperties), background: themeColor("redBlock"), border: "2px solid #ef4444", marginBottom: 8 }}>
          <div style={{ color: themeColor("danger"), fontWeight: 700, marginBottom: 4 }}>⚠️ {UI_TEXT.states.modoUrgente} — {UI_TEXT.misc.validacionExpost}</div>
          <div style={{ fontSize: "11px", color: themeColor("legacyRedText"), marginBottom: 8 }}>Motivo: {c.bypassMotivo || "—"}</div>
          {canDo("validateBypass", currentUser, c) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <select style={{ ...(S.inp as React.CSSProperties), width: "auto" }} value={bvForm.decision} onChange={(e) => setBvForm((p) => ({ ...p, decision: e.target.value }))}>
                <option value="VALIDATED">{UI_TEXT.labels.validarExcepcion}</option>
                <option value="REVOKED">{UI_TEXT.labels.revocarExcepcion}</option>
              </select>
              <input style={{ ...(S.inp as React.CSSProperties), flex: 1, minWidth: 200 }} placeholder={UI_TEXT.labels.fundamentoObligatorio} value={bvForm.fundament} onChange={(e) => setBvForm((p) => ({ ...p, fundament: e.target.value }))} />
              <button type="button" style={S.btn?.(bvForm.decision === "VALIDATED" ? "success" : "danger") as React.CSSProperties} onClick={() => validateBypass(c.id, bvForm.decision, bvForm.fundament)}>{bvForm.decision === "VALIDATED" ? UI_TEXT.labels.validar : UI_TEXT.labels.revocar}</button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isOpView ? "1fr" : "1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ ...(S.card as React.CSSProperties), marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: 4 }}>{c.summary}</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 8, padding: "5px 8px", background: themeColor("infoBg"), border: "1px solid #93c5fd", borderRadius: 4 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: "11px", color: themeColor("infoIcon"), fontWeight: 700 }}>🏫 Local:</span>
                  <span style={{ fontWeight: 600 }}>{c.local || "—"}</span>
                  {div && <Badge style={{ ...(S.badge?.(themeColor("warning")) as React.CSSProperties), fontSize: "8px" }} size="xs">⚡ MODIF.</Badge>}
                </div>
                {c.localSnapshot && <div style={{ fontSize: "9px", color: themeColor("mutedDark"), marginTop: 1 }}>📸 {c.localSnapshot.idLocal} · {fmtDate(c.localSnapshot.snapshotAt)}</div>}
              </div>
            </div>
            <div style={{ color: themeColor("mutedAlt"), fontSize: "12px", marginBottom: 8 }}>{c.detail || "—"}</div>
            <div style={{ marginBottom: 8 }}>
              <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>{UI_TEXT.labels.evidenceTitle}</div>
              {c.evidence && c.evidence.length > 0 ? (
                c.evidence.map((ev, i) => (
                  <div key={`${c.id}-ev-${i}`} style={{ fontSize: "12px", marginBottom: 4 }}>📎 {ev}</div>
                ))
              ) : (
                <div style={{ fontSize: "12px", color: themeColor("mutedAlt") }}>—</div>
              )}
            </div>
            <div style={S.g2 as React.CSSProperties}>
              <div><span style={{ color: themeColor("muted") }}>Región:</span> {regionsMap[c.region]?.name}</div>
              <div><span style={{ color: themeColor("muted") }}>Comuna:</span> {getCommuneDisplayName(regionsMap, c.region ?? "", c.commune ?? "")}</div>
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

          {!isClosed && (canDo("close", currentUser, c) || normalizeStatus(c.status) === "Resuelto") && (
            <div style={{ ...(S.card as React.CSSProperties), marginBottom: 8, border: "1px solid #22c55e44" }}>
              <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>{UI_TEXT_GOVERNANCE.fields.closeReason}</div>
              <textarea style={{ ...(S.inp as React.CSSProperties), height: 50, resize: "vertical" }} value={motDraft} onChange={(e) => setMotDraft(e.target.value)} placeholder={UI_TEXT_GOVERNANCE.placeholders.closeReason} />
              <button type="button" style={{ ...(S.btn?.("success") as React.CSSProperties), marginTop: 4, fontSize: "11px" }} onClick={() => {
                if (motDraft.trim().length === 0) { notify(UI_TEXT_GOVERNANCE.validationMessages.enterCloseReason, "error"); return; }
                setCases((prev) => prev.map((x) => x.id !== c.id ? x : { ...x, closingMotivo: motDraft, updatedAt: nowISO() }));
                setAuditLog((prev) => appendEvent(prev as AuditLogEntry[], "CASE_UPDATED", currentUser.id, currentUser.role ?? "", c.id, UI_TEXT_GOVERNANCE.eventLabels.CLOSE_REASON_ADDED));
                notify(UI_TEXT_GOVERNANCE.successMessages.closeReasonSaved, "success");
              }}>{c.closingMotivo ? UI_TEXT_GOVERNANCE.buttons.updateCloseReason : UI_TEXT_GOVERNANCE.buttons.saveCloseReason}</button>
              {c.closingMotivo && <div style={{ marginTop: 4, fontSize: "11px", color: themeColor("success") }}>✓ {c.closingMotivo.slice(0, 60)}</div>}
            </div>
          )}

          {!isOpView && (
            <div style={{ ...(S.card as React.CSSProperties), marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600 }}>FICHA EVALUACIÓN</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Badge style={{ ...(S.badge?.(themeColor("success")) as React.CSSProperties), fontSize: "9px" }} size="xs">🔒 BLOQUEADA</Badge>
                  {!isClosed && canDo("update", currentUser, c) && (
                    <button type="button" style={{ ...(S.btn?.("dark") as React.CSSProperties), fontSize: "10px", padding: "2px 8px" }} onClick={() => setShowRA((p) => !p)}>{showRA ? "✕" : "✏ Reevaluar"}</button>
                  )}
                </div>
              </div>
              {(() => {
                const ev = c.evaluation ?? {};
                return Object.entries({ continuidad: "Continuidad", integridad: "Integridad jurídica", seguridad: "Seguridad", exposicion: "Exposición", capacidadLocal: "Capacidad local" }).map(([k, lbl]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ color: themeColor("mutedAlt"), fontSize: "11px" }}>{lbl}</span>
                    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                      {[0, 1, 2, 3].map((n) => <div key={n} style={{ width: 14, height: 14, borderRadius: 2, background: (ev[k as keyof typeof ev] ?? 0) >= n ? [themeColor("success"), themeColor("warningAlt"), themeColor("warning"), themeColor("danger")][n] : themeColor("border") }} />)}
                      <span style={{ marginLeft: 4, color: [themeColor("success"), themeColor("warningAlt"), themeColor("warning"), themeColor("danger")][ev[k as keyof typeof ev] ?? 0], fontWeight: 700 }}>{ev[k as keyof typeof ev] ?? 0}</span>
                    </div>
                  </div>
                ));
              })()}
              <div style={{ marginTop: 6, borderTop: "1px solid #e5e7eb", paddingTop: 6, display: "flex", justifyContent: "space-between" }}>
                {isOpView ? (
                  <><span style={{ color: themeColor("muted"), fontSize: "11px" }}>Criticidad:</span><span style={{ color: critColor(c.criticality), fontWeight: 700 }}>{c.criticality}</span></>
                ) : (
                  <><span style={{ color: themeColor("muted"), fontSize: "11px" }}>Nivel:</span><span style={{ color: critColor(c.criticality), fontWeight: 700 }}>{c.criticalityScore}/15 — {c.criticality}</span></>
                )}
              </div>
              {showRA && (
                <div style={{ ...(S.card as React.CSSProperties), background: themeColor("bgSurface"), marginTop: 8, border: "1px solid #f9731644" }}>
                  <div style={{ color: themeColor("warning"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>REEVALUACIÓN</div>
                  {Object.entries({ continuidad: "Continuidad", integridad: "Integridad", seguridad: "Seguridad", exposicion: "Exposición", capacidadLocal: "Cap. Local" }).map(([k, lbl]) => (
                    <div key={k} style={{ marginBottom: 6, display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ color: themeColor("mutedAlt"), fontSize: "11px", width: 90, flexShrink: 0 }}>{lbl}</span>
                      {[0, 1, 2, 3].map((n) => (
                        <button key={n} type="button" onClick={() => setRaEval((p) => ({ ...p, [k]: n }))} style={{ padding: "3px 9px", borderRadius: 3, border: "1px solid", cursor: "pointer", fontWeight: 700, fontSize: "12px", background: raEval[k] === n ? [themeColor("success"), themeColor("warningAlt"), themeColor("warning"), themeColor("danger")][n] : "transparent", borderColor: ["#22c55e44", "#eab30844", "#f9731644", "#ef444444"][n], color: raEval[k] === n ? themeColor("white") : [themeColor("success"), themeColor("warningAlt"), themeColor("warning"), themeColor("danger")][n] }}>{n}</button>
                      ))}
                    </div>
                  ))}
                  <label style={S.lbl as React.CSSProperties} htmlFor="ra-just">Justificación *</label>
                  <input id="ra-just" style={S.inp as React.CSSProperties} placeholder={UI_TEXT_GOVERNANCE.placeholders.reevaluationFundament} value={raJust} onChange={(e) => setRaJust(e.target.value)} />
                  <button type="button" style={{ ...(S.btn?.("warning") as React.CSSProperties), marginTop: 6 }} onClick={() => {
                    if (raJust.trim().length === 0) { notify(UI_TEXT_GOVERNANCE.validationMessages.justificationRequired, "error"); return; }
                    requestReassessment(c.id, raEval, raJust);
                    setShowRA(false);
                    setRaJust("");
                  }}>{UI_TEXT_GOVERNANCE.buttons.registerReevaluation}</button>
                </div>
              )}
            </div>
          )}

          {!isOpView && (
            <div style={S.card as React.CSSProperties}>
              <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>MÉTRICAS</div>
              {[["T. Activación", timeDiff(c.origin?.detectedAt, c.reportedAt)], ["T. 1ª Acción", timeDiff(c.reportedAt, c.firstActionAt)], ["T. Escalamiento", timeDiff(c.reportedAt, c.escalatedAt)], ["T. Resolución", timeDiff(c.reportedAt, c.resolvedAt)]].map(([l, v]) => (
                <div key={String(l)} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, fontSize: "12px" }}>
                  <span style={{ color: themeColor("muted") }}>{l}</span>
                  <span style={{ color: v != null ? themeColor("legacySlate") : themeColor("mutedDark") }}>{v != null ? `${v} min` : "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ ...(S.card as React.CSSProperties), marginBottom: 8 }}>
            <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>{UI_TEXT_GOVERNANCE.sections.timeline.toUpperCase()}</div>
            <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {(c.timeline ?? []).map((t, i) => {
                const u = USERS.find((u) => u.id === t.actor);
                const te = t as typeof t & { eventId?: string; kind?: string; refInstructionId?: string };
                const eventKey = te.eventId ?? `${t.at}_${t.actor}_${i}`;
                const formalLabels: Record<string, string> = { INSTRUCTION_CREATED: UI_TEXT.labels.instructionCreated, INSTRUCTION_ACK: UI_TEXT.labels.instructionAck, INSTRUCTION_CLOSED: UI_TEXT.labels.instructionClosed };
                const formalLabel = te.kind && formalLabels[te.kind];
                const typeLabelOverride = (UI_TEXT_GOVERNANCE.eventLabels as Record<string, string>)[te.type] ?? (te.type === "OPERATIONAL_VALIDATION" ? UI_TEXT_GOVERNANCE.fields.operationalValidation : undefined);
                const isReply = te.kind === "INSTRUCTION_REPLY" && te.refInstructionId;
                const ins = isReply ? (c.instructions ?? []).find((ins) => ins.id === te.refInstructionId) : null;
                const scopeFLabel = { OPERACIONES: UI_TEXT.labels.scopeOperaciones, FISCALIZACION: UI_TEXT.labels.scopeFiscalizacion, SEGURIDAD: UI_TEXT.labels.scopeSeguridad, TI: UI_TEXT.labels.scopeTI, INFRAESTRUCTURA: UI_TEXT.labels.scopeInfraestructura, OTRO: UI_TEXT.labels.scopeOtro }[ins?.scopeFunctional ?? "OPERACIONES"] ?? ins?.scopeFunctional ?? "";
                const replyPrefix = ins ? `Respuesta a instrucción ${ins.impactLevel ?? "L1"} ${scopeFLabel} (${fmtTime(ins.createdAt)}): ` : (isReply ? `${UI_TEXT.labels.instructionUnavailable}: ` : "");
                const ovResult = (te as { result?: string }).result;
                const ovNote = te.type === "OPERATIONAL_VALIDATION" ? `${ovResult || ""}${(t.note || "") ? `: ${t.note}` : ""}` : "";
                const displayNote = te.type === "OPERATIONAL_VALIDATION" ? ovNote : formalLabel ? (t.note ?? "") : replyPrefix ? (replyPrefix + (t.note ?? "")) : (t.note ?? "");
                const typeLabel = formalLabel ?? typeLabelOverride ?? (isReply ? UI_TEXT.labels.instructionReplyLabel : t.type);
                return (
                  <div key={eventKey} style={{ display: "flex", gap: 8, alignItems: "flex-start", paddingBottom: 8, borderBottom: "1px solid #e5e7eb" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: tlC[t.type] || themeColor("muted"), marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "10px", color: themeColor("mutedDark") }}>{fmtDate(t.at)}</div>
                      <div style={{ fontSize: "11px", color: tlC[t.type] || themeColor("muted"), fontWeight: 600 }}>{typeLabel}</div>
                      <div style={{ fontSize: "11px", color: themeColor("mutedAlt") }}>{displayNote}{u && <span style={{ color: themeColor("mutedDark") }}> — {u.name}</span>}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ ...(S.card as React.CSSProperties), marginBottom: 8 }}>
            <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>{UI_TEXT_GOVERNANCE.sections.actions.toUpperCase()}</div>
            {((c.actions ?? []) as { id?: string; action?: string; responsible?: string; at?: string; result?: string }[]).map((a) => {
              const u = USERS.find((u) => u.id === a.responsible);
              return (
                <div key={a.id ?? ""} style={{ ...(S.card as React.CSSProperties), background: themeColor("bgSurface"), marginBottom: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: "12px" }}>{a.action}</div>
                  <div style={{ fontSize: "10px", color: themeColor("mutedDark") }}>{u?.name} | {fmtDate(a.at ?? "")}</div>
                  {a.result && <div style={{ fontSize: "11px", color: themeColor("success"), marginTop: 2 }}>→ {a.result}</div>}
                </div>
              );
            })}
            {!isClosed && canDo("update", currentUser, c) && (
              <div style={{ marginTop: 6, borderTop: "1px solid #e5e7eb", paddingTop: 6 }}>
                <input style={{ ...(S.inp as React.CSSProperties), marginBottom: 4 }} placeholder={UI_TEXT_GOVERNANCE.placeholders.actionShort} value={aForm.action} onChange={(e) => setAForm((p) => ({ ...p, action: e.target.value }))} />
                <div style={{ ...(S.g2 as React.CSSProperties), marginBottom: 4 }}>
                  <select style={S.inp as React.CSSProperties} value={aForm.responsible} onChange={(e) => setAForm((p) => ({ ...p, responsible: e.target.value }))}>
                    {USERS.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <input style={S.inp as React.CSSProperties} placeholder="Resultado..." value={aForm.result} onChange={(e) => setAForm((p) => ({ ...p, result: e.target.value }))} />
                </div>
                <button type="button" style={S.btn?.("primary") as React.CSSProperties} onClick={async () => {
                  if (aForm.action.trim().length === 0) return;
                  const ok = await addAction(c.id, aForm.action, aForm.responsible, aForm.result);
                  if (ok) {
                    setAForm({ action: "", responsible: currentUser.id, result: "" });
                    notify(UI_TEXT_GOVERNANCE.successMessages.actionSaved);
                  }
                }}>{UI_TEXT_GOVERNANCE.buttons.addActionShort}</button>
              </div>
            )}
          </div>

          <div style={{ ...(S.card as React.CSSProperties), marginBottom: 8 }}>
            <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>{UI_TEXT_GOVERNANCE.sections.decisions.toUpperCase()}</div>
            {((c.decisions ?? []) as { who?: string; fundament?: string }[]).map((d, i) => {
              const u = USERS.find((u) => u.id === d.who);
              return (
                <div key={`${c.id}-dec-${i}`} style={{ fontSize: "11px", marginBottom: 4, padding: 4, background: themeColor("legacyGrayBg"), borderRadius: 3 }}>
                  <span style={{ color: themeColor("muted") }}>{u?.name}: </span>{d.fundament}
                </div>
              );
            })}
            {!isClosed && (canDo("update", currentUser, c) || canDo("close", currentUser, c)) && (
              <div style={{ marginTop: 6 }}>
                <input style={S.inp as React.CSSProperties} placeholder={UI_TEXT_GOVERNANCE.placeholders.decisionFundament} value={decForm} onChange={(e) => setDecForm(e.target.value)} />
                <button type="button" style={{ ...(S.btn?.("dark") as React.CSSProperties), marginTop: 4 }} onClick={() => {
                  if (decForm.trim().length === 0) return;
                  addDecision(c.id, decForm);
                  setDecForm("");
                  notify(UI_TEXT_GOVERNANCE.successMessages.decisionSaved);
                }}>{UI_TEXT_GOVERNANCE.buttons.addDecisionShort}</button>
              </div>
            )}
            {canDo("close", currentUser, c) && normalizeStatus(c.status) !== "Cerrado" && (
              <div style={{ marginTop: 8, padding: 6, background: themeColor("legacyGrayBg"), borderRadius: 4, fontSize: "10px" }}>
                <div style={{ color: themeColor("muted"), fontWeight: 600, marginBottom: 3 }}>VERIFICACIONES INDIVIDUALES DE CIERRE:</div>
                {[[c.actions?.length, UI_TEXT_GOVERNANCE.checklist.atLeastOneAction], [c.decisions?.length, UI_TEXT_GOVERNANCE.checklist.atLeastOneDecision], [normalizeStatus(c.status) === "Resuelto", UI_TEXT_GOVERNANCE.checklist.statusResolved], [hasOperationalValidation, UI_TEXT_GOVERNANCE.checklist.operationalValidation], [!!c.closingMotivo, UI_TEXT_GOVERNANCE.checklist.closeReasonSaved], [!c.bypassFlagged || !!c.bypassValidated, UI_TEXT_GOVERNANCE.checklist.bypassResolved]].map(([ok, lbl], idx) => (
                  <div key={`req-${idx}-${String(lbl)}`} style={{ color: ok ? themeColor("success") : themeColor("danger") }}>{ok ? "✓" : "✕"} {lbl}</div>
                ))}
              </div>
            )}
          </div>

          <div style={{ ...(S.card as React.CSSProperties), marginBottom: 8 }}>
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
                  const impactBadgeColor = impact === "L3" ? themeColor("danger") : impact === "L2" ? themeColor("warning") : themeColor("muted");
                  return (
                    <div key={ins.id} style={{ ...(S.card as React.CSSProperties), background: themeColor("bgSurface"), padding: 8 }}>
                      <div style={{ fontSize: "11px", color: themeColor("muted"), marginBottom: 4, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        <span>{ins.scope} · {ins.audience} · {fmtDate(ins.createdAt)}</span>
                        <Badge style={S.badge?.(impactBadgeColor) as React.CSSProperties} size="sm">{impact}</Badge>
                        <span style={{ color: themeColor("mutedAlt") }}>{scopeFLabel}</span>
                        {hasBypass && (
                          <Tooltip content={ins.bypass?.reason || ""}>
                            <Badge style={{ ...(S.badge?.(themeColor("legacyRedDark")) as React.CSSProperties), cursor: "help" }} size="sm">{UI_TEXT.labels.instructionBypassBadge}</Badge>
                          </Tooltip>
                        )}
                      </div>
                      <div style={{ fontSize: "10px", color: themeColor("mutedDark"), marginBottom: 2 }}>{USERS.find((u) => u.id === ins.createdBy)?.name ?? ins.createdBy}</div>
                      <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: 4 }}>{ins.summary}</div>
                      {ins.details && <div style={{ fontSize: "11px", color: themeColor("mutedAlt"), marginBottom: 4 }}>{ins.details}</div>}
                      {ins.cc?.length ? <div style={{ fontSize: 10, color: themeColor("muted"), marginBottom: 4 }}>{UI_TEXT.labelsCc?.ccReadOnly ?? "Con copia:"} {ins.cc.map((x) => x.label).join(", ")}</div> : null}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                        <Badge style={S.badge?.(acked ? themeColor("success") : themeColor("warningAlt")) as React.CSSProperties} size="sm">{acked ? UI_TEXT.labels.statusAcked : UI_TEXT.labels.statusPending}</Badge>
                        {isClosedStatus(ins.status) && <Badge style={S.badge?.(themeColor("muted")) as React.CSSProperties} size="sm">Cerrada</Badge>}
                        {last && <span style={{ fontSize: "10px", color: themeColor("muted") }}>Acusado: {USERS.find((u) => u.id === last.userId)?.name ?? last.userId} @ {fmtDate(last.at)}</span>}
                        {!acked && currentUser?.id && ins.ackRequired && (
                          <button type="button" style={{ ...(S.btn?.("primary") as React.CSSProperties), fontSize: "10px", padding: "4px 8px" }} title={UI_TEXT.tooltips.ackConfirmReceipt} disabled={!!busyAction[`ack_${c.id}_${ins.id}`]} onClick={() => withBusy(`ack_${c.id}_${ins.id}`, () => ackInstruction(c.id, ins.id))}>{UI_TEXT.buttons.ackConfirmReceipt}</button>
                        )}
                        {!isClosedStatus(ins.status) && canDo("instruct", currentUser, c) && (
                          <button type="button" style={{ ...(S.btn?.("dark") as React.CSSProperties), fontSize: "10px", padding: "4px 8px" }} disabled={!!busyAction[`close_${c.id}_${ins.id}`]} onClick={() => withBusy(`close_${c.id}_${ins.id}`, () => closeInstruction(c.id, ins.id))}>{UI_TEXT.buttons.closeInstruction}</button>
                        )}
                      </div>
                      {currentUser?.id && (
                        <div style={{ marginTop: 6, borderTop: "1px solid #e5e7eb", paddingTop: 6 }}>
                          {replyingToInstructionId !== ins.id ? (
                            <button type="button" style={{ ...(S.btn?.("dark") as React.CSSProperties), fontSize: "10px", padding: "4px 8px" }} onClick={() => { setReplyingToInstructionId(ins.id); setReplyDraft(""); }}>{UI_TEXT.buttons.replyToInstruction}</button>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <textarea style={{ ...(S.inp as React.CSSProperties), height: 48, resize: "vertical", fontSize: "11px" }} placeholder={UI_TEXT.misc.instructionReplyPlaceholder} value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} rows={2} />
                              <div style={{ display: "flex", gap: 6 }}>
                                <button type="button" style={{ ...(S.btn?.("primary") as React.CSSProperties), fontSize: "10px", padding: "4px 10px" }} onClick={() => { if (!replyDraft.trim()) return; addInstructionReply(c.id, ins.id, replyDraft); setReplyDraft(""); setReplyingToInstructionId(null); notify(UI_TEXT.misc.instructionReplySaved); }}>{UI_TEXT.buttons.sendReply}</button>
                                <button type="button" style={{ ...(S.btn?.("dark") as React.CSSProperties), fontSize: "10px", padding: "4px 8px" }} onClick={() => { setReplyingToInstructionId(null); setReplyDraft(""); }}>Cancelar</button>
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

          {canDo("instruct", currentUser, c) && (
            <div style={{ ...(S.card as React.CSSProperties), marginBottom: 8 }}>
              <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>{UI_TEXT.labels.instructionCreateTitle}</div>
              <div style={S.g2 as React.CSSProperties}>
                <label style={S.lbl as React.CSSProperties} htmlFor="ins-scope">{UI_TEXT.labels.scopeLabel}</label>
                <select id="ins-scope" style={S.inp as React.CSSProperties} value={insScope} onChange={(e) => setInsScope(e.target.value)}>
                  <option value="LOCAL">{UI_TEXT.labels.scopeLocal}</option>
                  <option value="COMUNAL">{UI_TEXT.labels.scopeComunal}</option>
                  <option value="REGIONAL">{UI_TEXT.labels.scopeRegional}</option>
                </select>
                <label style={S.lbl as React.CSSProperties} htmlFor="ins-audience">{UI_TEXT.labels.audienceLabel}</label>
                <select id="ins-audience" style={S.inp as React.CSSProperties} value={insAudience} onChange={(e) => setInsAudience(e.target.value)}>
                  <option value="AMBOS">{UI_TEXT.labels.audienceBoth}</option>
                  <option value="PESE">{UI_TEXT.labels.audiencePese}</option>
                  <option value="DELEGADO">{UI_TEXT.labels.audienceDelegado}</option>
                </select>
                <label style={S.lbl as React.CSSProperties} htmlFor="ins-impact">{UI_TEXT.labels.impactLevelLabel}</label>
                <select id="ins-impact" style={S.inp as React.CSSProperties} value={insImpactLevel} onChange={(e) => setInsImpactLevel(e.target.value as ImpactLevel)}>
                  <option value="L1">{UI_TEXT.labels.impactL1}</option>
                  <option value="L2">{UI_TEXT.labels.impactL2}</option>
                  <option value="L3">{UI_TEXT.labels.impactL3}</option>
                </select>
                <label style={S.lbl as React.CSSProperties} htmlFor="ins-scope-func">{UI_TEXT.labels.scopeFunctionalLabel}</label>
                <select id="ins-scope-func" style={S.inp as React.CSSProperties} value={insScopeFunctional} onChange={(e) => setInsScopeFunctional(e.target.value as ScopeFunctional)}>
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
                  {UI_TEXT.warnings?.centralToPeseOrDelegado ?? "Advertencia: instrucción desde Nivel Central a PESE/DELEGADO."}
                </div>
              )}
              <label style={S.lbl as React.CSSProperties} htmlFor="ins-summary">{UI_TEXT.labels.summaryLabelRequired}</label>
              <input id="ins-summary" style={S.inp as React.CSSProperties} placeholder={UI_TEXT.misc.instructionSummaryPlaceholder} value={insSummary} onChange={(e) => setInsSummary(e.target.value)} />
              <label style={S.lbl as React.CSSProperties} htmlFor="ins-details">{UI_TEXT.labels.detailsLabelOptional}</label>
              <textarea id="ins-details" style={{ ...(S.inp as React.CSSProperties), height: 40, resize: "vertical" }} placeholder={UI_TEXT.misc.instructionDetailsPlaceholder} value={insDetails} onChange={(e) => setInsDetails(e.target.value)} />
              <div style={{ marginTop: 8, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" id="ins-bypass" checked={insBypassEnabled} onChange={(e) => setInsBypassEnabled(e.target.checked)} />
                <label htmlFor="ins-bypass" style={{ ...(S.lbl as React.CSSProperties), margin: 0 }}>{UI_TEXT.labels.bypassLabel}</label>
              </div>
              {insBypassEnabled && (
                <textarea style={{ ...(S.inp as React.CSSProperties), height: 36, resize: "vertical", marginBottom: 6 }} placeholder={UI_TEXT.labels.bypassReasonPlaceholder} value={insBypassReason} onChange={(e) => setInsBypassReason(e.target.value)} />
              )}
              <div style={{ marginTop: 8, marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={S.lbl as React.CSSProperties}>{UI_TEXT.labelsCc?.ccLabel ?? "Con copia (CC)"}</span>
                  <button type="button" style={{ ...(S.btn?.("dark") as React.CSSProperties), fontSize: 10, padding: "4px 8px" }} onClick={() => setDraftCc((prev) => [...prev, { id: uuidSimple(), label: "Copia", role: undefined, userId: undefined }])}>{UI_TEXT.buttons.addCc ?? "+ Agregar copia"}</button>
                </div>
                {draftCc.map((ccRow) => (
                  <div key={ccRow.id} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <input style={{ ...(S.inp as React.CSSProperties), flex: 1 }} value={ccRow.label} onChange={(e) => setDraftCc((prev) => prev.map((x) => x.id === ccRow.id ? { ...x, label: e.target.value } : x))} placeholder={UI_TEXT.labelsCc?.ccPlaceholder ?? "Ej: Dirección Regional"} />
                    <button type="button" style={{ ...(S.btn?.("dark") as React.CSSProperties), fontSize: 10, padding: "4px 6px" }} onClick={() => setDraftCc((prev) => prev.filter((x) => x.id !== ccRow.id))}>{UI_TEXT.buttons.removeCc ?? "Quitar"}</button>
                  </div>
                ))}
              </div>
              <button type="button" style={{ ...(S.btn?.("primary") as React.CSSProperties), marginTop: 6 }} title={UI_TEXT.tooltips.caseCreateInstruction} onClick={() => {
                createInstruction({ caseId: c.id, scope: insScope, audience: insAudience, summary: insSummary, details: insDetails, impactLevel: insImpactLevel, scopeFunctional: insScopeFunctional, bypass: insBypassEnabled ? { enabled: true, reason: insBypassReason } : undefined, cc: draftCc.length ? draftCc.map(({ label, role, userId }) => ({ label, role, userId })) : undefined });
                setInsSummary(""); setInsDetails(""); setInsBypassReason(""); setInsBypassEnabled(false); setDraftCc([]);
              }}>{UI_TEXT.buttons.caseCreateInstruction}</button>
            </div>
          )}

          <div style={S.card as React.CSSProperties}>
            <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 6 }}>{UI_TEXT.labels.commentTitle}</div>
            <textarea style={{ ...(S.inp as React.CSSProperties), height: 50, resize: "vertical" }} value={cmtTxt} onChange={(e) => setCmtTxt(e.target.value)} placeholder={UI_TEXT.misc.commentPlaceholder} />
            <button type="button" style={{ ...(S.btn?.("dark") as React.CSSProperties), marginTop: 4 }} onClick={() => { if (!cmtTxt) return; addComment(c.id, cmtTxt); setCmtTxt(""); notify("Registrado"); }}>+ {UI_TEXT.buttons.addComment}</button>
          </div>
        </div>
      </div>

      {!isOpView && (
        <div style={{ ...(S.card as React.CSSProperties), marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600 }}>{UI_TEXT_GOVERNANCE.sections.audit} ({ca.length} eventos)</div>
            <Tooltip content={chainResult.ok ? "Cadena íntegra (hashes coinciden)" : "Cadena comprometida (revisar eventos y hash previo)"}>
              <Badge style={{ ...(S.badge?.(chainResult.ok ? themeColor("success") : themeColor("danger")) as React.CSSProperties), cursor: "help" }} size="sm">
                {chainResult.ok ? "🔗 Cadena íntegra" : "⚠️ Comprometida"}
              </Badge>
            </Tooltip>
          </div>
          <div style={{ maxHeight: 140, overflowY: "auto" }}>
            {ca.map((e, i) => {
              const ev = e as { at?: string; actor?: string; type?: string; role?: string; summary?: string; hash?: string };
              const u = USERS.find((u) => u.id === ev.actor);
              const G = UI_TEXT_GOVERNANCE;
              const tc: Record<string, string> = { CASE_CREATED: themeColor("success"), BYPASS_USED: themeColor("warning"), BYPASS_FLAGGED: themeColor("danger"), INSTRUCTION_BYPASS_USED: themeColor("legacyRedDarkText"), ESCALATED: themeColor("danger"), STATUS_CHANGED: themeColor("warningAlt"), ACTION_ADDED: themeColor("mutedAlt"), EXPORT_DONE: themeColor("purple"), COMMENT_ADDED: themeColor("muted"), REASSESSMENT: themeColor("warning"), DECISION_ADDED: themeColor("primary"), ASSIGNED: themeColor("purpleLight"), OPERATIONAL_VALIDATION: themeColor("success"), LOGIN: themeColor("muted") };
              const eventLabel = (G.eventLabels as Record<string, string>)[ev.type ?? ""] ?? ev.type;
              const actorLabel = u?.name ?? (ev.role && (G.institutionalRole as Record<string, string>)[ev.role]) ?? ((ev.actor?.length ?? 0) > 20 ? "Usuario" : ev.actor) ?? "—";
              const summaryTrim = ev.summary?.trim();
              const displaySummary = summaryTrim && !/^(OK|NUEVO|—|-)$/i.test(summaryTrim) ? ev.summary : ((G.eventLabels as Record<string, string>)[ev.type ?? ""] ?? G.auditSummaryFallback.default);
              return (
                <div key={ev.hash ?? `audit-${c.id}-${ev.at}-${ev.actor}-${i}`} style={{ display: "flex", gap: 6, fontSize: "10px", padding: "3px 0", borderBottom: "1px solid #e5e7eb", flexWrap: "wrap" }}>
                  <span style={{ color: themeColor("mutedDark"), flexShrink: 0, width: 108 }}>{fmtDate(ev.at ?? "")}</span>
                  <span style={{ color: tc[ev.type ?? ""] || themeColor("muted"), fontWeight: 600, flexShrink: 0, width: 130 }}>{eventLabel}</span>
                  <span style={{ color: themeColor("muted"), flexShrink: 0, width: 100 }}>{actorLabel}</span>
                  <span style={{ color: themeColor("mutedAlt"), flexGrow: 1, minWidth: 0 }}>{displaySummary}</span>
                  <span style={{ color: themeColor("legacyGrayBorder"), fontFamily: "monospace", fontSize: "9px" }}>{ev.hash}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showOpValDialog && (
        <>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000 }} onClick={() => setShowOpValDialog(false)} aria-hidden="true" />
          <dialog
            open
            aria-modal="true"
            aria-labelledby="opval-title"
            style={{
              position: "fixed",
              ...(isMobile ? { bottom: 0, left: 0, right: 0, maxHeight: "80vh", borderRadius: "12px 12px 0 0" } : { top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(400px,95vw)", borderRadius: 12 }),
              background: themeColor("white"),
              boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
              zIndex: 1001,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              border: "none",
            }}
          >
            <div id="opval-title" style={{ fontWeight: 800, fontSize: 16 }}>{UI_TEXT.buttons.operationalValidate}</div>
            <label style={S.lbl as React.CSSProperties} htmlFor="opval-result">{UI_TEXT.misc.operationalValidationResultLabel}</label>
            <select id="opval-result" style={S.inp as React.CSSProperties} value={opValForm.result} onChange={(e) => setOpValForm((p) => ({ ...p, result: e.target.value as OperationalValidationResult }))}>
              <option value="OK">{UI_TEXT.misc.operationalValidationResultOk}</option>
              <option value="OBSERVATIONS">{UI_TEXT.misc.operationalValidationResultObservations}</option>
              <option value="FAIL">{UI_TEXT.misc.operationalValidationResultFail}</option>
            </select>
            {(opValForm.result === "OBSERVATIONS" || opValForm.result === "FAIL") && (
              <>
                <label style={S.lbl as React.CSSProperties} htmlFor="opval-note">{UI_TEXT.misc.operationalValidationNotePlaceholder}</label>
                <textarea id="opval-note" style={{ ...(S.inp as React.CSSProperties), minHeight: 80, resize: "vertical" }} value={opValForm.note} onChange={(e) => setOpValForm((p) => ({ ...p, note: e.target.value }))} placeholder={UI_TEXT.misc.operationalValidationNotePlaceholder} />
              </>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <button type="button" style={S.btn?.("dark") as React.CSSProperties} onClick={() => setShowOpValDialog(false)}>Cancelar</button>
              <button
                type="button"
                style={S.btn?.("primary") as React.CSSProperties}
                disabled={opValBusy || ((opValForm.result === "OBSERVATIONS" || opValForm.result === "FAIL") && !opValForm.note.trim())}
                onClick={async () => {
                  if ((opValForm.result === "OBSERVATIONS" || opValForm.result === "FAIL") && !opValForm.note.trim()) return;
                  setOpValBusy(true);
                  await addOperationalValidation(c.id, opValForm.result, opValForm.note.trim());
                  setOpValBusy(false);
                  setShowOpValDialog(false);
                  setOpValForm({ result: "OK", note: "" });
                }}
              >
                {opValBusy ? "Guardando..." : UI_TEXT.buttons.confirmOperationalValidation}
              </button>
            </div>
          </dialog>
        </>
      )}
    </div>
  );
}
