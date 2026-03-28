/**
 * R-4 — Operaciones de casos (submit, estados, instrucciones, timeline).
 * Extraído de App.tsx (2026-03-27).
 */
import type {
  CaseItem,
  InstructionItem,
  ImpactLevel,
  ScopeFunctional,
  CaseStatus,
  Criticality,
  CaseEventKind,
  CaseEvent,
} from "../domain/types";
import { canDo } from "../domain/policyEngine";
import { genId, calcCriticality } from "../domain/caseUtils";
import { calcCompleteness } from "../domain/caseMetrics";
import { findActiveLocal } from "../domain/catalog";
import { validateCaseSchema } from "../domain/caseValidation";
import { nowISO, uuidSimple, isDetectedAtInFuture } from "../domain/date";
import { SLA_MINUTES, type SlaLevel } from "../domain/caseSla";
import { appendEvent } from "../domain/audit";
import { newEventId } from "../domain/eventId";
import { isDuplicateEvent } from "../domain/dedupe";
import { apiRequest } from "../domain/apiClient";
import { getActiveMembership } from "../domain/authSession";
import { isLocalSnapshot } from "../domain/importValidation";
import { UI_TEXT } from "../config/uiTextStandard";
import { isClosedStatus } from "../domain/cases/terrainSort";
import { useAppStore } from "../store/useAppStore";

export type UseCasesOptions = {
  assignedCommuneEffective: string;
  assignedLocalIdEffective: string | null;
};

