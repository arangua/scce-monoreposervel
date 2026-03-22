// src/domain/recommendation.ts
import { getElapsed } from "./date";
import { normalizeSlaLevel, SLA_MINUTES } from "./caseSla";

export type RecLevel = "low" | "medium" | "high";

export type Recommendation = {
  level: RecLevel;
  label: string;
  icon: string;
  text: string;
  reason: string;
};

export function getRecommendation(
  c: {
    status?: string;
    criticality?: string;
    createdAt?: string;
  },
): Recommendation {
  const el = getElapsed({ createdAt: c.createdAt });
  const slaKey = normalizeSlaLevel(c.criticality);
  const sla = SLA_MINUTES[slaKey] ?? 120;
  const br = el > sla;

  if (c.status === "Cerrado")
    return {
      level: "low",
      label: "Cerrado",
      icon: "✅",
      text: "Sin acciones",
      reason: "Estado Cerrado.",
    };

  if (c.criticality === "CRITICA" && br)
    return {
      level: "high",
      label: "Escalar",
      icon: "🚨",
      text: "Escalar a Nivel Central",
      reason: `CRÍTICA+SLA vencido (${el}>${sla} min).`,
    };

  if (c.criticality === "CRITICA")
    return {
      level: "medium",
      label: "Acción",
      icon: "⚠️",
      text: "Registrar acción inmediata",
      reason: `CRÍTICA (SLA ${el}/${sla} min).`,
    };

  if (br)
    return {
      level: "medium",
      label: "Acción",
      icon: "⏱️",
      text: "Registrar acción formal",
      reason: `SLA vencido (${el}>${sla} min).`,
    };

  return {
    level: "low",
    label: "Monitoreo",
    icon: "👁️",
    text: "Mantener monitoreo",
    reason: `SLA dentro de margen (${el}/${sla} min).`,
  };
}
