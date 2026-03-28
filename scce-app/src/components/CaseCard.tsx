/**
 * components/CaseCard.tsx
 * Tarjeta de incidente — diseño v2 (responsive, sin tecnicismos).
 */
import React from "react";
import type { CaseItem, CaseStatus } from "../domain/types";
import { critColor, statusColor, normalizeStatus } from "../domain/caseUtils";
import { getSlaTrafficLight, type OperationMode } from "../domain/caseSla";
import { getRecommendation } from "../domain/recommendation";
import { recColor } from "../domain/theme";
import { checkLocalDivergence } from "../domain/localDivergence";
import { themeColor } from "../theme";
import { canDo } from "../domain/policyEngine";
import { fmtDate } from "../domain/date";
import { Badge } from "../ui/Badge";
import { Tooltip } from "../ui/Tooltip";
import { UI_TEXT } from "../config/uiTextStandard";
import { CONFIG_REGIONS } from "../domain/catalog";
import { useAppStore } from "../store/useAppStore";
import { useCases } from "../hooks/useCases";

type RecLevel = "high" | "medium" | "low";
const CONFIG = { regions: CONFIG_REGIONS };

// ── Estilos base con variables CSS ─────────────────────────────────────────
const bdg = (color: string) => ({
  background: color + "18",
  color,
  border: "1px solid " + color + "44",
  borderRadius: "5px",
  padding: "2px 8px",
  fontSize: "11px",
  fontWeight: 600,
  whiteSpace: "nowrap" as const,
});

const tooltipPanel = {
  background: "var(--bg-sidebar)",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  padding: "10px 14px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
  fontSize: "12px",
  maxWidth: 260,
};

// ── Etiquetas de criticidad en español ─────────────────────────────────────
const CRIT_LABEL: Record<string, string> = {
  CRITICA: "Crítica",
  ALTA:    "Alta",
  MEDIA:   "Media",
  BAJA:    "Baja",
};

// ── SlaBadge ───────────────────────────────────────────────────────────────
export function SlaBadge({ c, mode = "NORMAL" }: { c: CaseItem; mode?: OperationMode }) {
  const tl = getSlaTrafficLight(c, mode);
  if (!tl.label) return null;

  const colorMap = {
    green:  "var(--success)",
    yellow: "var(--warning)",
    red:    "var(--danger)",
  };
  const color = colorMap[tl.color];

  const tooltipText =
    tl.vencido
      ? "Tiempo de respuesta superado. Este incidente requiere atención inmediata."
      : tl.color === "yellow"
      ? `Tiempo de respuesta al ${tl.percent}%. Actuar pronto.`
      : `Dentro del tiempo de respuesta (${tl.percent}%).`;

  return (
    <Tooltip content={<span style={{ fontSize: 12 }}>{tooltipText}</span>} panelStyle={tooltipPanel}>
      <Badge style={{ ...bdg(color), cursor: "help" }} size="xs">
        {tl.color === "green" ? "🟢" : tl.color === "yellow" ? "🟡" : "🔴"}{" "}
        {tl.vencido ? "Tiempo vencido" : tl.label}
      </Badge>
    </Tooltip>
  );
}

// ── RecBadge ───────────────────────────────────────────────────────────────
export function RecBadge({ c, variant = "FULL" }: { c: CaseItem; variant?: "FULL" | "OP" }) {
  const rec = getRecommendation(c, variant);
  const showTip = variant === "FULL";

  const badgeEl = (
    <Badge
      style={{ ...bdg(recColor(rec.level as RecLevel)), cursor: showTip ? "help" : "default" }}
      size="xs"
    >
      {rec.icon} {rec.label}
    </Badge>
  );

  if (!showTip) return badgeEl;

  return (
    <Tooltip
      placement="bottom-start"
      panelStyle={tooltipPanel}
      content={
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{rec.text}</div>
          <div style={{ opacity: 0.8, fontSize: 11 }}>{rec.reason}</div>
        </div>
      }
    >
      {badgeEl}
    </Tooltip>
  );
}

