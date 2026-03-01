// src/domain/recommendation.ts
import { getElapsed } from "./date";
import { SLA_MINUTES, type SlaLevel } from "./caseSla";
import { UI_TEXT } from "../config/uiTextStandard";

export type RecLevel = "low" | "medium" | "high";
export type RecVariant = "FULL" | "OP";

type Rec = {
  level: RecLevel;
  label: string;
  icon: string;
  text: string;
  reason: string;
};

function resolveReason(
  value: string | ((el: number, sla: number) => string),
  el: number,
  sla: number
): string {
  return typeof value === "function" ? value(el, sla) : value;
}

export function getRecommendation(
  c: { status?: string; criticality?: string; createdAt?: string },
  variant: RecVariant = "FULL"
): Rec {
  const el = getElapsed({ createdAt: c.createdAt });
  const slaKey: SlaLevel = (c?.criticality as SlaLevel) ?? "MEDIA";
  const sla = (SLA_MINUTES as Record<SlaLevel, number>)[slaKey] ?? 120;
  const br = el > sla;
  const dict = UI_TEXT.recommendation[variant];

  if (c.status === "Cerrado") {
    return {
      level: "low",
      label: "Cerrado",
      icon: "✅",
      text: dict.closed.text,
      reason: resolveReason(dict.closed.reason as string | ((el: number, sla: number) => string), el, sla),
    };
  }

  if (c.criticality === "CRITICA" && br) {
    return {
      level: "high",
      label: "Escalar",
      icon: "🚨",
      text: dict.criticalOverdue.text,
      reason: resolveReason(dict.criticalOverdue.reason as string | ((el: number, sla: number) => string), el, sla),
    };
  }

  if (c.criticality === "CRITICA") {
    return {
      level: "medium",
      label: "Acción",
      icon: "⚠️",
      text: dict.criticalInTime.text,
      reason: resolveReason(dict.criticalInTime.reason as string | ((el: number, sla: number) => string), el, sla),
    };
  }

  if (br) {
    return {
      level: "medium",
      label: "Acción",
      icon: "⏱️",
      text: dict.overdue.text,
      reason: resolveReason(dict.overdue.reason as string | ((el: number, sla: number) => string), el, sla),
    };
  }

  return {
    level: "low",
    label: "Monitoreo",
    icon: "👁️",
    text: dict.ok.text,
    reason: resolveReason(dict.ok.reason as string | ((el: number, sla: number) => string), el, sla),
  };
}