export function useCases({
  assignedCommuneEffective,
  assignedLocalIdEffective,
}: UseCasesOptions) {
  const {
    currentUser,
    cases,
    setCases,
    newCase,
    setNewCase,
    localCatalog,
    evalForm,
    bypassForm,
    activeRegion,
    authToken,
    setAuditLog,
    setView,
    setNotification,
  } = useAppStore();

  const notify = (msg: string, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  async function submitCase() {
    if (!currentUser || !newCase) return;

    const se = validateCaseSchema(newCase, localCatalog);
    if (se.length) return notify("⚠️ " + se[0], "error");

    const regionSel = (newCase.region ?? "").trim();
    const communeSel = (newCase.commune ?? "").trim();
    if (!communeSel) {
      return notify("⚠️ Debes seleccionar una comuna.", "error");
    }
    const communesInRegion = [...new Set(localCatalog.filter((e) => e.region === regionSel).map((e) => e.commune))];
    if (!communesInRegion.length) {
      return notify("⚠️ Catálogo de locales no disponible para la región seleccionada.", "error");
    }
    if (!communesInRegion.includes(communeSel)) {
      return notify("⚠️ La comuna seleccionada no corresponde a la región indicada.", "error");
    }

    const localName = (newCase.local ?? "").trim();
    if (!localName) {
      return notify("⚠️ Debes seleccionar un local de votación.", "error");
    }

    const now_ = nowISO();

    const detectedAt = newCase.origin?.detectedAt;
    if (!detectedAt) {
      return notify("⚠️ Falta la hora de detección del incidente.", "error");
    }
    if (!Number.isFinite(new Date(detectedAt).getTime())) {
      return notify("⚠️ Hora de detección inválida.", "error");
    }
    if (isDetectedAtInFuture(detectedAt)) {
      return notify("⚠️ La hora de detección no puede estar en el futuro (se permite hasta 5 min por desfase de reloj).", "error");
    }

    const localEntry = findActiveLocal(localCatalog, regionSel, communeSel, localName);
    if (!localEntry) {
      return notify("⚠️ El local seleccionado no existe o no está activo en el catálogo maestro.", "error");
    }
    if (localEntry.region !== regionSel || localEntry.commune !== communeSel) {
      return notify("⚠️ El local seleccionado no corresponde a la comuna/región indicada.", "error");
    }

    if (currentUser.region && regionSel !== currentUser.region) {
      return notify("⚠️ No puedes registrar incidentes fuera de tu región autorizada.", "error");
    }
    if (assignedCommuneEffective && communeSel !== assignedCommuneEffective) {
      return notify("⚠️ No puedes registrar incidentes fuera de tu comuna autorizada.", "error");
    }
    if (assignedLocalIdEffective && localEntry.idLocal !== assignedLocalIdEffective) {
      return notify("⚠️ No puedes registrar incidentes fuera de tu local autorizado.", "error");
    }

    const localSnapshot = {
      idLocal: localEntry.idLocal,
      nombre: localEntry.nombre,
      region: localEntry.region,
      commune: localEntry.commune,
      snapshotAt: now_,
    };

    const result = calcCriticality(evalForm);
    const maxVar = Math.max(...Object.values(evalForm));
    const bypassTechOk = maxVar >= 3 || bypassForm.cause === "system_down";
    const bypassFlagged = bypassForm.active && !bypassTechOk;

    const rCases = cases.filter((c) => c.region === newCase.region && c.commune === newCase.commune);
    const id = genId(newCase.region, newCase.commune, rCases.length + 1);

    const c = {
      ...newCase,
      id,
      localSnapshot,
      evaluation: evalForm,
      evaluationLocked: true,
      evaluationHistory: [],
      criticality: result.criticality,
      criticalityScore: result.score,
      status: bypassForm.active ? "En gestión" : "Nuevo",
      assignedTo: null,
      slaMinutes: (SLA_MINUTES as Record<SlaLevel, number>)[result.criticality as SlaLevel] || 60,
      closingMotivo: null,
      bypassValidated: null,
      timeline: [
        { eventId: newEventId("ev"), type: "DETECTED", at: newCase.origin!.detectedAt, actor: currentUser.id, note: "Detectado" },
        { eventId: newEventId("ev"), type: "REPORTED", at: now_, actor: currentUser.id, note: "Reportado en SCCE" },
      ],
      actions: [],
      decisions: [],
      bypass: bypassForm.active,
      bypassMotivo: bypassForm.motivo,
      bypassFlagged,
      bypassActor: bypassForm.active ? currentUser.id : null,
      peseInoperante: bypassForm.cause === "system_down",
      completeness: 0,
      reportedAt: now_,
      firstActionAt: null,
      escalatedAt: null,
      mitigatedAt: null,
      resolvedAt: null,
      closedAt: null,
      createdBy: currentUser.id,
      createdAt: now_,
      updatedAt: now_,
    };

    c.completeness = calcCompleteness(c as CaseItem);

    const payloadForApi = {
      summary: newCase.summary,
      status: c.status,
      criticality: result.criticality,
      regionCode: activeRegion === "ALL" ? newCase.region : activeRegion,
      communeCode: newCase.commune,
      localCode: newCase.local,
      localSnapshot: localSnapshot ?? undefined,
      // FASE 1: confianza del dato
      dataConfidence: (newCase as { dataConfidence?: string }).dataConfidence ?? "UNKNOWN",
    };

    const token = authToken;
    const ctx = getActiveMembership();
    if (token && ctx) {
      const headers: Record<string, string> = {};
      if (ctx.id) headers["x-scce-membership-id"] = ctx.id;
      if (ctx.contextType && ctx.contextId) {
        headers["x-scce-context-type"] = ctx.contextType;
        headers["x-scce-context-id"] = ctx.contextId;
      }
      const res = await apiRequest<{
        id: string;
        regionCode: string;
        communeCode: string;
        localCode: string;
        localSnapshot?: unknown;
        status: string;
        createdAt: string;
        updatedAt: string;
      }>("/cases", {
        method: "POST",
        token,
        body: payloadForApi,
        headers: Object.keys(headers).length ? headers : undefined,
      });
      if (res.ok) {
        const ls = isLocalSnapshot(res.data.localSnapshot) ? res.data.localSnapshot : localSnapshot;

        const apiCase = {
          ...c,
          id: res.data.id,
          region: res.data.regionCode,
          commune: res.data.communeCode,
          local: res.data.localCode,
          localSnapshot: ls,
          status: res.data.status,
          createdAt: res.data.createdAt,
          updatedAt: res.data.updatedAt,
        } as CaseItem;
        apiCase.completeness = calcCompleteness(apiCase);
        setCases((prev) => [apiCase, ...prev]);
        setAuditLog((prev) => {
          let log = appendEvent(prev, "CASE_CREATED", currentUser.id, currentUser.role, res.data.id, `Caso: ${c.summary.slice(0, 60)}`);
          if (bypassForm.active) log = appendEvent(log, "BYPASS_USED", currentUser.id, currentUser.role, res.data.id, `Bypass: ${bypassForm.motivo}`);
          if (bypassFlagged) log = appendEvent(log, "BYPASS_FLAGGED", currentUser.id, currentUser.role, res.data.id, UI_TEXT.errors.excepcionRequiereValidacion);
          return log;
        });
        notify(
          `Caso ${res.data.id} — ${result.criticality}${bypassFlagged ? " ⚠️ " + UI_TEXT.states.flagged : ""}`,
          result.criticality === "CRITICA" ? "error" : "success"
        );
        setView("dashboard");
        setNewCase(null);
        return;
      }
      notify(res.error || "Error al crear caso en el servidor.", "error");
      return;
    }

    setCases((prev) => [c as CaseItem, ...prev]);

    setAuditLog((prev) => {
      let log = appendEvent(prev, "CASE_CREATED", currentUser.id, currentUser.role, id, `Caso: ${c.summary.slice(0, 60)}`);
      if (bypassForm.active) log = appendEvent(log, "BYPASS_USED", currentUser.id, currentUser.role, id, `Bypass: ${bypassForm.motivo}`);
      if (bypassFlagged) log = appendEvent(log, "BYPASS_FLAGGED", currentUser.id, currentUser.role, id, UI_TEXT.errors.excepcionRequiereValidacion);
      return log;
    });

    notify(
      `Caso ${id} — ${result.criticality}${bypassFlagged ? " ⚠️ " + UI_TEXT.states.flagged : ""}`,
      result.criticality === "CRITICA" ? "error" : "success"
    );

    setView("dashboard");
  }

  function recepcionar(caseId: string) {
    if (!currentUser) return;
    const c = cases.find((x) => x.id === caseId);
    if (!c || !canDo("recepcionar", currentUser, c)) return notify(UI_TEXT.errors.unauthorized, "error");
    setCases((prev) =>
      prev.map((x) =>
        x.id !== caseId
          ? x
          : ({
              ...x,
              status: "Recepcionado por DR",
              updatedAt: nowISO(),
              timeline: [
                ...(x.timeline ?? []),
                {
                  eventId: newEventId("ev"),
                  type: "RECEPCIONADO",
                  at: nowISO(),
                  actor: currentUser.id,
                  note: `Recepcionado por ${currentUser.name}`,
                },
              ],
            } as CaseItem)
      )
    );
    setAuditLog((prev) => appendEvent(prev, "STATUS_CHANGED", currentUser.id, currentUser.role, caseId, "Estado → Recepcionado por DR"));
    // FASE 4: persistir en API
    const afterRec = cases.find((x) => x.id === caseId);
    if (afterRec) syncCase({ ...afterRec, status: "Recepcionado por DR" });
    notify("Caso recepcionado", "success");
  }

  function changeStatus(caseId: string, newStatus: CaseStatus) {
    if (!currentUser) return;
    const c = cases.find((x) => x.id === caseId);
    if (!c) return;
    if (!canDo("update", currentUser, c) && !canDo("close", currentUser, c)) return notify(UI_TEXT.errors.unauthorized, "error");
    if (newStatus === "En gestión" && c.status === "Nuevo" && !c.bypass) return notify("❌ " + UI_TEXT.errors.recepcionarPrimero, "error");
    if (newStatus === "Cerrado") {
      if (c.bypassFlagged && !c.bypassValidated) return notify("❌ " + UI_TEXT.errors.excepcionRequiereValidacion, "error");
      if (!c.actions?.length) return notify("❌ " + UI_TEXT.errors.alMenosUnaAccion, "error");
      if (!c.decisions?.length) return notify("❌ " + UI_TEXT.errors.alMenosUnaDecision, "error");
      if (c.status !== "Resuelto") return notify("❌ " + UI_TEXT.errors.casoDebeEstarResuelto, "error");
      if (!c.closingMotivo) return notify("❌ " + UI_TEXT.errors.ingresaMotivoCierre, "error");
    }
    const tlMap: Record<CaseStatus, string> = {
      Escalado: "ESCALATED",
      Mitigado: "MITIGATED",
      Resuelto: "RESOLVED",
      Cerrado: "CLOSED",
      "En gestión": "IN_MANAGEMENT",
      "Recepcionado por DR": "RECEPCIONADO",
      Nuevo: "DETECTED",
    };
    const tsMap: Partial<Record<CaseStatus, string>> = {
      Escalado: "escalatedAt",
      Mitigado: "mitigatedAt",
      Resuelto: "resolvedAt",
      Cerrado: "closedAt",
    };
    setCases((prev) =>
      prev.map((x) => {
        if (x.id !== caseId) return x;
        const tl = [
          ...(x.timeline ?? []),
          {
            eventId: newEventId("ev"),
            type: tlMap[newStatus] || "STATUS_CHANGED",
            at: nowISO(),
            actor: currentUser.id,
            note: `Estado → ${newStatus}`,
          },
        ];
        return {
          ...x,
          status: newStatus,
          ...(tsMap[newStatus] ? { [tsMap[newStatus]!]: nowISO() } : {}),
          timeline: tl,
          updatedAt: nowISO(),
        } as CaseItem;
      })
    );
    setAuditLog((prev) => appendEvent(prev, "STATUS_CHANGED", currentUser.id, currentUser.role, caseId, `Estado → ${newStatus}`));
    // FASE 4: persistir en API
    const updated = cases.find((x) => x.id === caseId);
    if (updated) syncCase({ ...updated, status: newStatus });
  }

  function validateBypass(caseId: string, decision: string, fundament: string) {
    if (!currentUser) return;
    if (!canDo("validateBypass", currentUser)) return notify(UI_TEXT.errors.soloDirectorValida, "error");
    if (!fundament) return notify(UI_TEXT.errors.fundamentoRequerido, "error");
    const validated = decision === "VALIDATED";
    const bypassEv: CaseEvent = {
      eventId: newEventId("ev"),
      type: validated ? "BYPASS_VALIDATED" : "BYPASS_REVOKED",
      at: nowISO(),
      actor: currentUser.id,
      note: fundament,
    };
    setCases((prev) =>
      prev.map((x) => {
        if (x.id !== caseId) return x;
        const tl = pushTimelineEvent(x.timeline ?? [], bypassEv);
        const nd = [...(x.decisions ?? []), { who: currentUser.id, at: nowISO(), fundament: `Bypass ${validated ? "VALIDADO" : "REVOCADO"}: ${fundament}` }];
        return { ...x, bypassValidated: decision, decisions: nd, timeline: tl, updatedAt: nowISO() } as CaseItem;
      })
    );
    setAuditLog((prev) =>
      appendEvent(prev, validated ? "BYPASS_VALIDATED" : "BYPASS_REVOKED", currentUser.id, currentUser.role, caseId, fundament.slice(0, 80))
    );
    notify(`Excepción ${validated ? "validada" : "revocada"}`, "success");
  }

  function requestReassessment(caseId: string, newEval: Record<string, number>, justification: string) {
    if (!currentUser) return;
    const c = cases.find((x) => x.id === caseId);
    if (!c || !canDo("update", currentUser, c)) return notify(UI_TEXT.errors.unauthorized, "error");
    const nr = calcCriticality(newEval);
    const snap = { previousEval: c.evaluation, at: nowISO(), by: currentUser.id, justification };
    setCases((prev) =>
      prev.map((x) => {
        if (x.id !== caseId) return x;
        const tl = [
          ...(x.timeline ?? []),
          {
            eventId: newEventId("ev"),
            type: "REASSESSMENT",
            at: nowISO(),
            actor: currentUser.id,
            note: `Reevaluación: ${justification}`,
          },
        ];
        const upd = {
          ...x,
          evaluation: newEval,
          criticality: nr.criticality as Criticality,
          criticalityScore: nr.score,
          evaluationHistory: [...(x.evaluationHistory || []), snap],
          timeline: tl,
          updatedAt: nowISO(),
        } as CaseItem;
        upd.completeness = calcCompleteness(upd);
        return upd;
      })
    );
    setAuditLog((prev) => appendEvent(prev, "REASSESSMENT", currentUser.id, currentUser.role, caseId, `Reevaluación: ${justification.slice(0, 60)}`));
    notify("Reevaluación registrada", "success");
  }

  function addAction(caseId: string, action: string, responsible: string, result_: string) {
    if (!currentUser) return;
    const c = cases.find((x) => x.id === caseId);
    if (!c || !canDo("update", currentUser, c)) return notify(UI_TEXT.errors.unauthorized, "error");
    setCases((prev) =>
      prev.map((x) => {
        if (x.id !== caseId) return x;
        const na = { id: "a" + Date.now(), action, responsible, at: nowISO(), result: result_ };
        const tl = [...(x.timeline ?? [])];
        if (!x.firstActionAt) tl.push({ eventId: newEventId("ev"), type: "FIRST_ACTION", at: nowISO(), actor: currentUser.id, note: action });
        const upd = {
          ...x,
          actions: [...(x.actions ?? []), na],
          firstActionAt: x.firstActionAt || nowISO(),
          timeline: tl,
          updatedAt: nowISO(),
        } as CaseItem;
        upd.completeness = calcCompleteness(upd);
        return upd;
      })
    );
    setAuditLog((prev) => appendEvent(prev, "ACTION_ADDED", currentUser.id, currentUser.role, caseId, action.slice(0, 80)));
    // FASE 4: persistir en API
    const afterAdd = cases.find((x) => x.id === caseId);
    if (afterAdd) syncCase(afterAdd);
  }

  function addDecision(caseId: string, fundament: string) {
    if (!currentUser) return;
    const c = cases.find((x) => x.id === caseId);
    if (!c || (!canDo("update", currentUser, c) && !canDo("close", currentUser, c))) return notify(UI_TEXT.errors.unauthorized, "error");
    setCases((prev) =>
      prev.map((x) => {
        if (x.id !== caseId) return x;
        const upd = {
          ...x,
          decisions: [...(x.decisions ?? []), { who: currentUser.id, at: nowISO(), fundament }],
          updatedAt: nowISO(),
        } as CaseItem;
        upd.completeness = calcCompleteness(upd);
        return upd;
      })
    );
    setAuditLog((prev) => appendEvent(prev, "DECISION_ADDED", currentUser.id, currentUser.role, caseId, fundament.slice(0, 60)));
    // FASE 4: persistir en API
    const afterDec = cases.find((x) => x.id === caseId);
    if (afterDec) syncCase(afterDec);
  }

  function addComment(caseId: string, comment: string) {
    if (!currentUser) return;
    setCases((prev) =>
      prev.map((x) =>
        x.id !== caseId
          ? x
          : ({
              ...x,
              timeline: [
                ...(x.timeline ?? []),
                { eventId: newEventId("ev"), type: "COMMENT", at: nowISO(), actor: currentUser.id, note: comment },
              ],
              updatedAt: nowISO(),
            } as CaseItem)
      )
    );
    setAuditLog((prev) => appendEvent(prev, "COMMENT_ADDED", currentUser.id, currentUser.role, caseId, comment.slice(0, 80)));
  }

  function addInstructionReply(caseId: string, instructionId: string, replyText: string) {
    if (!currentUser?.id || !replyText?.trim()) return;
    setCases((prev) =>
      prev.map((x) =>
        x.id !== caseId
          ? x
          : ({
              ...x,
              timeline: [
                ...(x.timeline ?? []),
                {
                  eventId: newEventId("ev"),
                  type: "COMMENT",
                  kind: "INSTRUCTION_REPLY",
                  refInstructionId: instructionId,
                  at: nowISO(),
                  actor: currentUser.id,
                  note: replyText.trim(),
                },
              ],
              updatedAt: nowISO(),
            } as CaseItem)
      )
    );
    setAuditLog((prev) =>
      appendEvent(prev, "COMMENT_ADDED", currentUser.id, currentUser.role, caseId, `Respuesta instrucción ${instructionId}: ${replyText.trim().slice(0, 60)}`)
    );
  }

  function makeInstructionTraceEvent(kind: CaseEventKind, instructionId: string, note: string): CaseEvent {
    return {
      eventId: newEventId("ev"),
      type: "COMMENT",
      kind,
      refInstructionId: instructionId,
      at: nowISO(),
      actor: currentUser!.id,
      note,
    };
  }

  function pushTimelineEvent(timeline: CaseEvent[], ev: CaseEvent): CaseEvent[] {
    if (isDuplicateEvent(timeline, ev)) return timeline;
    return [...timeline, ev];
  }

  function isInstructionAckedByUser(ins: InstructionItem, userId: string): boolean {
    return (ins.acks ?? []).some((a) => a.userId === userId);
  }

  function lastAck(ins: InstructionItem): { userId: string; role: string; at: string } | null {
    const acks = ins.acks ?? [];
    return acks.length > 0 ? acks[acks.length - 1] : null;
  }

  function createInstruction(
    caseId: string,
    scope: string,
    audience: string,
    summary: string,
    details: string,
    impactLevel: ImpactLevel = "L1",
    scopeFunctional: ScopeFunctional = "OPERACIONES",
    bypass?: { enabled: boolean; reason?: string },
    cc?: { role?: string; userId?: string; label: string }[]
  ) {
    if (!currentUser?.id) return;
    if (!summary?.trim()) return notify(UI_TEXT.errors.instructionSummaryRequired, "error");
    const role = currentUser.role;
    const canL3WithoutBypass = role === "DIRECTOR_REGIONAL" || role === "NIVEL_CENTRAL";
    if (impactLevel === "L3" && !canL3WithoutBypass) {
      if (!bypass?.enabled || !bypass?.reason?.trim()) return notify(UI_TEXT.errors.l3RequiresBypass, "error");
      if (bypass.reason.trim().length < 30) return notify(UI_TEXT.errors.bypassReasonMin, "error");
    }
    if (bypass?.enabled && (!bypass?.reason?.trim() || bypass.reason.trim().length < 30)) {
      return notify(UI_TEXT.errors.bypassReasonMin, "error");
    }
    const newIns: InstructionItem = {
      id: uuidSimple(),
      caseId,
      scope: scope || "LOCAL",
      audience: audience || "AMBOS",
      summary: summary.trim(),
      details: details?.trim() || null,
      createdAt: nowISO(),
      createdBy: currentUser.id,
      status: "PENDIENTE",
      ackRequired: true,
      acks: [],
      evidence: [],
      impactLevel,
      scopeFunctional,
      to: {
        label: audience === "AMBOS" ? "Dirección Regional / Terreno" : audience === "PESE" ? "PESE" : "Delegado",
        role: audience === "PESE" ? "PESE" : audience === "DELEGADO" ? "DELEGADO_JE" : undefined,
      },
      ...(cc?.length ? { cc } : {}),
      ...(bypass?.enabled && bypass?.reason?.trim() ? { bypass: { enabled: true, reason: bypass.reason.trim() } } : {}),
    };
    const traceEv = makeInstructionTraceEvent("INSTRUCTION_CREATED", newIns.id, `Instrucción creada: ${newIns.summary.slice(0, 80)}`);
    setCases((prev) =>
      prev.map((x) =>
        x.id !== caseId
          ? x
          : ({
              ...x,
              instructions: [...(x.instructions ?? []), newIns],
              timeline: pushTimelineEvent(x.timeline ?? [], traceEv),
              updatedAt: nowISO(),
            } as CaseItem)
      )
    );
    setAuditLog((prev) =>
      appendEvent(
        prev,
        bypass?.enabled ? "INSTRUCTION_BYPASS_USED" : "COMMENT_ADDED",
        currentUser.id,
        currentUser.role,
        caseId,
        `Instrucción ${impactLevel}: ${summary.slice(0, 50)}${bypass?.enabled ? " [BYPASS]" : ""}`
      )
    );
    notify("Instrucción creada", "success");
  }

  function ackInstruction(caseId: string, instructionId: string) {
    if (!currentUser?.id) return;
    const c = cases.find((x) => x.id === caseId);
    const ins = c?.instructions?.find((i) => i.id === instructionId);
    if (ins && (ins.acks ?? []).some((a) => a.userId === currentUser.id)) return;
    const role = currentUser?.role ?? "unknown";
    const traceEv = makeInstructionTraceEvent("INSTRUCTION_ACK", instructionId, "Acuse registrado");
    setCases((prev) =>
      prev.map((x) => {
        if (x.id !== caseId) return x;
        const instructions = (x.instructions ?? []).map((ins) =>
          ins.id !== instructionId
            ? ins
            : {
                ...ins,
                acks: [...(ins.acks ?? []), { userId: currentUser.id, role, at: nowISO() }],
              }
        );
        return { ...x, instructions, timeline: pushTimelineEvent(x.timeline ?? [], traceEv), updatedAt: nowISO() } as CaseItem;
      })
    );
    setAuditLog((prev) => appendEvent(prev, "COMMENT_ADDED", currentUser.id, currentUser.role, caseId, `Acuse instrucción ${instructionId}`));
    notify(UI_TEXT.buttons.ackConfirmReceipt, "success");
  }

  function closeInstruction(caseId: string, instructionId: string) {
    if (!currentUser?.id) return;
    const c = cases.find((x) => x.id === caseId);
    const ins = c?.instructions?.find((i) => i.id === instructionId);
    if (ins && isClosedStatus(ins.status)) return;
    const traceEv = makeInstructionTraceEvent("INSTRUCTION_CLOSED", instructionId, "Instrucción cerrada");
    setCases((prev) =>
      prev.map((x) => {
        if (x.id !== caseId) return x;
        const instructions = (x.instructions ?? []).map((ins) => (ins.id !== instructionId ? ins : { ...ins, status: "CERRADA" }));
        return { ...x, instructions, timeline: pushTimelineEvent(x.timeline ?? [], traceEv), updatedAt: nowISO() } as CaseItem;
      })
    );
    setAuditLog((prev) => appendEvent(prev, "COMMENT_ADDED", currentUser.id, currentUser.role, caseId, `Instrucción cerrada ${instructionId}`));
    notify("Instrucción cerrada", "success");
  }

  // FASE 4: sincronizar caso con la API (fire-and-forget, no bloquea UI)
  async function syncCase(updatedCase: import("../domain/types").CaseItem) {
    const token = authToken;
    const ctx = getActiveMembership();
    if (!token || !ctx) return; // sin sesión activa, solo local
    const headers: Record<string, string> = {};
    if (ctx.id) headers["x-scce-membership-id"] = ctx.id;
    if (ctx.contextType) headers["x-scce-context-type"] = ctx.contextType;
    if (ctx.contextId) headers["x-scce-context-id"] = ctx.contextId;
    await apiRequest(`/cases/${updatedCase.id}`, {
      method: "PATCH",
      token,
      headers,
      body: {
        status: updatedCase.status,
        actions: updatedCase.actions ?? [],
        decisions: updatedCase.decisions ?? [],
        instructions: updatedCase.instructions ?? [],
        assignedTo: updatedCase.assignedTo ?? null,
        completeness: updatedCase.completeness ?? 0,
        closingMotivo: updatedCase.closingMotivo ?? null,
        dataConfidence: updatedCase.dataConfidence ?? "UNKNOWN",
        orientation: updatedCase.orientation ?? null,
        evaluation: updatedCase.evaluation ?? {},
      },
    });
    // Si falla, no hacemos nada — el estado local sigue siendo válido
    // En una futura iteración se puede agregar retry o notificación
  }

  // FASE 3: avanzar etapa decisional C2
  async function advanceStage(
    caseId: string,
    targetStage: import("../domain/types").DecisionStage,
    justification: string
  ) {
    if (!currentUser) return;
    if (!justification.trim()) return notify("La justificación es obligatoria", "error");

    const STAGE_ORDER: Record<string, number> = {
      DETECTED: 1, VALIDATED: 2, ORIENTED: 3, CLASSIFIED: 4,
      DECIDED: 5, EXECUTING: 6, VERIFIED: 7, CLOSED: 8,
    };

    const c = cases.find((x) => x.id === caseId);
    if (!c) return;
    const currentOrder = STAGE_ORDER[c.decisionStage ?? "DETECTED"] ?? 1;
    const targetOrder  = STAGE_ORDER[targetStage];
    if (!targetOrder || targetOrder <= currentOrder) {
      return notify("Etapa inválida o retroceso no permitido", "error");
    }

    // Llamada a la API si hay sesión activa
    const token = authToken;
    const ctx = getActiveMembership();
    if (token && ctx) {
      const headers: Record<string, string> = {};
      if (ctx.id) headers["x-scce-membership-id"] = ctx.id;
      if (ctx.contextType) headers["x-scce-context-type"] = ctx.contextType;
      if (ctx.contextId) headers["x-scce-context-id"] = ctx.contextId;
      const res = await apiRequest<{ decisionStage: string }>(`/cases/${caseId}/stage`, {
        method: "PATCH",
        token,
        body: { stage: targetStage, justification },
        headers,
      });
      if (!res.ok) return notify(res.error || "Error al avanzar etapa", "error");
    }

    // Actualizar localmente
    setCases((prev) =>
      prev.map((x) =>
        x.id !== caseId
          ? x
          : ({
              ...x,
              decisionStage: targetStage,
              timeline: [
                ...(x.timeline ?? []),
                {
                  eventId: newEventId("ev"),
                  type: "STAGE_ADVANCED",
                  at: nowISO(),
                  actor: currentUser.id,
                  note: `Etapa → ${targetStage}: ${justification.slice(0, 80)}`,
                },
              ],
              updatedAt: nowISO(),
            } as import("../domain/types").CaseItem)
      )
    );
    setAuditLog((prev) =>
      appendEvent(prev, "COMMENT_ADDED", currentUser.id, currentUser.role, caseId,
        `Etapa C2 → ${targetStage}: ${justification.slice(0, 60)}`)
    );
    notify(`Etapa avanzada → ${targetStage}`, "success");
  }

  return {
    submitCase,
    recepcionar,
    changeStatus,
    validateBypass,
    requestReassessment,
    addAction,
    addDecision,
    addComment,
    addInstructionReply,
    makeInstructionTraceEvent,
    pushTimelineEvent,
    isInstructionAckedByUser,
    lastAck,
    createInstruction,
    ackInstruction,
    closeInstruction,
    advanceStage,
    syncCase,
  };
}
