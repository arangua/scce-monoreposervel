/**
 * domain/seed.ts
 * Datos de semilla para desarrollo y simulación SCCE.
 * Extraído de App.tsx — R-2 refactor 2026-03-27.
 *
 * Exporta:
 *   makeSeedCases(catalog)  → CaseItem[]   (3 casos ficticios Tarapacá)
 *   makeSeedAudit()         → AuditLogEntry[]
 */

import type { CaseItem, LocalCatalog, AuditLogEntry } from "./types";
import { genId } from "./caseUtils";
import { buildSeedLog } from "./caseUtils";
import { tsISO } from "./date";

// ─── makeSeedCases ────────────────────────────────────────────────────────────

export function makeSeedCases(catalog: LocalCatalog): CaseItem[] {
  type RC = string;
  type CC = string;
  const snap = (r: RC, co: CC, n: string) => {
    const l = catalog.find((x) => x.region === r && x.commune === co && x.nombre === n);
    return l
      ? { idLocal: l.idLocal, nombre: l.nombre, region: r, commune: co, snapshotAt: tsISO(95) }
      : null;
  };

  return [
    {
      id: genId("TRP","IQQ",1),
      region: "TRP", commune: "IQQ", local: "Liceo Arturo Pérez Canto",
      localSnapshot: snap("TRP","IQQ","Liceo Arturo Pérez Canto"),
      origin: { actor:"PESE Local", channel:"Teams", detectedAt:tsISO(95) },
      summary: "Urna sellada de forma incorrecta — sello roto en mesa 12",
      detail: "El vocal de mesa reporta precinto roto.",
      evidence: [], bypass: false, bypassFlagged: false, peseInoperante: false,
      evaluationLocked: true, evaluationHistory: [],
      evaluation: { continuidad:1, integridad:2, seguridad:0, exposicion:1, capacidadLocal:2 },
      criticality: "MEDIA", criticalityScore: 6, status: "En gestión",
      assignedTo: "u4", slaMinutes: 60, closingMotivo: null, bypassValidated: null,
      timeline: [
        { type:"DETECTED",      at:tsISO(95), actor:"u1", note:"Detectado por PESE" },
        { type:"REPORTED",      at:tsISO(90), actor:"u1", note:"Reportado vía Teams" },
        { type:"RECEPCIONADO",  at:tsISO(88), actor:"u4", note:"Recepcionado" },
        { type:"FIRST_ACTION",  at:tsISO(85), actor:"u4", note:"Registro SCCE toma el caso" },
      ],
      actions:   [{ id:"a1", action:"Instruir a vocal: fotografiar precinto.", responsible:"u4", at:tsISO(85), result:"Confirmado" }],
      decisions: [{ who:"u4", at:tsISO(84), fundament:"Protocolo: urna con precinto dañado → preservar y fotografiar." }],
      completeness: 90,
      reportedAt: tsISO(90), firstActionAt: tsISO(85),
      escalatedAt: null, mitigatedAt: null, resolvedAt: null, closedAt: null,
      createdBy: "u1", createdAt: tsISO(95), updatedAt: tsISO(85),
    },
    {
      id: genId("TRP","IQQ",2),
      region: "TRP", commune: "IQQ", local: "Escuela Alemania",
      localSnapshot: snap("TRP","IQQ","Escuela Alemania"),
      origin: { actor:"Delegado JE", channel:"WhatsApp", detectedAt:tsISO(130) },
      summary: "Vocal de mesa no se presenta — 40 min tras apertura",
      detail: "Mesa 5 abre con solo 2 vocales.",
      evidence: [], bypass: false, bypassFlagged: false, peseInoperante: false,
      evaluationLocked: true, evaluationHistory: [],
      evaluation: { continuidad:2, integridad:1, seguridad:0, exposicion:1, capacidadLocal:1 },
      criticality: "ALTA", criticalityScore: 5, status: "Resuelto",
      assignedTo: "u5", slaMinutes: 30, closingMotivo: null, bypassValidated: null,
      timeline: [
        { type:"DETECTED",     at:tsISO(130), actor:"u2", note:"" },
        { type:"REPORTED",     at:tsISO(128), actor:"u2", note:"" },
        { type:"RECEPCIONADO", at:tsISO(125), actor:"u4", note:"" },
        { type:"FIRST_ACTION", at:tsISO(120), actor:"u5", note:"" },
        { type:"RESOLVED",     at:tsISO(80),  actor:"u5", note:"Vocal reemplazante juramentado" },
      ],
      actions:   [{ id:"a2", action:"Contactar nómina de reemplazantes", responsible:"u5", at:tsISO(120), result:"Vocal se presenta" }],
      decisions: [{ who:"u7", at:tsISO(119), fundament:"LOC: vocal ausente → llamar reemplazante." }],
      completeness: 100,
      reportedAt: tsISO(128), firstActionAt: tsISO(120),
      escalatedAt: null, mitigatedAt: null, resolvedAt: tsISO(80), closedAt: null,
      createdBy: "u2", createdAt: tsISO(130), updatedAt: tsISO(80),
    },
    {
      id: genId("TRP","ALH",3),
      region: "TRP", commune: "ALH", local: "Liceo Altiplano",
      localSnapshot: snap("TRP","ALH","Liceo Altiplano"),
      origin: { actor:"DR Eventual", channel:"Teléfono", detectedAt:tsISO(200) },
      summary: "CRÍTICO: Corte de luz total en local de votación",
      detail: "8 mesas afectadas.",
      evidence: ["Foto confirmada"], bypass: true,
      bypassMotivo: "Riesgo inminente — continuidad=3", bypassActor: "u7",
      bypassFlagged: false, peseInoperante: false,
      evaluationLocked: true, evaluationHistory: [],
      evaluation: { continuidad:3, integridad:1, seguridad:2, exposicion:2, capacidadLocal:0 },
      criticality: "CRITICA", criticalityScore: 8, status: "Escalado",
      assignedTo: "u7", slaMinutes: 15, closingMotivo: null, bypassValidated: null,
      timeline: [
        { type:"DETECTED",  at:tsISO(200), actor:"u3", note:"" },
        { type:"BYPASS",    at:tsISO(198), actor:"u7", note:"Bypass: continuidad=3" },
        { type:"ESCALATED", at:tsISO(195), actor:"u7", note:"Escalado a Nivel Central" },
      ],
      actions:   [{ id:"a3", action:"Contactar empresa eléctrica. Solicitar grupo electrógeno.", responsible:"u7", at:tsISO(195), result:"En gestión" }],
      decisions: [{ who:"u7", at:tsISO(196), fundament:"Nivel 3 en continuidad → escalar inmediatamente." }],
      completeness: 80,
      reportedAt: tsISO(198), firstActionAt: tsISO(195),
      escalatedAt: tsISO(195), mitigatedAt: null, resolvedAt: null, closedAt: null,
      createdBy: "u3", createdAt: tsISO(200), updatedAt: tsISO(195),
    },
  ] as CaseItem[];
}

