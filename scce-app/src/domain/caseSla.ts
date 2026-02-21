// src/domain/caseSla.ts
import { getElapsed } from "./date";

export type SlaLevel = "CRITICA" | "ALTA" | "MEDIA" | "BAJA";

export const SLA_MINUTES: Record<SlaLevel, number> = {
  CRITICA: 5,
  ALTA: 15,
  MEDIA: 60,
  BAJA: 120,
};

export function isSlaVencido(c: {
  createdAt?: string;
  status?: string;
  criticality?: string;
}): boolean {
  if (!c.createdAt || ["Resuelto", "Cerrado"].includes(c.status || "")) return false;

  const slaKey: SlaLevel = (c?.criticality as SlaLevel) ?? "MEDIA";
  const slaMin = SLA_MINUTES[slaKey] ?? 120;

  // getElapsed en dominio acepta { createdAt?: string } (y opcional nowMs),
  // por lo que esto mantiene la misma lógica de App.
  return getElapsed({ createdAt: c.createdAt }) > slaMin;
}
