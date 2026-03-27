/**
 * caseUtils.ts
 * Utilidades de dominio para casos SCCE.
 * Extraído de App.tsx — R-1 refactor 2026-03-27.
 * Funciones puras, sin estado, sin efectos secundarios.
 */

import { themeColor } from "../theme";
import type { RegionCode, CommuneCode, CaseStatus, Criticality } from "./types";
import { chainHash } from "./hash";
import { uuidSimple } from "./date";
import type { AuditLogEntry } from "./types";

// ─── Generación de ID de caso ─────────────────────────────────────────────────

export function genId(region: RegionCode, commune: CommuneCode, seq: number): string {
  return `${region}-${new Date().getFullYear()}-${commune}-${String(seq).padStart(3, "0")}`;
}

// ─── Criticidad ───────────────────────────────────────────────────────────────

export type CriticalityResult = {
  criticality: Criticality;
  score: number;
  recommendation: string;
};

export function calcCriticality(
  ev: Record<string, number> | null | undefined
): CriticalityResult {
  const vals = Object.values(ev ?? {}) as number[];
  const max = vals.length ? Math.max(...vals) : 0;
  const sum = vals.reduce((a: number, b: number) => a + b, 0);

  if (max >= 3)
    return { criticality: "CRITICA", score: sum, recommendation: "⚠️ Escalamiento INMEDIATO al Director Regional y Nivel Central." };
  if (sum >= 8)
    return { criticality: "ALTA",   score: sum, recommendation: "Notificar Director Regional. SLA máx. 30 min." };
  if (sum >= 4)
    return { criticality: "MEDIA",  score: sum, recommendation: "Gestionar a través de Registro SCCE. SLA máx. 60 min." };
  return   { criticality: "BAJA",   score: sum, recommendation: "Gestión local. Registrar y monitorear." };
}

// ─── Colores de UI ────────────────────────────────────────────────────────────

export function critColor(c: Criticality): string {
  const map = {
    CRITICA: themeColor("danger"),
    ALTA:    themeColor("warning"),
    MEDIA:   themeColor("warningAlt"),
    BAJA:    themeColor("success"),
  } as const;
  return map[c] ?? themeColor("gray");
}

export type UiStatus =
  | "Nuevo"
  | "Recepcionado por DR"
  | "En gestión"
  | "Escalado"
  | "Mitigado"
  | "Resuelto"
  | "Cerrado";

export const STATUS_MAP: Record<string, UiStatus> = {
  // backend / legacy
  OPEN:        "Nuevo",
  NEW:         "Nuevo",
  IN_PROGRESS: "En gestión",
  ESCALATED:   "Escalado",
  MITIGATED:   "Mitigado",
  RESOLVED:    "Resuelto",
  CLOSED:      "Cerrado",
  // ya en español
  "Nuevo":               "Nuevo",
  "Recepcionado por DR": "Recepcionado por DR",
  "En gestión":          "En gestión",
  "Escalado":            "Escalado",
  "Mitigado":            "Mitigado",
  "Resuelto":            "Resuelto",
  "Cerrado":             "Cerrado",
};

export function normalizeStatus(s: unknown): UiStatus | "Otros / Desconocido" {
  const key = String(s ?? "").trim();
  return STATUS_MAP[key] ?? "Otros / Desconocido";
}

export function statusColor(s: CaseStatus): string {
  const map = {
    "Nuevo":               themeColor("purple"),
    "Recepcionado por DR": themeColor("purpleLight"),
    "En gestión":          themeColor("primary"),
    "Escalado":            themeColor("danger"),
    "Mitigado":            themeColor("warning"),
    "Resuelto":            themeColor("success"),
    "Cerrado":             themeColor("gray"),
  } as const;
  return map[s as keyof typeof map] ?? themeColor("gray");
}

// ─── Audit log seed ───────────────────────────────────────────────────────────

export type SeedEventInput = {
  type: string;
  at: string;
  actor: string;
  role: string;
  caseId?: string | null;
  summary: string;
};

export function buildSeedLog(events: SeedEventInput[]): AuditLogEntry[] {
  const log: AuditLogEntry[] = [];
  for (const e of events) {
    const prevHash: string = log.length ? log[log.length - 1].hash : "00000000";
    const ev: AuditLogEntry = {
      eventId: uuidSimple(),
      ...e,
      caseId: e.caseId ?? null,
      prevHash,
      hash: "",
    };
    ev.hash = chainHash(prevHash, ev);
    log.push(ev);
  }
  return log;
}

// ─── Escenarios de simulación ─────────────────────────────────────────────────

export const SIM_SCENARIOS = [
  { summary: "Urna sellada incorrectamente",   ev: { continuidad: 1, integridad: 2, seguridad: 0, exposicion: 1, capacidadLocal: 2 } },
  { summary: "Vocal no se presenta",           ev: { continuidad: 2, integridad: 1, seguridad: 0, exposicion: 1, capacidadLocal: 1 } },
  { summary: "Corte de luz en local",          ev: { continuidad: 3, integridad: 1, seguridad: 2, exposicion: 2, capacidadLocal: 0 } },
  { summary: "Discusión entre apoderados",     ev: { continuidad: 0, integridad: 0, seguridad: 1, exposicion: 2, capacidadLocal: 1 } },
  { summary: "Sistema de votación lento",      ev: { continuidad: 1, integridad: 0, seguridad: 0, exposicion: 0, capacidadLocal: 1 } },
  { summary: "Cédula de identidad vencida",    ev: { continuidad: 0, integridad: 2, seguridad: 0, exposicion: 1, capacidadLocal: 1 } },
  { summary: "Manifestantes frente al local",  ev: { continuidad: 1, integridad: 0, seguridad: 2, exposicion: 2, capacidadLocal: 1 } },
  { summary: "Mesa sin materiales",            ev: { continuidad: 2, integridad: 1, seguridad: 0, exposicion: 0, capacidadLocal: 0 } },
  { summary: "Periodista sin credencial",      ev: { continuidad: 0, integridad: 1, seguridad: 0, exposicion: 2, capacidadLocal: 2 } },
  { summary: "Amenaza de bomba",               ev: { continuidad: 3, integridad: 2, seguridad: 3, exposicion: 3, capacidadLocal: 0 } },
] as const;