// ── DivBadge ───────────────────────────────────────────────────────────────
export function DivBadge({ c }: { c: CaseItem }) {
  const { localCatalog } = useAppStore();
  const div = checkLocalDivergence(c, localCatalog);
  if (!div) return null;

  return (
    <Tooltip
      placement="bottom-start"
      panelStyle={{ ...tooltipPanel, background: "#78350f" }}
      content={
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Local modificado en catálogo</div>
          <div style={{ opacity: 0.85, fontSize: 11 }}>{div.msg}</div>
          <div style={{ opacity: 0.65, marginTop: 4, fontSize: 10 }}>
            El incidente sigue siendo válido. Verifique el estado del local.
          </div>
        </div>
      }
    >
      <Badge
        style={{ ...bdg("var(--warning)"), cursor: "help" }}
        size="xs"
      >
        ⚠️ Local modificado
      </Badge>
    </Tooltip>
  );
}

// ── ClosedOverlay ──────────────────────────────────────────────────────────
export function ClosedOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(15,17,23,0.45)",
        zIndex: 10,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        borderRadius: "8px",
        padding: "10px 12px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "5px 12px",
          opacity: 0.92,
        }}
      >
        <div style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: "11px" }}>
          🔒 Registro cerrado · Solo lectura
        </div>
      </div>
    </div>
  );
}

// ── Helpers de nombre ─────────────────────────────────────────────────────
function regionNombre(regionCode: string): string {
  if (!regionCode) return "—";
  return (CONFIG.regions as Record<string, { name?: string }>)[regionCode]?.name || regionCode;
}
function comunaNombre(regionCode: string, communeCode: string): string {
  if (!communeCode) return "—";
  return (
    (CONFIG.regions as Record<string, { communes?: Record<string, { name?: string }> }>)[regionCode]
      ?.communes?.[communeCode]?.name || communeCode
  );
}

