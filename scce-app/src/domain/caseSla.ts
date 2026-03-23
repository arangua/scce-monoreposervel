// src/domain/caseSla.ts
import { getElapsed } from "./date";

export type SlaLevel = "CRITICA" | "ALTA" | "MEDIA" | "BAJA";

export const SLA_MINUTES: Record<SlaLevel, number> = {
  CRITICA: 5,
  ALTA: 15,
  MEDIA: 60,
  BAJA: 120,
};

export function normalizeSlaLevel(v?: string): SlaLevel {
  return v === "CRITICA" || v === "ALTA" || v === "MEDIA" || v === "BAJA" ? v : "MEDIA";
}

/** Minutos de SLA al crear casos (misma fórmula que App: `SLA_MINUTES[normalizeSlaLevel(...)] || 60`). */
export function slaMinutesForCriticality(criticality?: string): number {
  return SLA_MINUTES[normalizeSlaLevel(criticality)] || 60;
}

export function isSlaVencido(c: {
  createdAt?: string;
  status?: string;
  criticality?: string;
}): boolean {
  if (!c.createdAt || ["Resuelto", "Cerrado"].includes(c.status || "")) return false;

  const slaKey = normalizeSlaLevel(c.criticality);
  const slaMin = SLA_MINUTES[slaKey] ?? 120;

  // getElapsed en dominio acepta { createdAt?: string } (y opcional nowMs),
  // por lo que esto mantiene la misma lógica de App.
  return getElapsed({ createdAt: c.createdAt }) > slaMin;
}
