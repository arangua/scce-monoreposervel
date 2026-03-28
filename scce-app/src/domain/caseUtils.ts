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

// ─── Ordenamiento operacional de casos ─────────────────────────────────

/**
 * Puntaje de urgencia operacional.
 * Mayor puntaje = aparece primero en el panel.
 *
 * Grupos (de mayor a menor):
 * 100+ : SLA vencido + CRÍTICA
 *  80+ : SLA vencido + ALTA
 *  60+ : CRÍTICA sin vencer
 *  40+ : ALTA sin vencer
 *  20+ : MEDIA
 *  10+ : BAJA
 *   0  : Resuelto / Cerrado (siempre al final)
 *
 * Bonus por antigüedad (+0 a +9): más tiempo sin resolver = sube en su grupo.
 * Bonus por alcance de impacto (+1 a +5): REGIONAL/NACIONAL suben más.
 */
export function urgencyScore(
  c: {
    criticality: string;
    status: string;
    slaMinutes?: number | null;
    createdAt?: string | null;
    reportedAt?: string | null;
    impactScope?: string | null;
  },
  nowMs = Date.now()
): number {
  const st = normalizeStatus(c.status);
  if (st === "Resuelto" || st === "Cerrado") return 0;

  const slaMs    = (c.slaMinutes ?? 60) * 60_000;
  const since    = new Date(c.createdAt ?? c.reportedAt ?? nowMs).getTime();
  const elapsed  = nowMs - since;
  const vencido  = elapsed > slaMs;

  const base =
    c.criticality === "CRITICA" && vencido ? 100 :
    c.criticality === "ALTA"    && vencido ?  80 :
    c.criticality === "CRITICA"            ?  60 :
    c.criticality === "ALTA"               ?  40 :
    c.criticality === "MEDIA"              ?  20 : 10;

  // Bonus por antigüedad dentro del grupo (0–9): primeras 48 h
  const ageBonus = Math.min(elapsed / 3_600_000, 48) / 48 * 9;

  // Bonus por alcance del impacto
  const scopeBonus =
    c.impactScope === "NACIONAL" ? 5 :
    c.impactScope === "REGIONAL" ? 3 :
    c.impactScope === "COMUNAL"  ? 1 : 0;

  return base + ageBonus + scopeBonus;
}

/** Ordena casos por urgencia descendente. Casos cerrados van al final. */
export function sortByUrgency<T extends {
  criticality: string;
  status: string;
  slaMinutes?: number | null;
  createdAt?: string | null;
  reportedAt?: string | null;
  impactScope?: string | null;
}>(cases: T[]): T[] {
  const now = Date.now();
  return [...cases].sort((a, b) => {
    const sa = urgencyScore(a, now);
    const sb = urgencyScore(b, now);
    if (sa !== sb) return sb - sa;
    // Empate: más antiguo primero (lleva más tiempo sin resolver)
    const ta = new Date(a.createdAt ?? "").getTime() || 0;
    const tb = new Date(b.createdAt ?? "").getTime() || 0;
    return ta - tb;
  });
}