// ── CaseCard ───────────────────────────────────────────────────────────────
export function CaseCard({ c, onClick }: { c: CaseItem; onClick: () => void }) {
  const { localCatalog, currentUser, operationMode } = useAppStore();
  const { recepcionar } = useCases({ assignedCommuneEffective: "", assignedLocalIdEffective: null });
  const div = checkLocalDivergence(c, localCatalog);

  // Soporte para casos que usan regionCode en lugar de region
  const regionCode = (c as { regionCode?: string }).regionCode || c.region || "";
  const regNombre  = regionNombre(regionCode);
  const comNombre  = comunaNombre(regionCode, c.commune);
  // CRIT_LABEL normaliza valores conocidos; valores desconocidos se muestran tal cual
  const critLabel  = CRIT_LABEL[c.criticality] ?? c.criticality ?? "Sin clasificar";
  const statusLabel =
    normalizeStatus(c.status) === "Otros / Desconocido"
      ? String(c.status)
      : normalizeStatus(c.status);

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${critColor(c.criticality)}`,
        borderRadius: "8px",
        padding: "12px 14px",
        marginBottom: 6,
        cursor: "pointer",
        position: "relative",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        transition: "box-shadow 0.15s",
      }}
      onClick={onClick}
    >
      {/* Indicador de local modificado */}
      {div && (
        <div style={{
          position: "absolute", top: 0, right: 0, width: 3,
          bottom: 0, background: "var(--warning)", borderRadius: "0 8px 8px 0",
        }} />
      )}

      {/* FILA 1: Título del incidente */}
      <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 8 }}>
        {c.summary}
      </div>

      {/* TABLA DE INFORMACIÓN */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", marginBottom: 8 }}>
        <tbody>
          {/* Fila: Ubicación */}
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ color: "var(--text-muted)", fontWeight: 600, padding: "4px 8px 4px 0", whiteSpace: "nowrap" as const, width: 90 }}>Región</td>
            <td style={{ color: "var(--text-secondary)", padding: "4px 8px 4px 0" }}>{regNombre}</td>
            <td style={{ color: "var(--text-muted)", fontWeight: 600, padding: "4px 8px 4px 0", whiteSpace: "nowrap" as const, width: 90 }}>Comuna</td>
            <td style={{ color: "var(--text-secondary)", padding: "4px 8px 4px 0" }}>{comNombre}</td>
          </tr>
          {/* Fila: Local + Canal */}
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ color: "var(--text-muted)", fontWeight: 600, padding: "4px 8px 4px 0", whiteSpace: "nowrap" as const }}>Local</td>
            <td style={{ padding: "4px 8px 4px 0" }}>
              {c.local
                ? <span style={{ fontWeight: 600, background: "var(--primary-light)", color: "var(--primary)", borderRadius: 4, padding: "1px 7px" }}>{c.local}</span>
                : <span style={{ color: "var(--text-muted)" }}>—</span>}
            </td>
            <td style={{ color: "var(--text-muted)", fontWeight: 600, padding: "4px 8px 4px 0", whiteSpace: "nowrap" as const }}>Canal</td>
            <td style={{ color: "var(--text-secondary)", padding: "4px 8px 4px 0" }}>
              {c.reportChannel && c.reportChannel !== "SCCE"
                ? <>{c.reportChannel.toLowerCase()}{c.reportedBy ? <span style={{ color: "var(--text-muted)" }}> — {c.reportedBy}</span> : null}</>
                : "SCCE (directo)"}
            </td>
          </tr>
          {/* Fila: Prioridad + Estado */}
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <td style={{ color: "var(--text-muted)", fontWeight: 600, padding: "4px 8px 4px 0", whiteSpace: "nowrap" as const }}>Prioridad</td>
            <td style={{ padding: "4px 8px 4px 0" }}>
              <Tooltip panelStyle={tooltipPanel} content={
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{critLabel}</div>
                  <div style={{ opacity: 0.8, fontSize: 11 }}>
                    {c.criticality === "CRITICA" ? "Requiere atención inmediata y escalamiento." :
                     c.criticality === "ALTA"    ? "Requiere acción urgente del DR." :
                     c.criticality === "MEDIA"   ? "Gestión regular con seguimiento." :
                                                   "Puede gestionarse en flujo normal."}
                  </div>
                </div>
              }>
                <Badge style={{ ...bdg(critColor(c.criticality)), cursor: "help" }} size="sm">{critLabel}</Badge>
              </Tooltip>
            </td>
            <td style={{ color: "var(--text-muted)", fontWeight: 600, padding: "4px 8px 4px 0", whiteSpace: "nowrap" as const }}>Estado</td>
            <td style={{ padding: "4px 8px 4px 0" }}>
              <Tooltip panelStyle={tooltipPanel} content={
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>{statusLabel}</div>
                  <div style={{ opacity: 0.8, fontSize: 11 }}>
                    {c.status === "Nuevo"               ? "Ingresado, pendiente de recepción." :
                     c.status === "Recepcionado por DR" ? "Recibido y validado por la DR." :
                     c.status === "En gestión"          ? "En proceso de resolución activa." :
                     c.status === "Escalado"            ? "Derivado a nivel superior." :
                     c.status === "Mitigado"            ? "Impacto controlado, en seguimiento." :
                     c.status === "Resuelto"            ? "Resuelto, pendiente de cierre." :
                     c.status === "Cerrado"             ? "Cerrado y archivado." : ""}
                  </div>
                </div>
              }>
                <Badge style={{ ...bdg(statusColor(normalizeStatus(c.status) as CaseStatus)), cursor: "help" }} size="sm">{statusLabel}</Badge>
              </Tooltip>
            </td>
          </tr>
          {/* Fila: SLA + Completitud */}
          <tr style={{ borderBottom: c.impactScope || c.decisionStage ? "1px solid var(--border)" : "none" }}>
            <td style={{ color: "var(--text-muted)", fontWeight: 600, padding: "4px 8px 4px 0", whiteSpace: "nowrap" as const }}>SLA</td>
            <td style={{ padding: "4px 8px 4px 0" }}><SlaBadge c={c} mode={operationMode} /></td>
            <td style={{ color: "var(--text-muted)", fontWeight: 600, padding: "4px 8px 4px 0", whiteSpace: "nowrap" as const }}>Completitud</td>
            <td style={{ padding: "4px 8px 4px 0" }}>
              {(() => {
                const comp = c.completeness ?? 0;
                const col = comp >= 80 ? "var(--success)" : comp >= 50 ? "var(--warning)" : "var(--danger)";
                return (
                  <Tooltip panelStyle={tooltipPanel} content={<span>{comp < 50 ? "Falta información importante." : comp < 80 ? "Información parcial." : "Registro completo."}</span>}>
                    <span style={{ color: col, fontWeight: 600, cursor: "help" }}>{comp}%</span>
                  </Tooltip>
                );
              })()}
            </td>
          </tr>
          {/* Fila: Alcance + Etapa (si existen) */}
          {(c.impactScope || (c.decisionStage && c.decisionStage !== "DETECTED")) && (
            <tr>
              <td style={{ color: "var(--text-muted)", fontWeight: 600, padding: "4px 8px 4px 0", whiteSpace: "nowrap" as const }}>Alcance</td>
              <td style={{ padding: "4px 8px 4px 0" }}>
                {c.impactScope ? (
                  <Tooltip panelStyle={tooltipPanel} content={<span>Nivel de impacto del incidente.</span>}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, cursor: "help",
                      color: c.impactScope === "NACIONAL" ? "var(--danger)" : c.impactScope === "REGIONAL" ? "var(--warning)" : c.impactScope === "COMUNAL" ? "var(--info)" : "var(--success)",
                    }}>{c.impactScope}</span>
                  </Tooltip>
                ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
              </td>
              <td style={{ color: "var(--text-muted)", fontWeight: 600, padding: "4px 8px 4px 0", whiteSpace: "nowrap" as const }}>Etapa C2</td>
              <td style={{ color: "var(--text-secondary)", padding: "4px 8px 4px 0" }}>
                {c.decisionStage && c.decisionStage !== "DETECTED" ? c.decisionStage : "—"}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* PIE: badges secundarios + fecha + acciones */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {c.bypassFlagged && !c.bypassValidated && (
          <Tooltip panelStyle={tooltipPanel} content={<span>Excepción operativa pendiente de validación por el DR.</span>}>
            <Badge style={{ ...bdg("var(--danger)"), fontSize: "10px", cursor: "help" }} size="xs">⚡ Excepción sin validar</Badge>
          </Tooltip>
        )}
        {c.isSim && <Badge style={{ ...bdg("#6366f1"), fontSize: "10px" } as React.CSSProperties} size="xs">Simulación</Badge>}
        <RecBadge c={c} />
        <DivBadge c={c} />
        <span style={{ fontSize: "10px", color: "var(--text-muted)", marginLeft: 2 }}>
          Registrado: {fmtDate(c.createdAt)}
        </span>
        {canDo("recepcionar", currentUser, c) && c.status === "Nuevo" && !c.bypass && (
          <button
            style={{
              background: "var(--primary)", color: "#fff", border: "none",
              padding: "4px 14px", borderRadius: "5px", cursor: "pointer",
              fontSize: "11px", fontWeight: 600, marginLeft: "auto",
            }}
            onClick={(e) => { e.stopPropagation(); recepcionar(c.id); }}
          >
            Recepcionar
          </button>
        )}
      </div>
    </div>
  );
}
