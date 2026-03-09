/**
 * Bloque de progreso del incidente (siguiente paso recomendado).
 * Vista presentacional; dependencias inyectadas vía imports de dominio/config/theme.
 */
import React from "react";
import type { CaseItem } from "../../domain/types";
import { getCaseProgress } from "../../domain/caseProgress";
import { themeColor } from "../../theme";
import { UI_TEXT_GOVERNANCE } from "../../config/uiTextGovernance";

const cardStyle = (): React.CSSProperties => ({
  background: themeColor("bgSurface"),
  border: `1px solid ${themeColor("border")}`,
  borderRadius: 6,
  padding: 12,
  marginBottom: 10,
  backgroundClip: "padding-box",
});

export interface CaseProgressSectionProps {
  c: CaseItem;
}

export function CaseProgressSection({ c }: Readonly<CaseProgressSectionProps>) {
  const progress = getCaseProgress(c);
  const currentStepIndex = progress.steps.findIndex((s) => s.state !== "completed");
  const G = UI_TEXT_GOVERNANCE;
  const R = G.recommendationReasons;

  const stepIcon = (state: "completed" | "pending" | "blocked", isCurrent: boolean) => {
    if (state === "completed") return <span style={{ color: themeColor("success"), fontWeight: 700 }}>✓</span>;
    if (isCurrent) return <span style={{ color: themeColor("primary"), fontWeight: 700 }}>→</span>;
    return <span style={{ color: themeColor("muted"), fontSize: "12px" }}>○</span>;
  };

  const reasonByStep: Record<string, string | null> = {
    "Registrar acción": R.missingAction,
    "Marcar como resuelto": R.missingValidation,
    "Validar operación": R.missingValidation,
    "Registrar acción por fallo de validación": R.missingValidation,
    "Nueva validación operativa (OK u Observaciones)": R.missingValidation,
    "Ingresar motivo de cierre": R.missingCloseReason,
    "Cerrar caso": G.recommendationMessages.CLOSE_CASE,
  };
  const reason = reasonByStep[progress.nextStepRecommended] ?? null;

  return (
    <div style={{ ...cardStyle(), background: themeColor("mutedBg") }}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: themeColor("textSecondary"), textTransform: "uppercase", marginBottom: 8 }}>
        {G.sections.incidentProgress}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "center", marginBottom: 8 }}>
        {progress.steps.map((s, idx) => {
          const isCurrent = currentStepIndex >= 0 && idx === currentStepIndex;
          let stepColor = themeColor("muted");
          if (s.state === "completed") stepColor = themeColor("success");
          else if (isCurrent) stepColor = themeColor("primary");
          return (
            <span
              key={s.label}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "12px", fontWeight: isCurrent ? 600 : 400, color: stepColor }}
            >
              {stepIcon(s.state, isCurrent)} {s.label}
            </span>
          );
        })}
      </div>
      <div
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: themeColor("primary"),
          background: themeColor("infoBg"),
          borderLeft: `4px solid ${themeColor("primary")}`,
          padding: "8px 10px",
          borderRadius: 4,
        }}
      >
        {G.sections.recommendation}: {progress.nextStepRecommended}
      </div>
      {reason != null && (
        <div style={{ fontSize: "12px", color: themeColor("mutedAlt"), marginTop: 6 }}>
          {G.sections.recommendationReason}: {reason}
        </div>
      )}
    </div>
  );
}