// ─── makeSeedAudit ────────────────────────────────────────────────────────────

export function makeSeedAudit(): AuditLogEntry[] {
  return buildSeedLog([
    { type:"LOGIN",        at:tsISO(210), actor:"u7", role:"DIRECTOR_REGIONAL", caseId:null,                summary:"Inicio de sesión" },
    { type:"LOGIN",        at:tsISO(209), actor:"u4", role:"REGISTRO_SCCE",     caseId:null,                summary:"Inicio de sesión" },
    { type:"CASE_CREATED", at:tsISO(200), actor:"u3", role:"DR_EVENTUAL",       caseId:genId("TRP","ALH",3),summary:"Caso: corte de luz" },
    { type:"BYPASS_USED",  at:tsISO(198), actor:"u7", role:"DIRECTOR_REGIONAL", caseId:genId("TRP","ALH",3),summary:"Bypass: continuidad=3" },
    { type:"ESCALATED",    at:tsISO(195), actor:"u7", role:"DIRECTOR_REGIONAL", caseId:genId("TRP","ALH",3),summary:"Escalado a Nivel Central" },
    { type:"CASE_CREATED", at:tsISO(130), actor:"u2", role:"DELEGADO_JE",       caseId:genId("TRP","IQQ",2),summary:"Caso: vocal ausente" },
    { type:"CASE_CREATED", at:tsISO(95),  actor:"u1", role:"PESE",              caseId:genId("TRP","IQQ",1),summary:"Caso: urna precinto" },
  ]);
}
