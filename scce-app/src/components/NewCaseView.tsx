/**
 * components/NewCaseView.tsx
 * Asistente multi-paso para registrar un incidente (R-4).
 * Extraído de App.tsx — 2026-03-27.
 */
import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { CaseItem, Criticality, DataConfidence } from "../domain/types";
import { DATA_CONFIDENCE_LABELS, DATA_CONFIDENCE_COLORS } from "../domain/types";
import { canDo } from "../domain/policyEngine";
import { calcCriticality, critColor } from "../domain/caseUtils";
import { CONFIG_REGIONS, getActiveLocals } from "../domain/catalog";
import { validateCaseSchema } from "../domain/caseValidation";
import { nowLocalDatetimeInput } from "../domain/date";
import { UI_TEXT } from "../config/uiTextStandard";
import { themeColor } from "../theme";
import { Badge } from "../ui/Badge";
import { useAppStore, type BypassCause } from "../store/useAppStore";
import { useCases } from "../hooks/useCases";
import { useAssignedLocalScope } from "../hooks/useAssignedLocalScope";

const regionsMap = CONFIG_REGIONS as Record<
  string,
  { name?: string; communes?: Record<string, { name?: string }> }
>;

const S = {
  card: {
    background: themeColor("bgSurface"),
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "12px",
  } as React.CSSProperties,
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
  badge: (color: string) => ({
    background: color + "22",
    color,
    border: "1px solid " + color + "44",
    borderRadius: "3px",
    padding: "2px 6px",
    fontSize: "11px",
    fontWeight: 600,
  }),
};

type LncDraft = {
  region?: string;
  commune?: string;
  local?: string;
  origin?: { channel?: string; detectedAt?: string };
  summary?: string;
  [key: string]: unknown;
};

type DetailStepContentRef = { getDetail: () => string };
type DetailStepContentProps = {
  initialDetail: string;
  newCase: CaseItem | null;
  setNewCase: React.Dispatch<React.SetStateAction<CaseItem | null>>;
  onConfirm: () => void;
  onBack: () => void;
};

const DetailStepContent = forwardRef<DetailStepContentRef, DetailStepContentProps>(
  function DetailStepContent({ initialDetail, newCase, setNewCase, onConfirm, onBack }, ref) {
    const [detail, setDetail] = useState(initialDetail);
    useEffect(() => {
      setDetail(initialDetail);
    }, [initialDetail]);
    useImperativeHandle(
      ref,
      () => ({
        getDetail: () => detail,
      }),
      [detail]
    );
    return (
      <div style={S.card}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 10 }}>
          PASO 3 — DETALLES
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={S.lbl}>Detalle</label>
          <textarea
            style={{ ...S.inp, height: 70, resize: "vertical" }}
            placeholder="Describe el incidente..."
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
          />
        </div>
        <div>
          <label style={S.lbl}>Evidencia (Enter para agregar)</label>
          <input
            style={S.inp}
            placeholder="URL o descripción"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              const target = e.currentTarget;
              if (e.key === "Enter" && target.value) {
                const val = target.value;
                setNewCase((p) =>
                  p ? { ...p, detail, evidence: [...(Array.isArray(p.evidence) ? p.evidence : []), val] } : p
                );
                target.value = "";
              }
            }}
          />
          {(newCase?.evidence || []).map((ev, i) => (
            <div key={i} style={{ fontSize: "11px", color: themeColor("mutedAlt"), marginTop: 2 }}>
              📎 {ev}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
          <button style={S.btn("dark")} type="button" onClick={onBack}>
            ← Atrás
          </button>
          <button style={S.btn("primary")} type="button" onClick={onConfirm}>
            Confirmar →
          </button>
        </div>
      </div>
    );
  }
);

