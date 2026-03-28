// src/domain/caseSla.ts
import { getElapsed } from "./date";

export type SlaLevel = "CRITICA" | "ALTA" | "MEDIA" | "BAJA";

// FASE 2: modo operacional
export type OperationMode = "NORMAL" | "CONTINGENCIA" | "DEGRADADO";

export const SLA_MINUTES: Record<SlaLevel, number> = {
  CRITICA: 5,
  ALTA: 15,
  MEDIA: 60,
  BAJA: 120,
};

/**
 * FASE 2: Calcula los minutos SLA efectivos según el modo operacional.
 * - CONTINGENCIA: SLA reducido al 50%
 * - DEGRADADO: SLA suspendido (retorna Infinity)
 * - NORMAL: SLA base
 */
export function getSlaMinutes(criticality: string, mode: OperationMode = "NORMAL"): number {
  if (mode === "DEGRADADO") return Infinity;
  const base = SLA_MINUTES[criticality as SlaLevel] ?? 120;
  return mode === "CONTINGENCIA" ? Math.ceil(base * 0.5) : base;
}

/**
 * FASE 2: Retorna el porcentaje del SLA consumido (0-100+).
 * Usado para el semáforo visual.
 */
export function getSlaPercent(
  c: { createdAt?: string; status?: string; criticality?: string; slaBreachAt?: string | null },
  mode: OperationMode = "NORMAL"
): number {
  if (!c.createdAt || ["Resuelto", "Cerrado"].includes(c.status || "")) return 0;
  if (mode === "DEGRADADO") return 0; // SLA suspendido
  const slaMin = getSlaMinutes(c.criticality ?? "MEDIA", mode);
  const elapsed = getElapsed({ createdAt: c.createdAt });
  return Math.round((elapsed / slaMin) * 100);
}

/**
 * FASE 2: Semáforo SLA.
 * Retorna el color y estado para mostrar en la tarjeta.
 */
export type SlaTrafficLight = {
  color: "green" | "yellow" | "red";
  percent: number;
  label: string;
  vencido: boolean;
};

export function getSlaTrafficLight(
  c: { createdAt?: string; status?: string; criticality?: string; slaBreachAt?: string | null },
  mode: OperationMode = "NORMAL"
): SlaTrafficLight {
  if (!c.createdAt || ["Resuelto", "Cerrado"].includes(c.status || "")) {
    return { color: "green", percent: 0, label: "", vencido: false };
  }
  if (mode === "DEGRADADO") {
    return { color: "green", percent: 0, label: "SLA suspendido", vencido: false };
  }
  const percent = getSlaPercent(c, mode);
  if (percent >= 100) return { color: "red",    percent, label: "SLA VENCIDO",  vencido: true };
  if (percent >= 80)  return { color: "yellow", percent, label: `SLA ${percent}%`, vencido: false };
  if (percent >= 50)  return { color: "yellow", percent, label: `SLA ${percent}%`, vencido: false };
  return                     { color: "green",  percent, label: `SLA ${percent}%`, vencido: false };
}

export function isSlaVencido(c: {
  createdAt?: string;
  status?: string;
  criticality?: string;
}): boolean {
  if (!c.createdAt || ["Resuelto", "Cerrado"].includes(c.status || "")) return false;
  const slaKey: SlaLevel = (c?.criticality as SlaLevel) ?? "MEDIA";
  const slaMin = SLA_MINUTES[slaKey] ?? 120;
  return getElapsed({ createdAt: c.createdAt }) > slaMin;
}
