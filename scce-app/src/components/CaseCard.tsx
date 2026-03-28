/**
 * components/CaseCard.tsx
 * Tarjeta de caso para Dashboard y vistas de lista.
 * Extraída de App.tsx — R-4 refactor 2026-03-27.
 *
 * Lee del store directamente. Sin props de estado.
 */
import React from "react";
import type { CaseItem, CaseStatus } from "../domain/types";
import { critColor, statusColor, normalizeStatus } from "../domain/caseUtils";
import { isSlaVencido } from "../domain/caseSla";
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

// ── Estilos compartidos (subset de S de App.tsx) ───────────────────────────
const badge = (color: string) => ({
  background: color + "22",
  color,
  border: "1px solid " + color + "44",
  borderRadius: "3px",
  padding: "2px 6px",
  fontSize: "11px",
  fontWeight: 600,
});
const btnPrimary = {
  background: themeColor("primary"),
  color: themeColor("white"),
  border: "none",
  padding: "6px 12px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "12px",
  fontWeight: 500,
} as React.CSSProperties;
const card = {
  background: themeColor("bgSurface"),
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
  padding: "12px",
} as React.CSSProperties;

// ── SlaBadge ───────────────────────────────────────────────────────────────
export function SlaBadge({ c }: { c: CaseItem }) {
  return isSlaVencido(c) ? (
    <Badge style={{ ...badge(themeColor("danger")) }} size="xs">
      SLA VENCIDO
    </Badge>
  ) : null;
}

// ── RecBadge ───────────────────────────────────────────────────────────────
export function RecBadge({ c, variant = "FULL" }: { c: CaseItem; variant?: "FULL" | "OP" }) {
  const rec = getRecommendation(c, variant);
  const showTip = variant === "FULL";

  const badgeEl = (
    <Badge
      style={{ ...badge(recColor(rec.level as RecLevel)), cursor: showTip ? "help" : "default" }}
      size="xs"
    >
      {rec.icon} {rec.label}
    </Badge>
  );

  if (!showTip) return badgeEl;

  return (
    <Tooltip
      placement="bottom-start"
      maxWidth={280}
      panelStyle={{
        background: themeColor("bgSurface"),
        color: themeColor("textPrimary"),
        border: "1px solid #e5e7eb",
      }}
      content={
        <div>
          <div style={{ fontWeight: 800, marginBottom: 4, color: themeColor("white") }}>
            {rec.text}
          </div>
          <div style={{ color: themeColor("mutedAlt") }}>{rec.reason}</div>
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
      maxWidth={300}
      panelStyle={{
        background: themeColor("orangeBlock"),
        color: themeColor("textPrimary"),
        border: "1px solid #f9731644",
      }}
      content={
        <div>
          <div style={{ fontWeight: 800, marginBottom: 4, color: themeColor("warning") }}>
            Divergencia de catalogo
          </div>
          <div style={{ color: themeColor("mutedAlt") }}>{div.msg}</div>
          <div style={{ color: themeColor("muted"), marginTop: 4, fontSize: "10px" }}>
            El caso es valido. Revisar estado operacional del local.
          </div>
        </div>
      }
    >
      <Badge style={{ ...badge(themeColor("warning")), cursor: "help" }} size="xs">
        CAT
      </Badge>
    </Tooltip>
  );
}

/** Overlay de solo lectura cuando el caso está cerrado (detalle en App). */
export function ClosedOverlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(15,17,23,.82)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "6px",
      }}
    >
      <div
        style={{
          background: themeColor("bgSurface"),
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          padding: "14px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ fontWeight: 700, color: themeColor("mutedAlt") }}>🔒 REGISTRO CERRADO</div>
        <div style={{ fontSize: "11px", color: themeColor("mutedDark"), marginTop: 3 }}>Solo lectura</div>
      </div>
    </div>
  );
}

// ── CaseCard ───────────────────────────────────────────────────────────────
export function CaseCard({ c, onClick }: { c: CaseItem; onClick: () => void }) {
  const { localCatalog, currentUser } = useAppStore();
  const { recepcionar } = useCases({ assignedCommuneEffective: "", assignedLocalIdEffective: null });
  const div = checkLocalDivergence(c, localCatalog);

  return (
    <div
      style={{
        ...card,
        cursor: "pointer",
        borderLeft: `3px solid ${critColor(c.criticality)}`,
        marginBottom: 6,
        position: "relative",
      }}
      onClick={onClick}
    >
      {div && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 3,
            bottom: 0,
            background: themeColor("warning"),
            borderRadius: "0 6px 6px 0",
          }}
        />
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 3,
          flexWrap: "wrap",
          gap: 4,
        }}
      >
        <span style={{ fontSize: "11px", color: themeColor("muted"), fontFamily: "monospace" }}>
          {c.id}
        </span>
        <span style={{ opacity: 0.8, marginLeft: 8, fontSize: "11px", color: themeColor("muted") }}>
          Region: {c.region ?? (c as { regionCode?: string }).regionCode ?? "—"}
        </span>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
          {c.bypassFlagged && !c.bypassValidated && (
            <Badge style={{ ...badge(themeColor("danger")), fontSize: "9px" }} size="xs">
              {UI_TEXT.states.modoUrgente}
            </Badge>
          )}
          {c.isSim && (
            <Badge style={{ ...badge(themeColor("purple")), fontSize: "9px" }} size="xs">
              SIM
            </Badge>
          )}
          <SlaBadge c={c} />
          <RecBadge c={c} />
          <DivBadge c={c} />
          <Badge style={badge(critColor(c.criticality))} size="sm">
            {c.criticality}
          </Badge>
          <Badge style={badge(statusColor(normalizeStatus(c.status) as CaseStatus))} size="sm">
            {normalizeStatus(c.status) === "Otros / Desconocido"
              ? String(c.status)
              : normalizeStatus(c.status)}
          </Badge>
        </div>
      </div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{c.summary}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
        <span
          style={{
            fontSize: "10px",
            background: themeColor("infoBg"),
            color: themeColor("infoText"),
            border: "1px solid #93c5fd",
            borderRadius: "3px",
            padding: "1px 7px",
            fontWeight: 600,
          }}
        >
          {c.local || "—"}
        </span>
        <span style={{ fontSize: "10px", color: themeColor("mutedDark") }}>
          {(CONFIG.regions as Record<string, { communes?: Record<string, { name?: string }> }>)[
            c.region
          ]?.communes?.[c.commune]?.name || c.commune}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          color: themeColor("muted"),
          fontSize: "11px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span>{fmtDate(c.createdAt)}</span>
        {(() => {
          const comp = c.completeness ?? 0;
          return (
            <span
              style={{
                color:
                  comp >= 80
                    ? themeColor("success")
                    : comp >= 50
                      ? themeColor("warningAlt")
                      : themeColor("danger"),
              }}
            >
              {comp}%
            </span>
          );
        })()}
        {canDo("recepcionar", currentUser, c) && c.status === "Nuevo" && !c.bypass && (
          <button
            style={{ ...btnPrimary, fontSize: "10px", padding: "1px 8px" }}
            onClick={(e) => {
              e.stopPropagation();
              recepcionar(c.id);
            }}
          >
            Recepcionar
          </button>
        )}
      </div>
    </div>
  );
}