export function NewCaseView({ hideBack = false }: { hideBack?: boolean }) {
  const {
    currentUser,
    newCase,
    setNewCase,
    evalForm,
    setEvalForm,
    bypassForm,
    setBypassForm,
    step,
    setStep,
    localCatalog,
    setView,
    setNotification,
    busyAction,
    setBusyAction,
  } = useAppStore();

  const detailStepRef = useRef<DetailStepContentRef>(null);
  const [lnc, setLnc] = useState<LncDraft>(() => {
    // FIX: inicializar region con valor por defecto para que la validación no falle
    const base = newCase ? { ...newCase } : {};
    if (!base.region) base.region = "TRP";
    return base;
  });
  const [le, setLe] = useState(evalForm);
  const [lb, setLb] = useState(bypassForm);
  // FASE 1: confianza del dato
  const [dataConfidence, setDataConfidence] = useState<DataConfidence>("UNKNOWN");
  const er = calcCriticality(le);
  const maxVar = Math.max(...Object.values(le));
  const rData = regionsMap[lnc.region || "TRP"];
  const availableLocals = useMemo(
    () => getActiveLocals(localCatalog, lnc.region || "TRP", lnc.commune || ""),
    [lnc.region, lnc.commune, localCatalog]
  );

  // R-4: scope de local/comuna delegado al hook canonico
  const {
    fixedLocalRole,
    assignedLocalIdEffective,
    assignedLocal,
    assignedCommuneEffective,
  } = useAssignedLocalScope();

  const { submitCase } = useCases({ assignedCommuneEffective, assignedLocalIdEffective });

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

  function nowLocalInput() {
    return nowLocalDatetimeInput();
  }

  const isFixedLocal = Boolean(assignedLocalIdEffective);
  const isFixedCommune = Boolean(assignedCommuneEffective);
  const lockCommune = isFixedCommune;
  const lockLocal = isFixedLocal;

  useEffect(() => {
    if (!lnc.origin?.detectedAt) {
      setLnc((p) => ({ ...p, origin: { ...(p.origin || {}), detectedAt: nowLocalInput() } }));
    }
    if (lockCommune && lnc.commune !== assignedCommuneEffective) {
      setLnc((p) => ({ ...p, commune: assignedCommuneEffective, local: "" }));
      return;
    }
    if (lockLocal && lnc.local !== (assignedLocal?.nombre ?? "")) {
      setLnc((p) => ({ ...p, local: assignedLocal?.nombre ?? "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockCommune, lockLocal, assignedCommuneEffective, assignedLocalIdEffective]);

  useEffect(() => {
    if (!lockLocal && availableLocals.length === 1) {
      setLnc((prev) => ({ ...prev, local: availableLocals[0].nombre }));
    }
  }, [availableLocals, lockLocal]);

  const varDefs = [
    { key: "continuidad", label: "1. Continuidad del acto", desc: "0=Sin impacto · 1=Parcial · 2=Mesa suspendida · 3=Local sin funcionar" },
    { key: "integridad", label: "2. Integridad jurídica", desc: "0=Sin riesgo · 1=Dudas · 2=Posible nulidad · 3=Nulidad evidente" },
    { key: "seguridad", label: "3. Seguridad / orden público", desc: "0=Normal · 1=Tensión · 2=Incidente activo · 3=Violencia/amenaza grave" },
    { key: "exposicion", label: "4. Exposición pública", desc: "0=Interna · 1=Testigos · 2=Medios/redes · 3=Atención nacional" },
    { key: "capacidadLocal", label: "5. Capacidad local", desc: "0=Resuelven · 1=Orientación · 2=Apoyo externo · 3=Sin capacidad" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {!hideBack && (
          <button style={S.btn("dark")} onClick={() => setView("dashboard")}>
            ← Volver
          </button>
        )}
        <h2 style={{ margin: 0, fontSize: "16px" }}>Nuevo Incidente — Ficha 60s</h2>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {["Identificación", "Confianza", "Evaluación", "Detalles", "Confirmar"].map((st, i) => (
          <div
            key={st}
            style={{
              padding: "4px 10px",
              borderRadius: 4,
              fontSize: "11px",
              fontWeight: 600,
              background:
                step === i + 1
                  ? themeColor("primary")
                  : step > i + 1
                    ? themeColor("greenLight")
                    : themeColor("stepInactive"),
              color:
                step === i + 1
                  ? themeColor("white")
                  : step > i + 1
                    ? themeColor("greenText")
                    : themeColor("textSecondary"),
              border:
                "1px solid " +
                (step === i + 1 ? themeColor("primary") : step > i + 1 ? themeColor("success") : themeColor("border")),
            }}
          >
            {step > i + 1 ? "✓ " : ""}
            {st}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div style={S.card}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 10 }}>
            PASO 1 — IDENTIFICACIÓN
          </div>
          <div style={{ ...S.g2, marginBottom: 8 }}>
            <div>
              <label style={S.lbl}>Región</label>
              <select
                style={S.inp}
                value={lnc.region || "TRP"}
                onChange={(e) => setLnc((p) => ({ ...p, region: e.target.value, commune: "", local: "" }))}
              >
                {Object.entries(regionsMap).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v?.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.lbl}>Comuna *</label>
              <select
                style={S.inp}
                value={lnc.commune || ""}
                disabled={lockCommune}
                onChange={(e) => setLnc((p) => ({ ...p, commune: e.target.value, local: "" }))}
              >
                <option value="">Seleccione...</option>
                {Object.entries(rData?.communes || {}).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={S.lbl}>Local de Votación *</label>
            {!lnc.commune ? (
              <div style={{ ...S.inp, color: themeColor("mutedDark"), cursor: "not-allowed" }}>
                Seleccione una comuna primero
              </div>
            ) : availableLocals.length === 0 ? (
              <div
                style={{
                  ...S.inp,
                  color: themeColor("danger"),
                  cursor: "not-allowed",
                  borderColor: "#ef444444",
                }}
              >
                ⚠️ Sin locales activos — administre el catálogo
              </div>
            ) : (
              <select
                style={{ ...S.inp, borderColor: lnc.local ? "#22c55e44" : "#ef444444" }}
                value={lnc.local || ""}
                disabled={lockLocal || !lnc.commune}
                onChange={(e) => setLnc((p) => ({ ...p, local: e.target.value }))}
              >
                {availableLocals.length > 1 && <option value="">Seleccione local...</option>}
                {availableLocals.map((l) => (
                  <option key={l.idLocal} value={l.nombre}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            )}
            {lnc.local && (
              <div style={{ fontSize: "9px", color: themeColor("purple"), marginTop: 2 }}>
                📸 Se guardará snapshot del local al registrar
              </div>
            )}
          </div>
          <div style={{ ...S.g2, marginBottom: 8 }}>
            <div>
              <label style={S.lbl}>Canal</label>
              <select
                style={S.inp}
                value={lnc.origin?.channel || "Teams"}
                onChange={(e) => setLnc((p) => ({ ...p, origin: { ...p.origin, channel: e.target.value } }))}
              >
                {["Teams", "Teléfono", "WhatsApp", "Correo", "Presencial"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.lbl}>Hora del incidente *</label>
              <input
                style={S.inp}
                type="datetime-local"
                value={(lnc.origin?.detectedAt || "").slice(0, 16)}
                onChange={(e) =>
                  setLnc((p) => ({ ...p, origin: { ...p.origin, detectedAt: e.target.value } }))
                }
              />
              <div style={{ fontSize: "10px", color: themeColor("muted"), marginTop: 2 }}>
                Hora en que ocurrió/detectó. Se permite hasta 5 min por desfase de reloj. La hora de registro se guarda al
                enviar.
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={S.lbl}>Resumen *</label>
            <input
              style={S.inp}
              placeholder="Ej: Urna sellada incorrectamente en mesa 12"
              value={lnc.summary || ""}
              onChange={(e) => setLnc((p) => ({ ...p, summary: e.target.value }))}
            />
          </div>
          {canDo("bypass", currentUser) && (
            <div style={{ ...S.card, background: themeColor("violetBlock"), border: "1px solid #7c3aed44" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} title={UI_TEXT.tooltips.modoUrgente}>
                <input
                  type="checkbox"
                  checked={lb.active}
                  onChange={(e) => setLb((p) => ({ ...p, active: e.target.checked, confirmed: false }))}
                />
                <span style={{ color: themeColor("purpleLight"), fontWeight: 600, fontSize: "12px" }}>
                  ⚡ Activar Modo urgente (Excepción operativa)
                </span>
              </label>
              {lb.active && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", marginBottom: 6 }}>
                    Úselo solo si no es posible seguir el procedimiento normal. Queda registrado como excepción.
                  </div>
                  <label style={S.lbl}>Causal de la excepción *</label>
                  <select
                    style={S.inp}
                    value={lb.cause}
                    onChange={(e) => setLb((p) => ({ ...p, cause: e.target.value as BypassCause }))}
                  >
                    <option value="">Seleccione...</option>
                    <option value="system_down">Sistema institucional no disponible</option>
                    <option value="risk_imminent">Riesgo inminente (seguridad/orden público/continuidad)</option>
                    <option value="critical_level_3">Evaluación crítica máxima (Nivel 3)</option>
                    <option value="other">Otra (requiere explicación detallada)</option>
                  </select>
                  <label style={S.lbl}>Motivo / respaldo *</label>
                  <input
                    style={S.inp}
                    placeholder="Motivo o respaldo de la excepción"
                    value={lb.motivo}
                    onChange={(e) => setLb((p) => ({ ...p, motivo: e.target.value }))}
                  />
                </div>
              )}
            </div>
          )}
          <div style={{ marginTop: 10, textAlign: "right" }}>
            <button
              style={S.btn("primary")}
              onClick={() => {
                const errs = validateCaseSchema({ ...lnc, origin: { ...lnc.origin } }, localCatalog);
                if (errs.length) return notify("⚠️ " + errs[0], "error");
                if (lb.active && !lb.cause) return notify("Seleccione la causal de la excepción", "error");
                if (lb.active && !lb.motivo) return notify("El Modo urgente requiere motivo o respaldo", "error");
                if (lb.active && lb.cause === "other" && lb.motivo.trim().length < 15)
                  return notify("Otra causal requiere explicación detallada (mín. 15 caracteres)", "error");
                setNewCase({ ...lnc } as CaseItem);
                setBypassForm(lb);
                setStep(2);
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={S.card}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 10 }}>
            PASO 2 — CONFIANZA DEL DATO
          </div>
          <div style={{ color: themeColor("textSecondary"), fontSize: "12px", marginBottom: 12 }}>
            ¿Con qué nivel de certeza conoces la información de este incidente?
            Esta clasificación afectará las decisiones de escalamiento.
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {(["VERIFIED", "HIGH", "MEDIUM", "LOW", "UNKNOWN"] as DataConfidence[]).map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setDataConfidence(val)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 6,
                  border: `2px solid ${dataConfidence === val ? DATA_CONFIDENCE_COLORS[val] : "#e5e7eb"}`,
                  background: dataConfidence === val ? DATA_CONFIDENCE_COLORS[val] + "22" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <span style={{
                  width: 12, height: 12, borderRadius: "50%",
                  background: DATA_CONFIDENCE_COLORS[val],
                  flexShrink: 0,
                }} />
                <span style={{ fontWeight: dataConfidence === val ? 700 : 500, fontSize: "13px" }}>
                  {DATA_CONFIDENCE_LABELS[val]}
                </span>
                {val === "LOW" || val === "UNKNOWN" ? (
                  <span style={{ marginLeft: "auto", fontSize: "10px", color: themeColor("warning") }}>
                    ⚠️ Requiere validación antes de decidir
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
            <button style={S.btn("dark")} type="button" onClick={() => setStep(1)}>← Atrás</button>
            <button
              style={S.btn("primary")}
              type="button"
              onClick={() => {
                setNewCase((p) => p ? { ...p, dataConfidence } : p);
                setStep(3);
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={S.card}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 10 }}>
            PASO 3 — FICHA DE EVALUACIÓN (inmutable tras guardar)
          </div>
          {varDefs.map((v) => (
            <div key={v.key} style={{ ...S.card, background: themeColor("bgSurface"), marginBottom: 6 }}>
              <div style={{ fontWeight: 600, marginBottom: 1 }}>{v.label}</div>
              <div style={{ color: themeColor("muted"), fontSize: "10px", marginBottom: 6 }}>{v.desc}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {[0, 1, 2, 3].map((n) => (
                  <button
                    key={n}
                    onClick={() => setLe((p) => ({ ...p, [v.key]: n } as typeof evalForm))}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 4,
                      border: "2px solid",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "13px",
                      background:
                        (le as Record<string, number>)[v.key] === n
                          ? [themeColor("success"), themeColor("warningAlt"), themeColor("warning"), themeColor("danger")][n]
                          : "transparent",
                      borderColor: ["#22c55e44", "#eab30844", "#f9731644", "#ef444444"][n],
                      color:
                        (le as Record<string, number>)[v.key] === n
                          ? themeColor("white")
                          : [themeColor("success"), themeColor("warningAlt"), themeColor("warning"), themeColor("danger")][n],
                    }}
                  >
                    {n}
                  </button>
                ))}
                {(le as Record<string, number>)[v.key] === 3 && (
                  <span style={{ color: themeColor("danger"), fontWeight: 700, fontSize: "11px" }}>⚠️ ESCALAR</span>
                )}
              </div>
            </div>
          ))}
          {lb.active && maxVar < 3 && lb.cause !== "system_down" && lb.cause !== "critical_level_3" && (
            <div style={{ ...S.card, background: themeColor("redBlock"), border: "2px solid #ef4444", marginTop: 8 }}>
              <div style={{ color: themeColor("danger"), fontWeight: 700, marginBottom: 6 }}>
                ⚠️ {UI_TEXT.misc.excepcionSinFundamentoObjetivo}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={lb.confirmed || false}
                  onChange={(e) => setLb((p) => ({ ...p, confirmed: e.target.checked }))}
                />
                <span style={{ color: themeColor("danger"), fontSize: "12px", fontWeight: 600 }}>
                  {UI_TEXT.misc.confirmarExcepcionOperativa}
                </span>
              </label>
            </div>
          )}
          <div
            style={{
              ...S.card,
              background: themeColor("bgSurface"),
              border: `2px solid ${critColor(er.criticality as Criticality)}`,
              marginTop: 8,
            }}
          >
            <Badge style={S.badge(critColor(er.criticality as Criticality))} size="sm">
              CRITICIDAD: {er.criticality}
            </Badge>
            <span style={{ marginLeft: 8, color: themeColor("muted"), fontSize: "11px" }}>
              Prioridad sugerida: {er.score}/15
            </span>
            <div style={{ marginTop: 6, color: themeColor("mutedAlt"), fontSize: "12px" }}>{er.recommendation}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <button style={S.btn("dark")} onClick={() => setStep(1)}>
              ← Atrás
            </button>
            <button
              style={S.btn("primary")}
              onClick={() => {
                if (lb.active && maxVar < 3 && lb.cause !== "system_down" && lb.cause !== "critical_level_3" && !lb.confirmed)
                  return notify("Confirmar Modo urgente atípico", "error");
                setEvalForm(le);
                setBypassForm(lb);
                setStep(4);
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <DetailStepContent
          ref={detailStepRef}
          initialDetail={newCase?.detail ?? ""}
          newCase={newCase}
          setNewCase={setNewCase}
          onConfirm={() => {
            const d = detailStepRef.current?.getDetail?.() ?? newCase?.detail ?? "";
            setNewCase((p) => (p ? { ...p, detail: d } : p));
            setStep(5);
          }}
          onBack={() => setStep(3)}
        />
      )}

      {step === 5 && (
        <div style={S.card}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 10 }}>
            PASO 4 — CONFIRMAR Y REGISTRAR
          </div>
          <div style={{ ...S.g2, marginBottom: 8 }}>
            <div>
              <span style={{ color: themeColor("muted") }}>Región:</span> {regionsMap[newCase?.region ?? ""]?.name}
            </div>
            <div>
              <span style={{ color: themeColor("muted") }}>Comuna:</span>{" "}
              {regionsMap[newCase?.region ?? ""]?.communes?.[newCase?.commune ?? ""]?.name || newCase?.commune}
            </div>
            <div>
              <span style={{ color: themeColor("muted") }}>Canal:</span> {newCase?.origin?.channel}
            </div>
            <div>
              <span style={{ color: themeColor("muted") }}>Criticidad:</span>{" "}
              <Badge style={S.badge(critColor(calcCriticality(evalForm).criticality as Criticality))} size="sm">
                {calcCriticality(evalForm).criticality}
              </Badge>
            </div>
          </div>
          <div style={{ marginBottom: 8, padding: "6px 10px", background: themeColor("infoBg"), border: "1px solid #93c5fd", borderRadius: 4 }}>
            <span style={{ fontSize: "11px", color: themeColor("infoIcon") }}>🏫 Local: </span>
            <span style={{ fontWeight: 700 }}>{newCase?.local}</span>
            <div style={{ fontSize: "9px", color: themeColor("purple"), marginTop: 2 }}>📸 Se registrará snapshot del local</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: themeColor("muted") }}>Resumen:</span> {newCase?.summary}
          </div>
          <div style={{ ...S.card, background: themeColor("bgSurface"), marginBottom: 8, fontSize: "11px", color: themeColor("textSecondary") }}>
            Estado inicial:{" "}
            <strong style={{ color: themeColor("purpleLight") }}>
              {bypassForm.active ? "En gestión (" + UI_TEXT.states.modoUrgenteActive + ")" : "Nuevo → requiere recepción"}
            </strong>
          </div>
          <div style={{ marginBottom: 8, padding: "6px 10px", background: DATA_CONFIDENCE_COLORS[dataConfidence] + "15", border: `1px solid ${DATA_CONFIDENCE_COLORS[dataConfidence]}44`, borderRadius: 4 }}>
            <span style={{ fontSize: "11px", color: themeColor("textSecondary") }}>Confianza del dato: </span>
            <span style={{ fontWeight: 700, color: DATA_CONFIDENCE_COLORS[dataConfidence], fontSize: "12px" }}>
              {DATA_CONFIDENCE_LABELS[dataConfidence]}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <button style={S.btn("dark")} onClick={() => setStep(4)}>
              ← Atrás
            </button>
            <button
              disabled={!!busyAction["submit_case"]}
              style={{ ...S.btn("success"), padding: "8px 20px" }}
              onClick={() => withBusy("submit_case", () => void submitCase())}
            >
              ✓ Registrar Incidente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
