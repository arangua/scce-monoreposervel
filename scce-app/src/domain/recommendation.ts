// src/domain/recommendation.ts
import { getElapsed } from "./date";
import { SLA_MINUTES, type SlaLevel } from "./caseSla";

export type RecLevel = "low" | "medium" | "high";

export function getRecommendation(c: {
  status?: string;
  criticality?: string;
  createdAt?: string;
}) {
  const el = getElapsed({ createdAt: c.createdAt });
  const slaKey: SlaLevel = (c?.criticality as SlaLevel) ?? "MEDIA";
  const sla = (SLA_MINUTES as Record<SlaLevel, number>)[slaKey] ?? 120;
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
