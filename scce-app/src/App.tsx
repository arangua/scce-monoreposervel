import React, { useState, useMemo, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react";
import type { CaseItem, InstructionItem, ImpactLevel, ScopeFunctional, LocalCatalog, LocalCatalogEntry, CaseStatus, Criticality, RegionCode, CommuneCode, AuditLogEntry, CaseEventKind, CaseEvent, OperationalValidationResult } from "./domain/types";
import { calcCompleteness } from "./domain/caseMetrics";
import { findActiveLocal } from "./domain/catalog";
import { validateCaseSchema } from "./domain/caseValidation";
import { getInternalCommuneForCatalog, getCommuneDisplayName } from "./domain/territoryCatalog";
import { fmtDate, timeDiff, nowISO, uuidSimple, tsISO, isDetectedAtInFuture, nowLocalDatetimeInput } from "./domain/date";
import { CaseDetailView, type CaseDetailGate } from "./views/case";
import { DashboardView, type DashboardGate } from "./views/dashboard";
import { CatalogView as CatalogViewComponent, type CatalogGate } from "./views/catalog";
import { ReportsView as ReportsViewComponent, type ReportsGate } from "./views/reports";
import { AuditView as AuditViewComponent, type AuditGate } from "./views/audit";
import { SimulationView as SimulationViewComponent, type SimulationGate } from "./views/simulation";
import { ChecklistView as ChecklistViewComponent, type ChecklistGate } from "./views/checklist";
import { ConfigView as ConfigViewComponent, type ConfigGate, type ElectionConfigShape } from "./views/config";
import { TrustView as TrustViewComponent, type TrustGate } from "./views/trust";
import { checkLocalDivergence } from "./domain/localDivergence";
import { SLA_MINUTES, isSlaVencido, type SlaLevel } from "./domain/caseSla";
import { getRecommendation } from "./domain/recommendation";
import { recColor } from "./domain/theme";
import { themeColor } from "./theme";
import { chainHash } from "./domain/hash";
import { appendEvent, verifyChain } from "./domain/audit";
import { migrateLegacyInstructionsInCases } from "./domain/migrations/migrateLegacyInstructions";
import { HelpDrawer } from "./components/HelpDrawer";
import { IconButton } from "./components/IconButton";
import { loadRegionRegionsMap } from "./lib/loadRegionRegionsMap";
import type { RegionsMapCompatible } from "./lib/territoryToRegionsMap";
import { Badge } from "./ui/Badge";
import { Tooltip } from "./ui/Tooltip";
import { helpByView, type ViewKey } from "./helpContent";
import { UI_TEXT } from "./config/uiTextStandard";
import { UI_TEXT_GOVERNANCE } from "./config/uiTextGovernance";
import { SIMULATED_ROLES, type SimulatedRoleId, getSimulatedRole } from "./config/simulatedRoles";
import { isTerrainMode } from "./domain/auth/visibility";
import { isClosedStatus } from "./domain/cases/terrainSort";
import { newEventId } from "./domain/eventId";
import { isDuplicateEvent } from "./domain/dedupe";
import { buildExportBundle, validateImportBundle, type ExportBundle } from "./domain/exportImport";
import {
  hasSigningKey,
  initSigningKey,
  signIntegrityHashHex,
  publicKeyFingerprintShort,
} from "./domain/signingVault";
import { TerrainShell } from "./ui/terrain/TerrainShell";
import { apiRequest } from "./domain/apiClient";
import {
  getToken,
  setToken,
  clearSession,
  clearActiveMembership,
  getActiveMembership,
  setActiveMembership,
  isCentralFromContext,
  type ApiUser,
  type Membership,
} from "./domain/authSession";
import { API_BASE_URL } from "./config/runtime";

const APP_VERSION = "1.9";
const MIN_ELECTION_YEAR = 2026;

// 6.3-2 hardening
const MAX_CASES = 5000;
const MAX_ID = 80;
const MAX_SHORT = 200;
const MAX_MED = 500;
const MAX_LONG = 2000;
// 6.3-3 hardening (arrays y timeline)
const MAX_UNKNOWN_ARRAY = 200;
const MAX_TIMELINE = 500;
const MAX_EVENT_NOTE = 500;
const MAX_EVIDENCE_ITEMS = 50;
const MAX_TOTAL_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB post-parse
// 6.3-4 fechas soft (forma + largo, sin parsear)
const MAX_DATE_STR = 35;
const ISO_DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME_RE = /^[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?$/;
const ISO_TZ_RE = /^(?:Z|[+-]\d{2}:\d{2})$/;
const ISO_TZ_SUFFIX_RE = /(Z|[+-]\d{2}:\d{2})$/;

const NAV_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  catalog: "🗂 Catálogo",
  audit: "🔗 Auditoría",
  reports: "Reportes",
  simulation: "Simulación",
  checklist: "Checklist",
  config: "Config",
};

function DashboardGateWrapper(props: Readonly<{ gate: DashboardGate }>) {
  return <DashboardView gate={props.gate} />;
}
function CatalogGateWrapper(props: Readonly<{ gate: CatalogGate }>) {
  return <CatalogViewComponent gate={props.gate} />;
}
function ReportsGateWrapper(props: Readonly<{ gate: ReportsGate }>) {
  return <ReportsViewComponent gate={props.gate} />;
}
function AuditGateWrapper(props: Readonly<{ gate: AuditGate }>) {
  return <AuditViewComponent gate={props.gate} />;
}
function SimulationGateWrapper(props: Readonly<{ gate: SimulationGate }>) {
  return <SimulationViewComponent gate={props.gate} />;
}
function ChecklistGateWrapper(props: Readonly<{ gate: ChecklistGate }>) {
  return <ChecklistViewComponent gate={props.gate} />;
}
function ConfigGateWrapper(props: Readonly<{ gate: ConfigGate }>) {
  return <ConfigViewComponent gate={props.gate} />;
}
function TrustGateWrapper(props: Readonly<{ gate: TrustGate }>) {
  return <TrustViewComponent gate={props.gate} />;
}

function isISOSoftForm(s: string): boolean {
  if (s.length > MAX_DATE_STR || s.length < 10) return false;
  if (!ISO_DATE_ONLY_RE.test(s.slice(0, 10))) return false;
  const rest = s.slice(10);
  if (rest.length === 0) return true;
  const tzMatch = ISO_TZ_SUFFIX_RE.exec(rest);
  const timePart = tzMatch ? rest.slice(0, -tzMatch[1].length) : rest;
  if (timePart.length === 0) return false;
  return ISO_TIME_RE.test(timePart) && (!tzMatch || ISO_TZ_RE.test(tzMatch[1]));
}
const ID_RE = /^[A-Za-z0-9_-]+$/;

function importFail(msg: string): never {
  throw new Error(msg);
}

function assertImportString(name: string, v: unknown): string {
  if (typeof v !== "string") importFail(`Import fail-closed: "${name}" debe ser string.`);
  const s = v.trim();
  if (!s) importFail(`Import fail-closed: "${name}" no puede ser vacío.`);
  return s;
}

function assertStringMax(name: string, v: unknown, max: number, optional = false): string | undefined {
  if (v === undefined || v === null) return optional ? undefined : importFail(`Import fail-closed: "${name}" es requerido.`);
  const s = assertImportString(name, v);
  if (s.length > max) importFail(`Import fail-closed: "${name}" excede máximo (${max}).`);
  return s;
}

function assertIdStable(v: unknown): string {
  const id = assertStringMax("case.id", v, MAX_ID, false)!;
  if (!ID_RE.test(id)) importFail(`Import fail-closed: "case.id" contiene caracteres no permitidos. Use solo A-Z a-z 0-9 _ -`);
  return id;
}

function assertArrayMax(name: string, v: unknown, max: number, optional = false): unknown[] | undefined {
  if (v === undefined || v === null) return optional ? undefined : importFail(`Import fail-closed: "${name}" es requerido.`);
  if (!Array.isArray(v)) importFail(`Import fail-closed: "${name}" debe ser arreglo.`);
  if (v.length > max) importFail(`Import fail-closed: "${name}" excede máximo (${max}).`);
  return v;
}

function assertPlainObject(name: string, v: unknown): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) importFail(`Import fail-closed: "${name}" debe ser objeto.`);
  return v as Record<string, unknown>;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isInstructionAckedByUser(ins: InstructionItem, userId: string): boolean {
  return (ins.acks ?? []).some((a) => a.userId === userId);
}

function lastAck(ins: InstructionItem): { userId: string; role: string; at: string } | null {
  const acks = ins.acks ?? [];
  return acks.length > 0 ? (acks.at(-1) ?? null) : null;
}

/** Actualiza la lista de instrucciones añadiendo un acuse a la instrucción indicada (reduce anidación en ackInstruction). */
function addAckToInstruction(
  instructions: InstructionItem[],
  instructionId: string,
  userId: string,
  role: string
): InstructionItem[] {
  return instructions.map((ins) =>
    ins.id === instructionId
      ? { ...ins, acks: [...(ins.acks ?? []), { userId, role, at: nowISO() }] }
      : ins
  );
}

/** Actualiza la lista de instrucciones cerrando la instrucción indicada (reduce anidación en closeInstruction). */
function closeInstructionInList(instructions: InstructionItem[], instructionId: string): InstructionItem[] {
  return instructions.map((ins) => (ins.id === instructionId ? { ...ins, status: "CERRADA" as const } : ins));
}

/** Aplica un updater a un caso por id y devuelve la nueva lista (reduce anidación S2004 en setCases). */
function updateOneCase(prev: CaseItem[], caseId: string, updater: (c: CaseItem) => CaseItem): CaseItem[] {
  return prev.map((x) => (x.id === caseId ? updater(x) : x));
}

function isLocalSnapshot(v: unknown): v is {
  idLocal: string;
  nombre: string;
  region: string;
  commune: string;
  snapshotAt: string;
} {
  if (!isRecord(v)) return false;
  return (
    typeof v.idLocal === "string" &&
    typeof v.nombre === "string" &&
    typeof v.region === "string" &&
    typeof v.commune === "string" &&
    typeof v.snapshotAt === "string"
  );
}

function assertUnknownItemKind(name: string, v: unknown): void {
  if (typeof v === "string") {
    if (v.trim().length > MAX_LONG) importFail(`Import fail-closed: "${name}" string excede máximo (${MAX_LONG}).`);
    return;
  }
  if (typeof v === "object" && v !== null && !Array.isArray(v)) return;
  importFail(`Import fail-closed: "${name}" debe ser string u objeto.`);
}

function assertCaseEvent(name: string, v: unknown): void {
  const o = assertPlainObject(name, v);
  assertStringMax(`${name}.type`, o.type, MAX_SHORT, false);
  assertStringMax(`${name}.at`, o.at, MAX_SHORT, false);
  assertStringMax(`${name}.actor`, o.actor, MAX_MED, false);
  assertStringMax(`${name}.note`, o.note, MAX_EVENT_NOTE, true);
}

function assertIsoSoft(name: string, v: unknown, optional = false): string | undefined {
  if (v === undefined || v === null) return optional ? undefined : importFail(`Import fail-closed: "${name}" es requerido.`);
  const s = assertImportString(name, v);
  if (s.length > MAX_DATE_STR) importFail(`Import fail-closed: "${name}" excede máximo (${MAX_DATE_STR}).`);
  if (!isISOSoftForm(s)) importFail(`Import fail-closed: "${name}" no tiene forma ISO válida (soft).`);
  return s;
}

const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

function parseImportFile(file: File): Promise<string> {
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error(
      `Import JSON bloqueado: ${(file.size / (1024 * 1024)).toFixed(2)} MB excede el máximo de ${(MAX_IMPORT_FILE_BYTES / (1024 * 1024)).toFixed(0)} MB.`
    );
  }
  return file.text();
}

function validateImportRoot(parsed: unknown): { meta: Record<string, unknown>; casesIn: unknown[] } {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Import JSON bloqueado: estructura inválida (se esperaba objeto raíz).");
  }
  const root = parsed as Record<string, unknown>;
  const metadata = root["metadata"];
  const casesIn = root["cases"];
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("Import JSON bloqueado: 'metadata' no es un objeto válido.");
  }
  const meta = metadata as Record<string, unknown>;
  if (meta.schemaVersion !== 1) importFail("Import fail-closed: metadata.schemaVersion debe ser 1.");
  if (!Array.isArray(casesIn)) {
    throw new TypeError("Import JSON bloqueado: 'cases' no es un array.");
  }
  if (casesIn.length > MAX_CASES) {
    throw new Error(`Import JSON bloqueado: 'cases' excede el máximo de ${MAX_CASES}.`);
  }
  const totalSize = JSON.stringify(casesIn).length;
  if (totalSize > MAX_TOTAL_PAYLOAD_BYTES) {
    importFail(`Import fail-closed: tamaño total de payload excede máximo (${MAX_TOTAL_PAYLOAD_BYTES} bytes).`);
  }
  return { meta, casesIn };
}

function confirmImportReplace(): boolean {
  const ok = confirm("Vas a reemplazar los casos actuales por el contenido del JSON. ¿Continuar?");
  if (!ok) return false;
  const typed = prompt("Escribe IMPORTAR para confirmar el reemplazo total:");
  return (typed ?? "").trim() === "IMPORTAR";
}

function validateImportCaseEvidence(c: Record<string, unknown>, i: number): void {
  if (c?.evidence == null) return;
  if (!Array.isArray(c.evidence)) importFail(`Import fail-closed: cases[${i}].evidence debe ser arreglo.`);
  if ((c.evidence as unknown[]).length > MAX_EVIDENCE_ITEMS) {
    importFail(`Import fail-closed: cases[${i}].evidence excede máximo (${MAX_EVIDENCE_ITEMS}).`);
  }
  for (let j = 0; j < (c.evidence as unknown[]).length; j++) {
    assertStringMax(`cases[${i}].evidence[${j}]`, (c.evidence as unknown[])[j], MAX_LONG, false);
  }
}

function validateImportCaseOrigin(orig: Record<string, unknown>, i: number): void {
  assertStringMax(`cases[${i}].origin.actor`, orig.actor, MAX_MED, true);
  assertStringMax(`cases[${i}].origin.channel`, orig.channel, MAX_MED, true);
  assertStringMax(`cases[${i}].origin.detectedAt`, orig.detectedAt, MAX_SHORT, true);
  assertIsoSoft(`cases[${i}].origin.detectedAt`, orig.detectedAt, true);
}

function validateImportCaseLocalSnapshot(snap: Record<string, unknown>, i: number): void {
  assertStringMax(`cases[${i}].localSnapshot.idLocal`, snap.idLocal, MAX_ID, true);
  assertStringMax(`cases[${i}].localSnapshot.nombre`, snap.nombre, MAX_LONG, true);
  assertStringMax(`cases[${i}].localSnapshot.region`, snap.region, MAX_SHORT, true);
  assertStringMax(`cases[${i}].localSnapshot.commune`, snap.commune, MAX_SHORT, true);
  assertStringMax(`cases[${i}].localSnapshot.snapshotAt`, snap.snapshotAt, MAX_SHORT, true);
  assertIsoSoft(`cases[${i}].localSnapshot.snapshotAt`, snap.snapshotAt, true);
}

function validateImportCaseInstruction(ins: Record<string, unknown>, path: string): void {
  assertStringMax(`${path}.id`, ins?.id, MAX_ID, true);
  assertStringMax(`${path}.caseId`, ins?.caseId, MAX_ID, true);
  assertStringMax(`${path}.scope`, ins?.scope, MAX_SHORT, false);
  assertStringMax(`${path}.audience`, ins?.audience, MAX_SHORT, false);
  assertStringMax(`${path}.summary`, ins?.summary, MAX_LONG, false);
  assertStringMax(`${path}.details`, ins?.details, MAX_LONG, true);
  assertStringMax(`${path}.createdAt`, ins?.createdAt, MAX_SHORT, false);
  assertIsoSoft(`${path}.createdAt`, ins?.createdAt, false);
  assertStringMax(`${path}.createdBy`, ins?.createdBy, MAX_MED, false);
  assertStringMax(`${path}.status`, ins?.status, MAX_SHORT, false);
  if (ins?.ackRequired !== true) importFail(`Import fail-closed: ${path}.ackRequired debe ser true.`);
  const acks = assertArrayMax(`${path}.acks`, ins?.acks, MAX_TIMELINE, false);
  if (!acks) importFail(`Import fail-closed: ${path}.acks debe ser arreglo.`);
  for (let k = 0; k < acks.length; k++) {
    const ack = acks[k] as Record<string, unknown>;
    assertStringMax(`${path}.acks[${k}].userId`, ack?.userId, MAX_MED, false);
    assertStringMax(`${path}.acks[${k}].role`, ack?.role, MAX_SHORT, false);
    assertStringMax(`${path}.acks[${k}].at`, ack?.at, MAX_SHORT, false);
    assertIsoSoft(`${path}.acks[${k}].at`, ack?.at, false);
  }
  const ev = assertArrayMax(`${path}.evidence`, ins?.evidence, MAX_EVIDENCE_ITEMS, true);
  if (ev) {
    for (let k = 0; k < ev.length; k++) {
      assertStringMax(`${path}.evidence[${k}]`, ev[k], MAX_LONG, false);
    }
  }
}

function validateImportCaseTimeline(c: Record<string, unknown>, i: number): void {
  const tl = assertArrayMax(`cases[${i}].timeline`, c?.timeline, MAX_TIMELINE, true);
  if (!tl) return;
  for (let j = 0; j < tl.length; j++) {
    assertCaseEvent(`cases[${i}].timeline[${j}]`, tl[j]);
    assertIsoSoft(`cases[${i}].timeline[${j}].at`, (tl[j] as Record<string, unknown>).at, false);
  }
}

function validateImportCaseUnknownItemArrays(c: Record<string, unknown>, i: number): void {
  const acts = assertArrayMax(`cases[${i}].actions`, c?.actions, MAX_UNKNOWN_ARRAY, true);
  if (acts) for (let j = 0; j < acts.length; j++) assertUnknownItemKind(`cases[${i}].actions[${j}]`, acts[j]);
  const decs = assertArrayMax(`cases[${i}].decisions`, c?.decisions, MAX_UNKNOWN_ARRAY, true);
  if (decs) for (let j = 0; j < decs.length; j++) assertUnknownItemKind(`cases[${i}].decisions[${j}]`, decs[j]);
  const eh = assertArrayMax(`cases[${i}].evaluationHistory`, c?.evaluationHistory, MAX_UNKNOWN_ARRAY, true);
  if (eh) for (let j = 0; j < eh.length; j++) assertUnknownItemKind(`cases[${i}].evaluationHistory[${j}]`, eh[j]);
}

function validateImportCaseInstructions(c: Record<string, unknown>, i: number): void {
  const insArr = assertArrayMax(`cases[${i}].instructions`, c?.instructions, MAX_TIMELINE, true);
  if (!insArr) return;
  for (let j = 0; j < insArr.length; j++) {
    validateImportCaseInstruction(insArr[j] as Record<string, unknown>, `cases[${i}].instructions[${j}]`);
  }
}

function validateImportCase(c: Record<string, unknown>, i: number): void {
  assertIdStable(c?.id);
  assertStringMax(`cases[${i}].region`, c?.region, MAX_SHORT, false);
  assertStringMax(`cases[${i}].commune`, c?.commune, MAX_SHORT, false);
  assertStringMax(`cases[${i}].summary`, c?.summary, MAX_LONG, false);
  assertStringMax(`cases[${i}].local`, c?.local, MAX_MED, true);
  assertStringMax(`cases[${i}].detail`, c?.detail, MAX_LONG, true);
  assertStringMax(`cases[${i}].assignedTo`, c?.assignedTo, MAX_MED, true);
  assertStringMax(`cases[${i}].closingMotivo`, c?.closingMotivo, MAX_LONG, true);
  assertStringMax(`cases[${i}].bypassMotivo`, c?.bypassMotivo, MAX_LONG, true);
  assertStringMax(`cases[${i}].bypassActor`, c?.bypassActor, MAX_MED, true);
  assertStringMax(`cases[${i}].createdBy`, c?.createdBy, MAX_MED, true);
  validateImportCaseEvidence(c, i);
  const orig = c?.origin as Record<string, unknown> | undefined;
  if (orig) validateImportCaseOrigin(orig, i);
  const snap = c?.localSnapshot as Record<string, unknown> | undefined;
  if (snap) validateImportCaseLocalSnapshot(snap, i);
  validateImportCaseTimeline(c, i);
  validateImportCaseUnknownItemArrays(c, i);
  validateImportCaseInstructions(c, i);
  assertIsoSoft(`cases[${i}].reportedAt`, c?.reportedAt, true);
  assertIsoSoft(`cases[${i}].firstActionAt`, c?.firstActionAt, true);
  assertIsoSoft(`cases[${i}].escalatedAt`, c?.escalatedAt, true);
  assertIsoSoft(`cases[${i}].mitigatedAt`, c?.mitigatedAt, true);
  assertIsoSoft(`cases[${i}].resolvedAt`, c?.resolvedAt, true);
  assertIsoSoft(`cases[${i}].closedAt`, c?.closedAt, true);
  assertIsoSoft(`cases[${i}].createdAt`, c?.createdAt, true);
  assertIsoSoft(`cases[${i}].updatedAt`, c?.updatedAt, true);
}

const CONFIG = {
  regions: {
    AYP:{name:"Arica y Parinacota",communes:{ARI:{name:"Arica",locals:["Liceo Arturo Prat Chácon"]},CAM:{name:"Camarones",locals:["Escuela Camarones"]},PUR:{name:"Putre",locals:["Escuela Putre"]},GEL:{name:"General Lagos",locals:["Escuela General Lagos"]}},contacts:{JE:"Junta Electoral AYP",FUERZA:"FF.AA. Zona Arica"}},
    TRP:{name:"Tarapacá",communes:{IQQ:{name:"Iquique",locals:["Liceo Arturo Pérez Canto","Escuela Alemania","Colegio Baquedano","Escuela España"]},ALH:{name:"Alto Hospicio",locals:["Liceo Altiplano","Escuela Pudeto","Escuela Los Arenales"]},PCA:{name:"Pozo Almonte",locals:["Escuela Arturo Prat","Liceo Tarapacá"]},CAM:{name:"Camiña",locals:["Escuela Camiña"]},COL:{name:"Colchane",locals:["Escuela Colchane"]},HUA:{name:"Huara",locals:["Escuela Huara"]},PIC:{name:"Pica",locals:["Escuela Pica"]}},contacts:{JE:"Junta Electoral Tarapacá",FUERZA:"FF.AA. Zona Tarapacá"}},
    ANT:{name:"Antofagasta",communes:{ANT:{name:"Antofagasta",locals:["Liceo Politécnico","Escuela República de Colombia"]},CAL:{name:"Calama",locals:["Liceo Industrial","Escuela El Cobre"]},SPA:{name:"San Pedro de Atacama",locals:["Escuela San Pedro"]}},contacts:{JE:"Junta Electoral Antofagasta",FUERZA:"FF.AA. Zona Antofagasta"}},
    ATA:{name:"Atacama",communes:{COP:{name:"Copiapó",locals:["Liceo de Hombres Copiapó"]},VAL:{name:"Vallenar",locals:["Escuela Vallenar"]}},contacts:{JE:"Junta Electoral Atacama",FUERZA:"FF.AA. Zona Atacama"}},
    COQ:{name:"Coquimbo",communes:{LSR:{name:"La Serena",locals:["Liceo Gregorio Cordovez"]},COQ:{name:"Coquimbo",locals:["Escuela Gabriela Mistral"]},OVA:{name:"Ovalle",locals:["Escuela Ovalle"]}},contacts:{JE:"Junta Electoral Coquimbo",FUERZA:"FF.AA. Zona Coquimbo"}},
    VAL:{name:"Valparaíso",communes:{VLP:{name:"Valparaíso",locals:["Liceo Eduardo de la Barra"]},VIN:{name:"Viña del Mar",locals:["Liceo Juanita Fernández"]},SAN:{name:"San Antonio",locals:["Escuela San Antonio"]},SAF:{name:"San Felipe",locals:["Escuela San Felipe"]}},contacts:{JE:"Junta Electoral Valparaíso",FUERZA:"FF.AA. Zona Valparaíso"}},
    OHI:{name:"O'Higgins",communes:{RAN:{name:"Rancagua",locals:["Liceo Oscar Castro"]},SFN:{name:"San Fernando",locals:["Escuela San Fernando"]}},contacts:{JE:"Junta Electoral O'Higgins",FUERZA:"FF.AA. Zona O'Higgins"}},
    MAU:{name:"Maule",communes:{TAL:{name:"Talca",locals:["Liceo Abate Molina"]},LIN:{name:"Linares",locals:["Escuela Linares"]}},contacts:{JE:"Junta Electoral Maule",FUERZA:"FF.AA. Zona Maule"}},
    NUB:{name:"Ñuble",communes:{CHI:{name:"Chillán",locals:["Liceo Marta Brunet"]}},contacts:{JE:"Junta Electoral Ñuble",FUERZA:"FF.AA. Zona Ñuble"}},
    BIO:{name:"Biobío",communes:{CON:{name:"Concepción",locals:["Liceo Enrique Molina Garmendia"]},TAL:{name:"Talcahuano",locals:["Escuela Talcahuano"]},LOS:{name:"Los Ángeles",locals:["Escuela Los Ángeles"]}},contacts:{JE:"Junta Electoral Biobío",FUERZA:"FF.AA. Zona Biobío"}},
    ARA:{name:"Araucanía",communes:{TEM:{name:"Temuco",locals:["Liceo Valentín Letelier"]},VLD:{name:"Villarrica",locals:["Escuela Villarrica"]}},contacts:{JE:"Junta Electoral Araucanía",FUERZA:"FF.AA. Zona Araucanía"}},
    LRI:{name:"Los Ríos",communes:{VAL:{name:"Valdivia",locals:["Liceo Diego Portales"]},LAG:{name:"La Unión",locals:["Escuela La Unión"]},LAJ:{name:"Lago Ranco",locals:["Escuela Lago Ranco"]}},contacts:{JE:"Junta Electoral Los Ríos",FUERZA:"FF.AA. Zona Los Ríos"}},
    LLA:{name:"Los Lagos",communes:{PMT:{name:"Puerto Montt",locals:["Liceo Francisco Ramírez"]},ANC:{name:"Ancud",locals:["Liceo Galvarino Riveros"]},CAC:{name:"Castro",locals:["Liceo Carlos Ibáñez del Campo"]}},contacts:{JE:"Junta Electoral Los Lagos",FUERZA:"FF.AA. Zona Los Lagos"}},
    AIS:{name:"Aysén",communes:{COY:{name:"Coyhaique",locals:["Liceo Lorenzo Arenas"]}},contacts:{JE:"Junta Electoral Aysén",FUERZA:"FF.AA. Zona Aysén"}},
    MAG:{name:"Magallanes",communes:{PUN:{name:"Punta Arenas",locals:["Liceo Sara Braun"]},NAT:{name:"Natales",locals:["Escuela Natales"]}},contacts:{JE:"Junta Electoral Magallanes",FUERZA:"FF.AA. Zona Magallanes"}},
    MET:{name:"Metropolitana",communes:{STG:{name:"Santiago",locals:["Liceo Aplicación","Instituto Nacional"]},PUI:{name:"Puente Alto",locals:["Escuela Puente Alto"]},MAL:{name:"Maipú",locals:["Escuela Maipú"]},LAS:{name:"Las Condes",locals:["Escuela Las Condes"]},NUN:{name:"Ñuñoa",locals:["Escuela Ñuñoa"]},SBE:{name:"San Bernardo",locals:["Escuela San Bernardo"]}},contacts:{JE:"Junta Electoral Metropolitana",FUERZA:"FF.AA. Zona Metropolitana"}},
  }
};

const DEFAULT_REGION = "TRP";

/** Mapeo CUT (API territorial) ↔ códigos internos (CONFIG/membership). Mismo orden que seed territorial. */
const CUT_TO_INTERNAL: Record<string, string> = {
  "01": "TRP", "02": "ANT", "03": "ATA", "04": "COQ", "05": "VAL", "06": "MET",
  "07": "OHI", "08": "MAU", "09": "NUB", "10": "BIO", "11": "ARA", "12": "LRI",
  "13": "LLA", "14": "AIS", "15": "MAG", "16": "AYP",
};
const INTERNAL_TO_CUT: Record<string, string> = Object.fromEntries(
  Object.entries(CUT_TO_INTERNAL).map(([k, v]) => [v, k])
);

function territoryMapToInternalKeys(map: RegionsMapCompatible): Record<string, { name: string; communes: Record<string, { name: string }> }> {
  const out: Record<string, { name: string; communes: Record<string, { name: string }> }> = {};
  for (const [cut, entry] of Object.entries(map)) {
    const internal = CUT_TO_INTERNAL[cut] ?? cut;
    out[internal] = { name: entry.name, communes: entry.communes };
  }
  return out;
}

/** Contraseña de usuarios demo/piloto; no hardcodear. Definir VITE_DEMO_PASSWORD en .env para desarrollo. */
const DEMO_PASSWORD = (import.meta.env.VITE_DEMO_PASSWORD as string | undefined) ?? "";

const USERS = [
  {id:"u1",name:"PESE Local",                  username:"pese1",         password:DEMO_PASSWORD,role:"PESE",               region:"TRP",commune:"IQQ"},
  {id:"u2",name:"Delegado Junta Electoral",     username:"delegado1",     password:DEMO_PASSWORD,role:"DELEGADO_JE",        region:"TRP",commune:"IQQ"},
  {id:"u3",name:"Funcionario DR Eventual",      username:"dr_eventual",   password:DEMO_PASSWORD,role:"DR_EVENTUAL",        region:"TRP"},
  {id:"u4",name:"Funcionario Registro SCCE",    username:"registro",      password:DEMO_PASSWORD,role:"REGISTRO_SCCE",      region:"TRP"},
  {id:"u5",name:"Funcionario Jefe Operaciones", username:"jefe_ops",      password:DEMO_PASSWORD,role:"JEFE_OPS",           region:"TRP"},
  {id:"u6",name:"Funcionario Encargado Gasto",  username:"gasto",         password:DEMO_PASSWORD,role:"ENCARGADO_GASTO",    region:"TRP"},
  {id:"u7",name:"Director Regional",            username:"director",      password:DEMO_PASSWORD,role:"DIRECTOR_REGIONAL",  region:"TRP"},
  {id:"u8",name:"Usuario Nivel Central",        username:"nivel_central", password:DEMO_PASSWORD,role:"NIVEL_CENTRAL",      region:null},
];
const ROLE_LABELS = {PESE:"PESE",DELEGADO_JE:"Delegado JE",DR_EVENTUAL:"DR Eventual",REGISTRO_SCCE:"Registro SCCE",JEFE_OPS:"Jefe Ops",ENCARGADO_GASTO:"Encargado Gasto",DIRECTOR_REGIONAL:"Director Regional",NIVEL_CENTRAL:"Nivel Central",ADMIN_PILOTO:"Admin Piloto",DR:"DR",EQUIPO_REGIONAL:"Equipo Regional",NIVEL_CENTRAL_SIM:"Nivel Central Sim"} as const;

const POLICIES = {
  PESE:              {create:true, update:false,assign:false,close:false,bypass:false,viewAll:false,comment:true, instruct:false,recepcionar:false,export:false,validateBypass:false,manageCatalog:false},
  DELEGADO_JE:       {create:true, update:false,assign:false,close:false,bypass:false,viewAll:false,comment:true, instruct:false,recepcionar:false,export:false,validateBypass:false,manageCatalog:false},
  DR_EVENTUAL:       {create:true, update:true, assign:false,close:false,bypass:false,viewAll:false,comment:true, instruct:false,recepcionar:false,export:false,validateBypass:false,manageCatalog:false},
  REGISTRO_SCCE:     {create:true, update:true, assign:true, close:false,bypass:true, viewAll:true, comment:true, instruct:false,recepcionar:true, export:true, validateBypass:false,manageCatalog:false},
  JEFE_OPS:          {create:false,update:true, assign:true, close:false,bypass:false,viewAll:true, comment:true, instruct:false,recepcionar:false,export:true, validateBypass:false,manageCatalog:false},
  ENCARGADO_GASTO:   {create:false,update:false,assign:false,close:false,bypass:false,viewAll:true, comment:true, instruct:false,recepcionar:false,export:false,validateBypass:false,manageCatalog:false},
  DIRECTOR_REGIONAL: {create:true, update:true, assign:true, close:true, bypass:true, viewAll:true, comment:true, instruct:false,recepcionar:true, export:true, validateBypass:true, manageCatalog:false},
  NIVEL_CENTRAL:     {create:false,update:false,assign:false,close:false,bypass:false,viewAll:true, comment:true, instruct:true, recepcionar:false,export:true, validateBypass:false,manageCatalog:true},
  ADMIN_PILOTO:      {create:true, update:true, assign:true, close:true, bypass:true, viewAll:true, comment:true, instruct:false,recepcionar:true, export:true, validateBypass:true, manageCatalog:false},
  DR:                {create:true, update:true, assign:true, close:false,bypass:true, viewAll:true, comment:true, instruct:false,recepcionar:true, export:true, validateBypass:false,manageCatalog:false},
  EQUIPO_REGIONAL:   {create:true, update:true, assign:false,close:false,bypass:false,viewAll:true, comment:true, instruct:false,recepcionar:false,export:true, validateBypass:false,manageCatalog:false},
  NIVEL_CENTRAL_SIM: {create:false,update:false,assign:false,close:false,bypass:false,viewAll:true, comment:true, instruct:true, recepcionar:false,export:true, validateBypass:false,manageCatalog:true},
} as const;

/** Fase 3.6 — detectar si el usuario es Nivel Central (por role en USERS). */
function isNivelCentral(userId: string): boolean {
  const u = USERS.find((x) => x.id === userId);
  return (u as { role?: string } | undefined)?.role === "NIVEL_CENTRAL";
}

// =====================
// Tipado mínimo SCCE (Enterprise)
// =====================
type Role = keyof typeof POLICIES;
type PolicyAction = keyof (typeof POLICIES)[Role];

type RecLevel = "high" | "medium" | "low";

type Notification = { msg: string; type: string } | null;

type User = {
  id: string;
  name: string;
  role: Role;
  region?: string | null;
  username?: string;
  password?: string;
  commune?: string;
  assignedLocalId?: string | null;
};

type SimReport = {
  total: number;
  critica?: number;
  alta?: number;
  avgScore?: number;
  byStatus?: Partial<Record<CaseStatus, number>>;
  byCriticality?: Partial<Record<Criticality, number>>;
} | null;

type BypassCause = "" | "system_down" | "risk_imminent" | "critical_level_3" | "other";
type BypassFormState = { active: boolean; motivo: string; cause: BypassCause; confirmed: boolean };

/** Parámetros para buildNewCaseData (objeto único para cumplir S107 y facilitar extensión). */
interface BuildNewCaseDataParams {
  newCase: CaseItem;
  currentUser: User;
  evalForm: Record<string, number>;
  bypassForm: BypassFormState;
  cases: CaseItem[];
  localEntry: LocalCatalogEntry;
  now_: string;
  activeRegion: string;
}

function canDo(action: PolicyAction, user: User | null, caseObj?: CaseItem | null): boolean {
  if (!user) return false;
  const p = POLICIES[user.role];
  if (!p || !(p as Record<string, boolean>)[action]) return false;
  if (caseObj && user.role !== "NIVEL_CENTRAL") {
    if (caseObj.region && user.region && caseObj.region !== user.region) return false;
  }
  return true;
}

// Tipos mínimos para eliminar TS7006/TS7034 sin reescribir la app
type LncDraft = {
  region?: string;
  commune?: string;
  local?: string;
  origin?: { channel?: string; detectedAt?: string };
  summary?: string;
  [key: string]: unknown;
};

// ─── CATÁLOGO ────────────────────────────────────────────────────────────────
/** Crea un generador de IDs LOC-XXXX independiente (para uso en inicializadores o reset). */
function createLocalIdGenerator(): () => string {
  let n = 0;
  return () => `LOC-${String(++n).padStart(4, "0")}`;
}

function buildCatalogSeed(nextId: () => string): LocalCatalog {
  const now = new Date().toISOString();
  const entries: LocalCatalog = [];

  Object.entries(CONFIG.regions).forEach(([rc, rd]) => {
    Object.entries(rd.communes).forEach(([cc, cd]) => {
      (cd.locals || []).forEach((nombre: string) => {
        entries.push({
          idLocal: nextId(),
          nombre,
          region: rc,
          commune: cc,
          activoGlobal: true,
          activoEnEleccionActual: true,
          fechaCreacion: now,
          fechaDesactivacion: null,
          origenSeed: true,
        });
      });
    });
  });

  return entries;
}

function getActiveLocals(
  catalog: LocalCatalog,
  region: RegionCode,
  commune: CommuneCode
): LocalCatalog {
  return catalog.filter(
    (l: LocalCatalogEntry) =>
      l.region === region &&
      l.commune === commune &&
      l.activoGlobal &&
      l.activoEnEleccionActual
  );
}

function catalogSelfCheck(catalog: LocalCatalog): string[] {
  const v: string[] = [];
  catalog.forEach((l: LocalCatalogEntry) => {
    if(!l.activoGlobal&&l.activoEnEleccionActual)v.push(`[INV-1] "${l.nombre}" (${l.idLocal}): desactivado globalmente pero activo en elección.`);
    if(l.fechaDesactivacion&&l.activoGlobal)v.push(`[INV-2] "${l.nombre}" (${l.idLocal}): tiene fechaDesactivacion pero activoGlobal=true.`);
  });
  return v;
}

// ─── UTILIDADES ──────────────────────────────────────────────────────────────
function genId(region: RegionCode, commune: CommuneCode, seq: number): string {
  return `${region}-${new Date().getFullYear()}-${commune}-${String(seq).padStart(3, "0")}`;
}
function calcCriticality(ev: Record<string, number> | null | undefined) {
  const vals = Object.values(ev ?? {});
  const max = vals.length ? Math.max(...vals) : 0;
  const sum = vals.reduce((a: number, b: number) => a + b, 0);

  if(max>=3)return{criticality:"CRITICA",score:sum,recommendation:"⚠️ Escalamiento INMEDIATO al Director Regional y Nivel Central."};
  if(sum>=8) return{criticality:"ALTA",  score:sum,recommendation:"Notificar Director Regional. SLA máx. 30 min."};
  if(sum>=4) return{criticality:"MEDIA", score:sum,recommendation:"Gestionar a través de Registro SCCE. SLA máx. 60 min."};
  return          {criticality:"BAJA",  score:sum,recommendation:"Gestión local. Registrar y monitorear."};
}
function critColor(c: Criticality): string {
  const map = { CRITICA:themeColor("danger"), ALTA:themeColor("warning"), MEDIA:themeColor("warningAlt"), BAJA:themeColor("success") } as const;
  return map[c] ?? themeColor("gray");
}
function statusColor(s: CaseStatus): string {
  const map = {
    "Nuevo":themeColor("purple"),
    "Recepcionado por DR":themeColor("purpleLight"),
    "En gestión":themeColor("primary"),
    "Escalado":themeColor("danger"),
    "Mitigado":themeColor("warning"),
    "Resuelto":themeColor("success"),
    "Cerrado":themeColor("gray"),
  } as const;
  return map[s] ?? themeColor("gray");
}

type UiStatus =
  | "Nuevo"
  | "Recepcionado por DR"
  | "En gestión"
  | "Escalado"
  | "Mitigado"
  | "Resuelto"
  | "Cerrado";

const STATUS_MAP: Record<string, UiStatus> = {
  // backend / legacy
  OPEN: "Nuevo",
  NEW: "Nuevo",
  ACKED: "Recepcionado por DR",
  IN_PROGRESS: "En gestión",
  ESCALATED: "Escalado",
  MITIGATED: "Mitigado",
  RESOLVED: "Resuelto",
  CLOSED: "Cerrado",

  // ya en español (por si ya existen)
  "Nuevo": "Nuevo",
  "Recepcionado por DR": "Recepcionado por DR",
  "En gestión": "En gestión",
  "Escalado": "Escalado",
  "Mitigado": "Mitigado",
  "Resuelto": "Resuelto",
  "Cerrado": "Cerrado",
};

function normalizeStatus(s: unknown): UiStatus | "Otros / Desconocido" {
  const key =
    typeof s === "string" || typeof s === "number" || typeof s === "boolean"
      ? String(s).trim()
      : "";
  return STATUS_MAP[key] ?? "Otros / Desconocido";
}
type SeedEventInput = { type: string; at: string; actor: string; role: string; caseId?: string | null; summary: string };

function buildSeedLog(events: SeedEventInput[]): AuditLogEntry[] {
  const log: AuditLogEntry[] = [];
  for (const e of events) {
    const prevHash: string = log.at(-1)?.hash ?? "00000000";
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

const SIM_SCENARIOS=[
  {summary:"Urna sellada incorrectamente",      ev:{continuidad:1,integridad:2,seguridad:0,exposicion:1,capacidadLocal:2}},
  {summary:"Vocal no se presenta",              ev:{continuidad:2,integridad:1,seguridad:0,exposicion:1,capacidadLocal:1}},
  {summary:"Corte de luz en local",             ev:{continuidad:3,integridad:1,seguridad:2,exposicion:2,capacidadLocal:0}},
  {summary:"Discusión entre apoderados",        ev:{continuidad:0,integridad:0,seguridad:1,exposicion:2,capacidadLocal:1}},
  {summary:"Sistema de votación lento",         ev:{continuidad:1,integridad:0,seguridad:0,exposicion:0,capacidadLocal:1}},
  {summary:"Cédula de identidad vencida",       ev:{continuidad:0,integridad:2,seguridad:0,exposicion:1,capacidadLocal:1}},
  {summary:"Manifestantes frente al local",     ev:{continuidad:1,integridad:0,seguridad:2,exposicion:2,capacidadLocal:1}},
  {summary:"Mesa sin materiales",               ev:{continuidad:2,integridad:1,seguridad:0,exposicion:0,capacidadLocal:0}},
  {summary:"Periodista sin credencial",         ev:{continuidad:0,integridad:1,seguridad:0,exposicion:2,capacidadLocal:2}},
  {summary:"Amenaza de bomba",                  ev:{continuidad:3,integridad:2,seguridad:3,exposicion:3,capacidadLocal:0}},
];

// ─── SEED ────────────────────────────────────────────────────────────────────
function makeSeedCases(catalog: LocalCatalog): CaseItem[] {
  const snap=(r: RegionCode, co: CommuneCode, n: string)=>{const l=catalog.find(x=>x.region===r&&x.commune===co&&x.nombre===n);return l?{idLocal:l.idLocal,nombre:l.nombre,region:r,commune:co,snapshotAt:tsISO(95)}:null;};
  return[
    {id:genId("TRP","IQQ",1),region:"TRP",commune:"IQQ",local:"Liceo Arturo Pérez Canto",localSnapshot:snap("TRP","IQQ","Liceo Arturo Pérez Canto"),origin:{actor:"PESE Local",channel:"Teams",detectedAt:tsISO(95)},summary:"Urna sellada de forma incorrecta — sello roto en mesa 12",detail:"El vocal de mesa reporta precinto roto.",evidence:[],bypass:false,bypassFlagged:false,peseInoperante:false,evaluationLocked:true,evaluationHistory:[],evaluation:{continuidad:1,integridad:2,seguridad:0,exposicion:1,capacidadLocal:2},criticality:"MEDIA",criticalityScore:6,status:"En gestión",assignedTo:"u4",slaMinutes:60,closingMotivo:null,bypassValidated:null,timeline:[{type:"DETECTED",at:tsISO(95),actor:"u1",note:"Detectado por PESE"},{type:"REPORTED",at:tsISO(90),actor:"u1",note:"Reportado vía Teams"},{type:"RECEPCIONADO",at:tsISO(88),actor:"u4",note:"Recepcionado"},{type:"FIRST_ACTION",at:tsISO(85),actor:"u4",note:"Registro SCCE toma el caso"}],actions:[{id:"a1",action:"Instruir a vocal: fotografiar precinto.",responsible:"u4",at:tsISO(85),result:"Confirmado"}],decisions:[{who:"u4",at:tsISO(84),fundament:"Protocolo: urna con precinto dañado → preservar y fotografiar."}],completeness:90,reportedAt:tsISO(90),firstActionAt:tsISO(85),escalatedAt:null,mitigatedAt:null,resolvedAt:null,closedAt:null,createdBy:"u1",createdAt:tsISO(95),updatedAt:tsISO(85)},
    {id:genId("TRP","IQQ",2),region:"TRP",commune:"IQQ",local:"Escuela Alemania",localSnapshot:snap("TRP","IQQ","Escuela Alemania"),origin:{actor:"Delegado JE",channel:"WhatsApp",detectedAt:tsISO(130)},summary:"Vocal de mesa no se presenta — 40 min tras apertura",detail:"Mesa 5 abre con solo 2 vocales.",evidence:[],bypass:false,bypassFlagged:false,peseInoperante:false,evaluationLocked:true,evaluationHistory:[],evaluation:{continuidad:2,integridad:1,seguridad:0,exposicion:1,capacidadLocal:1},criticality:"ALTA",criticalityScore:5,status:"Resuelto",assignedTo:"u5",slaMinutes:30,closingMotivo:null,bypassValidated:null,timeline:[{type:"DETECTED",at:tsISO(130),actor:"u2",note:""},{type:"REPORTED",at:tsISO(128),actor:"u2",note:""},{type:"RECEPCIONADO",at:tsISO(125),actor:"u4",note:""},{type:"FIRST_ACTION",at:tsISO(120),actor:"u5",note:""},{type:"RESOLVED",at:tsISO(80),actor:"u5",note:"Vocal reemplazante juramentado"}],actions:[{id:"a2",action:"Contactar nómina de reemplazantes",responsible:"u5",at:tsISO(120),result:"Vocal se presenta"}],decisions:[{who:"u7",at:tsISO(119),fundament:"LOC: vocal ausente → llamar reemplazante."}],completeness:100,reportedAt:tsISO(128),firstActionAt:tsISO(120),escalatedAt:null,mitigatedAt:null,resolvedAt:tsISO(80),closedAt:null,createdBy:"u2",createdAt:tsISO(130),updatedAt:tsISO(80)},
    {id:genId("TRP","ALH",3),region:"TRP",commune:"ALH",local:"Liceo Altiplano",localSnapshot:snap("TRP","ALH","Liceo Altiplano"),origin:{actor:"DR Eventual",channel:"Teléfono",detectedAt:tsISO(200)},summary:"CRÍTICO: Corte de luz total en local de votación",detail:"8 mesas afectadas.",evidence:["Foto confirmada"],bypass:true,bypassMotivo:"Riesgo inminente — continuidad=3",bypassActor:"u7",bypassFlagged:false,peseInoperante:false,evaluationLocked:true,evaluationHistory:[],evaluation:{continuidad:3,integridad:1,seguridad:2,exposicion:2,capacidadLocal:0},criticality:"CRITICA",criticalityScore:8,status:"Escalado",assignedTo:"u7",slaMinutes:15,closingMotivo:null,bypassValidated:null,timeline:[{type:"DETECTED",at:tsISO(200),actor:"u3",note:""},{type:"BYPASS",at:tsISO(198),actor:"u7",note:"Bypass: continuidad=3"},{type:"ESCALATED",at:tsISO(195),actor:"u7",note:"Escalado a Nivel Central"}],actions:[{id:"a3",action:"Contactar empresa eléctrica. Solicitar grupo electrógeno.",responsible:"u7",at:tsISO(195),result:"En gestión"}],decisions:[{who:"u7",at:tsISO(196),fundament:"Nivel 3 en continuidad → escalar inmediatamente."}],completeness:80,reportedAt:tsISO(198),firstActionAt:tsISO(195),escalatedAt:tsISO(195),mitigatedAt:null,resolvedAt:null,closedAt:null,createdBy:"u3",createdAt:tsISO(200),updatedAt:tsISO(195)},
  ];
}
function makeSeedAudit(){
  return buildSeedLog([
    {type:"LOGIN",       at:tsISO(210),actor:"u7",role:"DIRECTOR_REGIONAL",caseId:null,               summary:"Inicio de sesión"},
    {type:"LOGIN",       at:tsISO(209),actor:"u4",role:"REGISTRO_SCCE",    caseId:null,               summary:"Inicio de sesión"},
    {type:"CASE_CREATED",at:tsISO(200),actor:"u3",role:"DR_EVENTUAL",      caseId:genId("TRP","ALH",3),summary:"Caso: corte de luz"},
    {type:"BYPASS_USED", at:tsISO(198),actor:"u7",role:"DIRECTOR_REGIONAL",caseId:genId("TRP","ALH",3),summary:"Bypass: continuidad=3"},
    {type:"ESCALATED",   at:tsISO(195),actor:"u7",role:"DIRECTOR_REGIONAL",caseId:genId("TRP","ALH",3),summary:"Escalado a Nivel Central"},
    {type:"CASE_CREATED",at:tsISO(130),actor:"u2",role:"DELEGADO_JE",      caseId:genId("TRP","IQQ",2),summary:"Caso: vocal ausente"},
    {type:"CASE_CREATED",at:tsISO(95), actor:"u1",role:"PESE",             caseId:genId("TRP","IQQ",1),summary:"Caso: urna precinto"},
  ]);
}

// ─── ESTILOS (tema claro profesional) ─────────────────────────────────────────
const S={
  app:{fontFamily:"'Segoe UI',system-ui,sans-serif",background:themeColor("bgApp"),color:themeColor("textPrimary"),minHeight:"100vh",fontSize:"13px",width:"100%",boxSizing:"border-box" as const},
  nav:{background:themeColor("bgSurface"),borderBottom:"1px solid #e5e7eb",padding:"8px 16px",display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap" as const,minHeight:42},
  nBtn:(a: boolean)=>({background:a?themeColor("primary"):"transparent",color:a?themeColor("white"):themeColor("textSecondary"),border:"none",padding:"5px 10px",borderRadius:"4px",cursor:"pointer",fontSize:"12px"}),
  card:{background:themeColor("bgSurface"),border:"1px solid #e5e7eb",borderRadius:"6px",padding:"12px"},
  badge:(color: string)=>({background:color+"22",color,border:"1px solid "+color+"44",borderRadius:"3px",padding:"2px 6px",fontSize:"11px",fontWeight:600}),
  btn:(v="primary")=>({background:{primary:themeColor("primary"),success:themeColor("success"),danger:themeColor("danger"),warning:themeColor("warning"),dark:themeColor("textSecondary")}[v]||themeColor("primary"),color:themeColor("white"),border:"none",padding:"6px 12px",borderRadius:"4px",cursor:"pointer",fontSize:"12px",fontWeight:500}),
  inp:{background:themeColor("bgSurface"),border:"1px solid #e5e7eb",borderRadius:"4px",padding:"6px 8px",color:themeColor("textPrimary"),fontSize:"13px",width:"100%",boxSizing:"border-box"} as React.CSSProperties,
  lbl:{display:"block",marginBottom:"3px",color:themeColor("textSecondary"),fontSize:"11px",fontWeight:600,textTransform:"uppercase"} as React.CSSProperties,
  g2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"},
  g4:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px"},
};

function OpHome({ onNew }: Readonly<{ onNew: () => void }>) {
  return (
    <div>
      <div style={{ ...S.card, marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
          Respuestas recibidas
        </div>
        <div style={{ color: themeColor("mutedAlt"), fontSize: 12, marginBottom: 8 }}>
          Sin respuestas nuevas.
        </div>
        <button type="button" style={S.btn("primary")} onClick={onNew}>
          Nuevo caso
        </button>
      </div>
    </div>
  );
}

function ClosedOverlay() {
  return (
    <div style={{position:"absolute",inset:0,background:"rgba(15,17,23,.28)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"6px"}}>
      <div style={{background:themeColor("bgSurface"),border:`1px solid ${themeColor("border")}`,borderRadius:"6px",padding:"14px 24px",textAlign:"center",boxShadow:"0 2px 12px rgba(0,0,0,.12)"}}>
        <div style={{fontWeight:700,color:themeColor("textPrimary")}}>🔒 REGISTRO CERRADO</div>
        <div style={{fontSize:"11px",color:themeColor("textSecondary"),marginTop:3}}>Solo lectura</div>
      </div>
    </div>
  );
}

function SlaBadge({ c }: Readonly<{ c: CaseItem }>) {
  return isSlaVencido(c) ? (
    <Badge style={{ ...S.badge(themeColor("danger")) }} size="xs">
      SLA VENCIDO
    </Badge>
  ) : null;
}

function RecBadge({
  c,
  variant = "FULL",
}: Readonly<{
  c: CaseItem;
  variant?: "FULL" | "OP";
}>) {
  const rec = getRecommendation(c, variant);
  const showTip = variant === "FULL";

  const badgeEl = (
    <Badge
      style={{
        ...S.badge(recColor(rec.level as RecLevel)),
        cursor: showTip ? "help" : "default",
      }}
      size="xs"
    >
      {rec.icon} {rec.label}
    </Badge>
  );

  if (!showTip) return badgeEl;

  return (
    <Tooltip
      placement="bottom-start"
      maxWidth={280}
      panelStyle={{
        background: themeColor("bgSurface"),
        color: themeColor("textPrimary"),
        border: "1px solid #e5e7eb",
      }}
      content={
        <div>
          <div style={{ fontWeight: 800, marginBottom: 4, color: themeColor("white") }}>
            {rec.text}
          </div>
          <div style={{ color: themeColor("mutedAlt") }}>{rec.reason}</div>
        </div>
      }
    >
      {badgeEl}
    </Tooltip>
  );
}

// Paso 3 (Detalles) como componente estable: evita remount del textarea al tipear.
type DetailStepContentRef = { getDetail: () => string };
type DetailStepContentProps = {
  initialDetail: string;
  newCase: CaseItem | null;
  setNewCase: React.Dispatch<React.SetStateAction<CaseItem | null>>;
  onConfirm: () => void;
  onBack: () => void;
};
const DetailStepContent = forwardRef<DetailStepContentRef, DetailStepContentProps>(function DetailStepContent(
  { initialDetail, newCase, setNewCase, onConfirm, onBack },
  ref
) {
  const [detail, setDetail] = useState(initialDetail);
  useEffect(() => {
    setDetail(initialDetail);
  }, [initialDetail]);
  useImperativeHandle(ref, () => ({
    getDetail: () => detail,
  }), [detail]);
  return (
    <div style={S.card}>
      <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 10 }}>PASO 3 — DETALLES</div>
      <div style={{ marginBottom: 8 }}>
        <label style={S.lbl} htmlFor="case-detail-textarea">Detalle</label>
        <textarea
          id="case-detail-textarea"
          style={{ ...S.inp, height: 70, resize: "vertical" }}
          placeholder="Describe el incidente..."
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
        />
      </div>
      <div>
        <label style={S.lbl} htmlFor="case-evidence-input">Evidencia (Enter para agregar)</label>
        <input
          id="case-evidence-input"
          style={S.inp}
          placeholder="URL o descripción"
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            const target = e.currentTarget;
            if (e.key === "Enter" && target.value) {
              const val = target.value;
              setNewCase((p) => (p ? { ...p, detail, evidence: [...(Array.isArray(p.evidence) ? p.evidence : []), val] } : p));
              target.value = "";
            }
          }}
        />
        {(newCase?.evidence || []).map((ev) => (
          <div key={ev} style={{ fontSize: "11px", color: themeColor("mutedAlt"), marginTop: 2 }}>📎 {ev}</div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <button style={S.btn("dark")} type="button" onClick={onBack}>← Atrás</button>
        <button style={S.btn("primary")} type="button" onClick={onConfirm}>Confirmar →</button>
      </div>
    </div>
  );
});

// ─── Helpers para reducir complejidad cognitiva de App (S3776) ─────────────────
type RegionOption = { code: string; name: string };
type MembershipScopesMap = Record<string, { regionScopeMode: "ALL" | "LIST"; regionScope: string[]; regionCode?: string | null }>;

function getRegionOptions(
  isCentral: boolean,
  effectiveMembership: Membership | null,
  membershipScopes: MembershipScopesMap,
  regionsConfig: Record<string, { name?: string }>
): RegionOption[] {
  const entriesAll = Object.entries(regionsConfig).map(([code, d]) => ({
    code,
    name: d.name ?? code,
  }));
  if (isCentral) {
    return [{ code: "ALL", name: "Todas las regiones" }, ...entriesAll];
  }
  const mid = effectiveMembership?.id;
  const mode =
    effectiveMembership?.regionScopeMode ??
    (mid ? membershipScopes[mid]?.regionScopeMode : undefined);
  const scope =
    effectiveMembership?.regionScope ??
    (mid ? membershipScopes[mid]?.regionScope : undefined);
  if (mode === "LIST" && Array.isArray(scope) && scope.length) {
    const allowed = new Set(scope);
    return entriesAll.filter((e) => allowed.has(e.code));
  }
  const rc =
    effectiveMembership?.regionCode ??
    (mid ? membershipScopes[mid]?.regionCode : undefined);
  if (rc) return entriesAll.filter((e) => e.code === rc);
  return entriesAll;
}

function downloadJson(filename: string, jsonText: string) {
  const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Intenta firmar el bundle con la llave existente. Devuelve true si se firmó. */
async function trySignWithExistingKey(
  bundle: ExportBundle,
  notify: (msg: string, type: string) => void
): Promise<boolean> {
  const passphrase = globalThis.prompt(
    UI_TEXT.misc.signPassphrasePrompt ?? "Ingrese passphrase para firmar el export:"
  );
  if (!passphrase?.trim()) {
    notify(
      UI_TEXT.misc.exportUnsignedWarning ?? "Export sin firma (no se ingresó passphrase).",
      "warning"
    );
    return false;
  }
  try {
    const sig = await signIntegrityHashHex({
      passphrase: passphrase.trim(),
      hashHex: bundle.integrity!.value,
    });
    bundle.signature = {
      algo: "Ed25519",
      publicKeyB64: sig.publicKeyB64,
      valueB64: sig.signatureB64,
      signedAt: sig.signedAt,
    };
    return true;
  } catch {
    notify(
      UI_TEXT.errors.signFailed ??
        "No se pudo firmar (passphrase incorrecta o llave inválida). Se exportará sin firma.",
      "error"
    );
    return false;
  }
}

/** Ofrece crear llave de firma si no existe; notifica resultado. */
async function offerCreateSigningKey(notify: (msg: string, type: string) => void): Promise<void> {
  const wants = globalThis.confirm(
    UI_TEXT.misc.noSigningKeyConfirm ??
      "No hay llave de firma configurada. ¿Deseas crear una ahora (recomendado)?"
  );
  if (!wants) return;

  const p1 = globalThis.prompt(
    UI_TEXT.misc.signCreatePassphrase1 ?? "Crea una passphrase (guárdala):"
  );
  if (!p1?.trim()) return;

  const p2 = globalThis.prompt(UI_TEXT.misc.signCreatePassphrase2 ?? "Repite la passphrase:");
  if (p2 !== p1) {
    notify(
      UI_TEXT.errors.signPassphraseMismatch ??
        "Las passphrases no coinciden. Export se hará sin firma.",
      "error"
    );
    return;
  }
  try {
    await initSigningKey(p1);
    notify(
      UI_TEXT.misc.signKeyCreated ?? "Llave creada. Reintenta Exportar para firmar.",
      "success"
    );
  } catch {
    notify(
      UI_TEXT.errors.signKeyCreateFailed ?? "No se pudo crear la llave de firma.",
      "error"
    );
  }
}

type ExportStateOptions = {
  cases: CaseItem[];
  setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  currentUser: User | null;
  notify: (msg: string, type: string) => void;
};

async function handleExportState(opts: ExportStateOptions): Promise<void> {
  const { cases, setAuditLog, currentUser, notify } = opts;
  const bundle = await buildExportBundle(cases, APP_VERSION);
  let signed = false;

  if (await hasSigningKey()) {
    signed = await trySignWithExistingKey(bundle, notify);
  } else {
    await offerCreateSigningKey(notify);
    notify(
      UI_TEXT.misc.exportUnsignedWarning ?? "Export sin firma (no hay llave configurada).",
      "warning"
    );
  }

  const text = JSON.stringify(bundle, null, 2);
  const name = `SCCE_APP_export_${new Date().toISOString().replaceAll(":", "-")}.json`;
  downloadJson(name, text);

  if (currentUser?.id) {
    setAuditLog((prev) =>
      appendEvent(
        prev,
        "EXPORT_DONE",
        currentUser.id,
        currentUser.role,
        null,
        signed ? "Export estado v3 (firmado)" : "Export estado v3 (sin firma)"
      )
    );
  }

  notify(UI_TEXT.misc.exportOk ?? "Export listo.", "success");
}

type ImportStateOptions = {
  setCases: React.Dispatch<React.SetStateAction<CaseItem[]>>;
  setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  currentUser: User | null;
  notify: (msg: string, type: string) => void;
};

const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 5 MB

function getImportFailureEventType(error: string): string {
  if (error.includes("Firma inválida")) return "IMPORT_SIG_INVALID_BLOCKED";
  if (error.includes("Integridad fallida")) return "IMPORT_INTEGRITY_FAILED_BLOCKED";
  return "IMPORT_FAILED";
}

function appendImportAudit(
  setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>,
  currentUser: User | null,
  evType: string,
  detail: string
): void {
  if (!currentUser?.id) return;
  setAuditLog((prev) =>
    appendEvent(prev, evType, currentUser.id, currentUser.role, null, detail)
  );
}

type ImportSignatureAuditOpts = Pick<ImportStateOptions, "setAuditLog" | "currentUser" | "notify">;

async function handleImportSignatureStatus(
  signatureStatus: string,
  opts: ImportSignatureAuditOpts,
  fpForAudit: string
): Promise<boolean> {
  if (signatureStatus === "none") {
    opts.notify(
      UI_TEXT.misc.importUnsignedWarning ??
        "Import sin firma: permitido, pero no hay garantía de autoría.",
      "warning"
    );
    appendImportAudit(opts.setAuditLog, opts.currentUser, "IMPORT_SIG_NONE_ALLOWED", "Import sin firma permitido");
    return true;
  }
  if (signatureStatus === "valid_untrusted") {
    const confirmWord = UI_TEXT.misc.trustConfirmWord ?? "CONFIAR";
    const typed = globalThis.prompt(
      UI_TEXT.misc.importUntrustedTypeToConfirm ??
        "Firma válida, pero no confiable. Para continuar escribe CONFIAR:"
    );
    if (typed?.trim() !== confirmWord) {
      opts.notify(
        UI_TEXT.errors.importUntrustedConfirmFailed ?? "No se confirmó la confianza. Import cancelado.",
        "error"
      );
      appendImportAudit(
        opts.setAuditLog,
        opts.currentUser,
        "IMPORT_SIG_VALID_UNTRUSTED_REJECTED",
        fpForAudit ? `Rechazado – huella ${fpForAudit}` : "Rechazado"
      );
      return false;
    }
    appendImportAudit(
      opts.setAuditLog,
      opts.currentUser,
      "IMPORT_SIG_VALID_UNTRUSTED_ACCEPTED",
      fpForAudit ? `Aceptado – huella ${fpForAudit}` : "Aceptado"
    );
    return true;
  }
  opts.notify(
    UI_TEXT.misc.importSignedTrustedOk ?? "Import con autoría verificada (confiable).",
    "success"
  );
  appendImportAudit(
    opts.setAuditLog,
    opts.currentUser,
    "IMPORT_SIG_VALID_TRUSTED",
    fpForAudit ? `Import confiable – huella ${fpForAudit}` : "Import confiable"
  );
  return true;
}

async function handleImportStateFile(opts: ImportStateOptions, file: File): Promise<void> {
  const { setCases, setAuditLog, currentUser, notify } = opts;
  if (file.size > MAX_IMPORT_BYTES) {
    notify((UI_TEXT.errors.importFileTooLarge ?? "Archivo demasiado grande (máx. {maxMb} MB).").replace("{maxMb}", String(MAX_IMPORT_BYTES / (1024 * 1024))), "error");
    return;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    notify(UI_TEXT.errors.importInvalidJson ?? "Archivo no es JSON válido.", "error");
    return;
  }
  const v = await validateImportBundle(raw);
  if (!v.ok) {
    notify(v.error, "error");
    appendImportAudit(setAuditLog, currentUser, getImportFailureEventType(v.error), v.error.slice(0, 80));
    return;
  }

  const signerPub = (raw as { signature?: { publicKeyB64: string } })?.signature?.publicKeyB64 ?? "";
  const fpForAudit = signerPub ? await publicKeyFingerprintShort(signerPub) : "";

  const mayContinue = await handleImportSignatureStatus(v.signatureStatus, opts, fpForAudit);
  if (!mayContinue) return;

  const ok = globalThis.confirm(
    UI_TEXT.misc.importConfirm ?? "Esto reemplazará los casos actuales. ¿Continuar?"
  );
  if (!ok) return;
  setCases(v.cases);
  notify(UI_TEXT.misc.importOk ?? "Import realizado.", "success");
}

type BootstrapSessionOptions = {
  setAuthToken: React.Dispatch<React.SetStateAction<string | null>>;
  setApiUser: React.Dispatch<React.SetStateAction<ApiUser | null>>;
  setMemberships: React.Dispatch<React.SetStateAction<Membership[]>>;
  setActiveMembership: React.Dispatch<React.SetStateAction<Membership | null>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  setLoginErr: React.Dispatch<React.SetStateAction<string>>;
  setMembershipScopes: React.Dispatch<React.SetStateAction<MembershipScopesMap>>;
  setCtxErr: React.Dispatch<React.SetStateAction<string>>;
  setCases: React.Dispatch<React.SetStateAction<CaseItem[]>>;
  setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
};

type MeMembership = { id: string; regionCode?: string | null; regionScopeMode?: string; regionScope?: string[] };

function clearSessionAndSetLoginError(opts: BootstrapSessionOptions): void {
  clearSession();
  opts.setAuthToken(null);
  opts.setApiUser(null);
  opts.setMemberships([]);
  opts.setActiveMembership(null);
  opts.setCurrentUser(null);
  opts.setLoginErr("Sesión inválida o expirada. Inicia sesión nuevamente.");
}

function buildMembershipScopesMap(memberships: MeMembership[]): MembershipScopesMap {
  const map: MembershipScopesMap = {};
  for (const m of memberships) {
    map[m.id] = {
      regionScopeMode: m.regionScopeMode === "ALL" ? "ALL" : "LIST",
      regionScope: Array.isArray(m.regionScope) ? m.regionScope : [],
      regionCode: m.regionCode ?? null,
    };
  }
  return map;
}

function ensureActiveMembershipFromList(list: Membership[], opts: BootstrapSessionOptions): void {
  const adm = list.find((m) => m.regionCode === "ADM");
  const pick = adm ?? (list.length === 1 ? list[0] : list[0] ?? null);
  if (pick) {
    setActiveMembership(pick);
    opts.setActiveMembership(pick);
  }
}

type RawCaseFromApi = {
  regionCode?: string;
  communeCode?: string;
  localCode?: string;
  createdByUserId?: string;
  region?: string;
  commune?: string;
  local?: string;
  createdBy?: string;
  [key: string]: unknown;
};

function mapRawCaseToCaseItem(c: RawCaseFromApi): CaseItem {
  return {
    ...c,
    region: c.region ?? c.regionCode ?? "",
    commune: c.commune ?? c.communeCode ?? "",
    local: c.local ?? c.localCode,
    createdBy: c.createdBy ?? c.createdByUserId,
  } as CaseItem;
}

async function loadCasesForMembership(
  token: string,
  membership: Membership,
  opts: BootstrapSessionOptions
): Promise<void> {
  const headers: Record<string, string> = {};
  if (membership.id) headers["x-scce-membership-id"] = membership.id;
  if (membership.contextType && membership.contextId) {
    headers["x-scce-context-type"] = membership.contextType;
    headers["x-scce-context-id"] = membership.contextId;
  }
  const res = await apiRequest<unknown>("/cases", {
    token,
    method: "GET",
    headers: Object.keys(headers).length ? headers : undefined,
  });
  if (!res.ok || !Array.isArray(res.data)) return;
  const raw = res.data as RawCaseFromApi[];
  const incoming = raw.map(mapRawCaseToCaseItem);
  opts.setCases((prev) =>
    incoming.map((nextCase) => {
      const prevCase = prev.find((c) => c.id === nextCase.id);
      if (!prevCase) return nextCase;
      return {
        ...nextCase,
        actions: prevCase.actions ?? nextCase.actions,
        timeline: prevCase.timeline ?? nextCase.timeline,
        decisions: prevCase.decisions ?? nextCase.decisions,
      };
    })
  );
}

type ApiEvent = { id: string; eventType: string; payloadJson: Record<string, unknown>; createdAt: string; actorId: string };

function eventSummaryFromPayload(eventType: string, payloadJson: Record<string, unknown>): string {
  const p = payloadJson ?? {};
  if (eventType === "ACTION_ADDED") return (p.action as string) ?? eventType;
  if (eventType === "DECISION_ADDED") return (p.fundament as string) ?? eventType;
  if (eventType === "COMMENT_ADDED" || eventType === "INSTRUCTION_CREATED") return (p.note as string) ?? (p.comment as string) ?? eventType;
  if (eventType === "CASE_CLOSED") return (p.reason as string) ?? eventType;
  if (eventType === "OPERATIONAL_VALIDATION") return [p.result, p.note].filter(Boolean).map(String).join(" — ") || eventType;
  if (eventType === "ASSIGNMENT_CHANGED") return (p.assignedTo as string) ? `Asignado a ${p.assignedTo}` : eventType;
  return eventType;
}

function membershipToRequestHeaders(membership: Membership): Record<string, string> {
  const headers: Record<string, string> = {};
  if (membership.id) headers["x-scce-membership-id"] = membership.id;
  if (membership.contextType && membership.contextId) {
    headers["x-scce-context-type"] = membership.contextType;
    headers["x-scce-context-id"] = membership.contextId;
  }
  return headers;
}

function eventCreatedAtIso(e: ApiEvent): string {
  if (typeof e.createdAt === "string") return e.createdAt;
  if (e.createdAt) return new Date(e.createdAt).toISOString();
  return "";
}

function apiEventToAuditEntry(e: ApiEvent, caseId: string): Omit<AuditLogEntry, "prevHash" | "hash"> {
  const at = eventCreatedAtIso(e);
  const summary = eventSummaryFromPayload(e.eventType, e.payloadJson ?? {});
  return {
    eventId: e.id,
    type: e.eventType,
    at,
    actor: e.actorId ?? "api",
    role: "API",
    caseId,
    summary: summary.slice(0, 200),
  };
}

function compareAt(a: { at: string }, b: { at: string }): number {
  if (a.at < b.at) return -1;
  if (a.at > b.at) return 1;
  return 0;
}

function sortAndChainAuditEntries(entries: Omit<AuditLogEntry, "prevHash" | "hash">[]): AuditLogEntry[] {
  const sorted = [...entries].sort(compareAt);
  const log: AuditLogEntry[] = [];
  let prevHash = "00000000";
  for (const entry of sorted) {
    const ev: AuditLogEntry = { ...entry, prevHash, hash: "" };
    ev.hash = chainHash(prevHash, ev);
    prevHash = ev.hash;
    log.push(ev);
  }
  return log;
}

type CasesEventsOpts = { token: string; method: "GET"; headers?: Record<string, string> };

async function collectAuditEntriesFromCases(
  cases: RawCaseFromApi[],
  opts: CasesEventsOpts
): Promise<Omit<AuditLogEntry, "prevHash" | "hash">[]> {
  const allEntries: Omit<AuditLogEntry, "prevHash" | "hash">[] = [];
  for (const c of cases) {
    const caseId = (c as { id?: string }).id;
    if (!caseId) continue;
    const eventsRes = await apiRequest<ApiEvent[]>(`/cases/${caseId}/events`, opts);
    if (!eventsRes.ok || !Array.isArray(eventsRes.data)) continue;
    for (const e of eventsRes.data) {
      allEntries.push(apiEventToAuditEntry(e, caseId));
    }
  }
  return allEntries;
}

async function loadAuditLogFromApi(token: string, membership: Membership): Promise<AuditLogEntry[]> {
  const headers = membershipToRequestHeaders(membership);
  const opts: CasesEventsOpts = { token, method: "GET", headers: Object.keys(headers).length ? headers : undefined };

  const casesRes = await apiRequest<unknown>("/cases", opts);
  if (!casesRes.ok || !Array.isArray(casesRes.data)) return [];
  const cases = casesRes.data as RawCaseFromApi[];

  const allEntries = await collectAuditEntriesFromCases(cases, opts);
  return sortAndChainAuditEntries(allEntries);
}

async function bootstrapSession(token: string, opts: BootstrapSessionOptions): Promise<void> {
  const meRes = await apiRequest<{ user: ApiUser; memberships?: MeMembership[] }>("/me", { token });
  console.log("ME (crudo):", meRes);
  const meMembershipsForLog = meRes.ok ? (meRes.data.memberships ?? []) : [];
  console.log(
    "ME memberships resumido:",
    meMembershipsForLog.map((m: MeMembership) => ({ id: m.id, regionCode: m.regionCode, regionScopeMode: m.regionScopeMode, regionScope: m.regionScope }))
  );

  if (!meRes.ok) {
    clearSessionAndSetLoginError(opts);
    return;
  }

  opts.setApiUser(meRes.data.user);
  if (meRes.data.memberships?.length) {
    opts.setMembershipScopes(buildMembershipScopesMap(meRes.data.memberships));
  }

  const ctxRes = await apiRequest<{ memberships: Membership[] }>("/contexts", { token });
  if (!ctxRes.ok) {
    opts.setCtxErr(ctxRes.error || "No se pudo cargar contextos.");
    opts.setMemberships([]);
    return;
  }

  opts.setCtxErr("");
  opts.setMemberships(ctxRes.data.memberships || []);

  if (!getActiveMembership()) {
    ensureActiveMembershipFromList(ctxRes.data.memberships || [], opts);
  }

  const effectiveMembership = getActiveMembership();
  if (token && effectiveMembership) {
    await loadCasesForMembership(token, effectiveMembership, opts);
    const realAuditLog = await loadAuditLogFromApi(token, effectiveMembership);
    opts.setAuditLog(realAuditLog);
  }
}

// ─── Hooks y helpers para reducir complejidad cognitiva de App (S3776) ─────────
type GoToSectionFn = (nextView: ViewKey, sectionId: string) => void;

function createAppKeydownHandler(goToSection: GoToSectionFn) {
  return function onKey(e: KeyboardEvent) {
    const isCtrl = e.ctrlKey || e.metaKey;
    if (!isCtrl) return;
    const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    if (e.key.toLowerCase() === "e") {
      e.preventDefault();
      goToSection("reports", "reports-export");
    }
    if (e.key.toLowerCase() === "i") {
      e.preventDefault();
      goToSection("reports", "reports-export");
    }
    if (e.shiftKey && e.key.toLowerCase() === "r") {
      e.preventDefault();
      goToSection("config", "config-reset");
    }
  };
}

function useKeyboardShortcuts(goToSection: GoToSectionFn) {
  useEffect(() => {
    const onKey = createAppKeydownHandler(goToSection);
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, [goToSection]);
}

type UiMode = "OP" | "FULL";
function uiModeStorageKey(userId: string) {
  return `SCCE_UI_MODE:${userId}`;
}

function useUiModeFromStorage(
  currentUser: User | null,
  defaultUiModeForUser: (u: User | null) => UiMode,
  setUiMode: React.Dispatch<React.SetStateAction<UiMode>>
) {
  useEffect(() => {
    if (!currentUser) {
      setUiMode("FULL");
      return;
    }
    const key = uiModeStorageKey(currentUser.id);
    const saved = localStorage.getItem(key);
    if (saved === "OP" || saved === "FULL") {
      setUiMode(saved);
    } else {
      setUiMode(defaultUiModeForUser(currentUser));
    }
  }, [currentUser, defaultUiModeForUser, setUiMode]);
}

function useTerrainShellRedirect(
  showTerrainShell: boolean,
  view: ViewKey,
  setView: React.Dispatch<React.SetStateAction<ViewKey>>,
  opHomeView: string
) {
  useEffect(() => {
    if (!showTerrainShell) return;
    if (view === "dashboard") setView(opHomeView as ViewKey);
  }, [showTerrainShell, view, setView, opHomeView]);
}

function useActionsMenuCloseOutside(actionsOpen: boolean, setActionsOpen: React.Dispatch<React.SetStateAction<boolean>>) {
  useEffect(() => {
    if (!actionsOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.closest?.("[data-actions-menu]")) return;
      setActionsOpen(false);
    };
    globalThis.addEventListener("mousedown", onDown);
    return () => globalThis.removeEventListener("mousedown", onDown);
  }, [actionsOpen, setActionsOpen]);
}

function withBusyImpl(
  key: string,
  fn: () => void,
  busyAction: Record<string, boolean>,
  setBusyAction: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
) {
  if (busyAction[key]) return;
  setBusyAction((prev) => ({ ...prev, [key]: true }));
  try {
    fn();
  } finally {
    setTimeout(() => setBusyAction((prev) => ({ ...prev, [key]: false })), 350);
  }
}

export type AppFilterState = { criticality: string; status: string; commune: string; search: string; region: string };

type SessionEffectsOpts = {
  authToken: string | null;
  apiUser: ApiUser | null;
  memberships: Membership[];
  activeMembership: Membership | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  isCentral: boolean;
  justBecameCentralRef: React.RefObject<boolean>;
  activeRegion: string;
  setActiveRegion: React.Dispatch<React.SetStateAction<string>>;
  setFilterState: React.Dispatch<React.SetStateAction<AppFilterState>>;
  effectiveMembership: Membership | null;
  membershipScopes: MembershipScopesMap;
  bootstrapOpts: BootstrapSessionOptions;
};

function useAppSessionEffects(opts: SessionEffectsOpts) {
  const {
    authToken,
    apiUser,
    memberships,
    activeMembership,
    setCurrentUser,
    isCentral,
    justBecameCentralRef,
    activeRegion,
    setActiveRegion,
    setFilterState,
    effectiveMembership,
    membershipScopes,
    bootstrapOpts,
  } = opts;

  useEffect(() => {
    if (!authToken) return;
    if (apiUser && memberships.length) return;
    bootstrapSession(authToken, bootstrapOpts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  useEffect(() => {
    if (!apiUser || !activeMembership) return;
    const u: User = {
      id: apiUser.id,
      username: apiUser.email,
      name: apiUser.email,
      role: activeMembership.role,
      region: null,
      commune: undefined,
      password: "",
    };
    setCurrentUser(u);
  }, [apiUser, activeMembership, setCurrentUser]);

  useEffect(() => {
    if (isCentral && !justBecameCentralRef.current) {
      justBecameCentralRef.current = true;
      setActiveRegion("ALL");
    }
    if (!isCentral) {
      justBecameCentralRef.current = false;
      if (activeRegion === "ALL") setActiveRegion(DEFAULT_REGION);
    }
    // justBecameCentralRef is a ref (stable identity), intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCentral, activeRegion, setActiveRegion]);

  useEffect(() => {
    if (isCentral) return;
    const mid = effectiveMembership?.id;
    if (!mid) return;
    const scope = membershipScopes[mid];
    if (scope?.regionScopeMode !== "LIST") return;
    const allowed = scope.regionScope || [];
    if (!allowed.length) return;
    if (!allowed.includes(activeRegion)) {
      setActiveRegion(allowed[0]);
      setFilterState((p) => ({ ...p, commune: "" }));
    }
  }, [isCentral, effectiveMembership?.id, membershipScopes, activeRegion, setActiveRegion, setFilterState]);

  useEffect(() => {
    if (!isCentral && activeRegion && activeRegion !== "ALL") {
      setFilterState((prev) => {
        if (prev.region === activeRegion) return prev;
        return { ...prev, region: activeRegion, commune: "" };
      });
    }
  }, [isCentral, activeRegion, setFilterState]);
}

/** Resultado exitoso de validación de nuevo caso (para envío). */
type ValidateNewCaseSuccess = {
  ok: true;
  regionSel: string;
  communeSel: string;
  localName: string;
  localEntry: LocalCatalogEntry;
  now_: string;
};

function validateNewCaseCommuneAndRegion(
  regionSel: string,
  communeSel: string,
  localCatalog: LocalCatalog
): string | null {
  if (!communeSel) return "⚠️ Debes seleccionar una comuna.";
  const communesInRegion = [...new Set(localCatalog.filter((e) => e.region === regionSel).map((e) => e.commune))];
  if (!communesInRegion.length) return "⚠️ Catálogo de locales no disponible para la región seleccionada.";
  if (!communesInRegion.includes(communeSel)) return "⚠️ La comuna seleccionada no corresponde a la región indicada.";
  return null;
}

function validateNewCaseLocalName(localName: string): string | null {
  if (!localName) return "⚠️ Debes seleccionar un local de votación.";
  return null;
}

function validateNewCaseDetectedAt(newCase: CaseItem): string | null {
  const detectedAt = newCase.origin?.detectedAt;
  if (!detectedAt) return "⚠️ Falta la hora de detección del incidente.";
  if (!Number.isFinite(new Date(detectedAt).getTime())) return "⚠️ Hora de detección inválida.";
  if (isDetectedAtInFuture(detectedAt)) return "⚠️ La hora de detección no puede estar en el futuro (se permite hasta 5 min por desfase de reloj).";
  return null;
}

function validateNewCaseLocalEntry(
  localCatalog: LocalCatalog,
  regionSel: string,
  communeSel: string,
  localName: string
): { error: string } | { localEntry: LocalCatalogEntry } {
  const localEntry = findActiveLocal(localCatalog, regionSel, communeSel, localName);
  if (!localEntry) return { error: "⚠️ El local seleccionado no existe o no está activo en el catálogo maestro." };
  if (localEntry.region !== regionSel || localEntry.commune !== communeSel) return { error: "⚠️ El local seleccionado no corresponde a la comuna/región indicada." };
  return { localEntry };
}

function validateNewCaseUserScope(
  regionSel: string,
  communeSel: string,
  localEntry: LocalCatalogEntry,
  currentUser: User,
  assignedCommuneEffective: string | undefined | null,
  assignedLocalIdEffective: string | undefined | null
): string | null {
  if (currentUser.region && regionSel !== currentUser.region) return "⚠️ No puedes registrar incidentes fuera de tu región autorizada.";
  if (assignedCommuneEffective && communeSel !== assignedCommuneEffective) return "⚠️ No puedes registrar incidentes fuera de tu comuna autorizada.";
  if (assignedLocalIdEffective && localEntry.idLocal !== assignedLocalIdEffective) return "⚠️ No puedes registrar incidentes fuera de tu local autorizado.";
  return null;
}

/** Validación operativa para envío de nuevo caso. Devuelve error o datos listos para continuar. */
function validateNewCaseForSubmit(
  newCase: CaseItem,
  localCatalog: LocalCatalog,
  currentUser: User,
  assignedCommuneEffective: string | undefined | null,
  assignedLocalIdEffective: string | undefined | null
): { error: string } | ValidateNewCaseSuccess {
  const regionSel = (newCase.region ?? "").trim();
  const communeSel = (newCase.commune ?? "").trim();
  const communeForCatalog = getInternalCommuneForCatalog(regionSel, communeSel) || communeSel;
  const localName = (newCase.local ?? "").trim();

  const errCommune = validateNewCaseCommuneAndRegion(regionSel, communeForCatalog, localCatalog);
  if (errCommune) return { error: errCommune };

  const errLocal = validateNewCaseLocalName(localName);
  if (errLocal) return { error: errLocal };

  const errDetected = validateNewCaseDetectedAt(newCase);
  if (errDetected) return { error: errDetected };

  const localResult = validateNewCaseLocalEntry(localCatalog, regionSel, communeForCatalog, localName);
  if ("error" in localResult) return localResult;

  const errScope = validateNewCaseUserScope(regionSel, communeForCatalog, localResult.localEntry, currentUser, assignedCommuneEffective, assignedLocalIdEffective);
  if (errScope) return { error: errScope };

  return { ok: true, regionSel, communeSel, localName, localEntry: localResult.localEntry, now_: nowISO() };
}

/** Devuelve el mensaje de error si el caso no cumple precondiciones para cerrar; null si puede cerrarse. */
function getCloseCaseValidationError(c: CaseItem): string | null {
  if (c.bypassFlagged && !c.bypassValidated) return UI_TEXT.errors.excepcionRequiereValidacion;
  const hasFormalAction =
    (c.actions?.length ?? 0) > 0 ||
    (c.timeline ?? []).some((ev) => ev.type === "ACTION_ADDED" || ev.type === "FIRST_ACTION");

  if (!hasFormalAction) return UI_TEXT_GOVERNANCE.validationMessages.missingAction;
  if (!c.decisions?.length) return UI_TEXT.errors.alMenosUnaDecision;
  if (normalizeStatus(c.status) !== "Resuelto") return UI_TEXT_GOVERNANCE.validationMessages.cannotCloseYet;
  const hasOpVal = (c.timeline ?? []).some((ev) => ev.type === "OPERATIONAL_VALIDATION");
  if (!hasOpVal) return UI_TEXT_GOVERNANCE.validationMessages.missingOperationalValidation;
  if (!c.closingMotivo) return UI_TEXT_GOVERNANCE.validationMessages.missingCloseReason;
  return null;
}

/** Lógica de cambio de estado de caso extraída para reducir complejidad cognitiva de App. */
function changeCaseStatusImpl(
  caseId: string,
  newStatus: CaseStatus,
  ctx: {
    currentUser: User;
    cases: CaseItem[];
    notify: (msg: string, type?: string) => void;
    setCases: React.Dispatch<React.SetStateAction<CaseItem[]>>;
    setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  }
): void {
  const { currentUser, cases, notify, setCases, setAuditLog } = ctx;
  const c = cases.find((x) => x.id === caseId);
  if (!c) return;
  if (!canDo("update", currentUser, c) && !canDo("close", currentUser, c)) {
    notify(UI_TEXT.errors.unauthorized, "error");
    return;
  }
  if (newStatus === "En gestión" && normalizeStatus(c.status) === "Nuevo" && !c.bypass) {
    notify("❌ " + UI_TEXT.errors.recepcionarPrimero, "error");
    return;
  }
  if (newStatus === "Cerrado") {
    const closeError = getCloseCaseValidationError(c);
    if (closeError) {
      notify("❌ " + closeError, "error");
      return;
    }
  }
  const tlMap: Record<CaseStatus, string> = { Escalado: "ESCALATED", Mitigado: "MITIGATED", Resuelto: "RESOLVED", Cerrado: "CLOSED", "En gestión": "IN_MANAGEMENT", "Recepcionado por DR": "RECEPCIONADO", Nuevo: "DETECTED" };
  const tsMap: Partial<Record<CaseStatus, string>> = { Escalado: "escalatedAt", Mitigado: "mitigatedAt", Resuelto: "resolvedAt", Cerrado: "closedAt" };
  setCases((prev) =>
    prev.map((x) => {
      if (x.id === caseId) {
        const tl = [...(x.timeline ?? []), { eventId: newEventId("ev"), type: tlMap[newStatus] || "STATUS_CHANGED", at: nowISO(), actor: currentUser.id, note: `Estado → ${newStatus}` }];
        const tsKey = tsMap[newStatus];
        return { ...x, status: newStatus, ...(tsKey ? { [tsKey]: nowISO() } : {}), timeline: tl, updatedAt: nowISO() };
      }
      return x;
    })
  );
  setAuditLog((prev) => appendEvent(prev, "STATUS_CHANGED", currentUser.id, currentUser.role, caseId, `Estado → ${newStatus}`));
}

/** Construye el objeto caso y payload para envío (reduce complejidad de submitNewCaseImpl). */
function buildNewCaseData(
  params: BuildNewCaseDataParams
): { c: CaseItem; id: string; payloadForApi: Record<string, unknown>; result: { criticality: string; score: number }; bypassFlagged: boolean } {
  const { newCase, currentUser, evalForm, bypassForm, cases, localEntry, now_, activeRegion } = params;
  const localSnapshot = {
    idLocal: localEntry.idLocal,
    nombre: localEntry.nombre,
    region: localEntry.region,
    commune: localEntry.commune,
    snapshotAt: now_,
  };
  const result = calcCriticality(evalForm);
  const maxVar = Math.max(...Object.values(evalForm));
  const bypassTechOk = maxVar >= 3 || bypassForm.cause === "system_down";
  const bypassFlagged = bypassForm.active && !bypassTechOk;
  const rCases = cases.filter((c) => c.region === newCase.region && c.commune === newCase.commune);
  const id = genId(newCase.region, newCase.commune, rCases.length + 1);
  const c = {
    ...newCase,
    id,
    localSnapshot,
    evaluation: evalForm,
    evaluationLocked: true,
    evaluationHistory: [],
    criticality: result.criticality,
    criticalityScore: result.score,
    status: bypassForm.active ? "En gestión" : "Nuevo",
    assignedTo: null,
    slaMinutes: SLA_MINUTES[result.criticality as SlaLevel] || 60,
    closingMotivo: null,
    bypassValidated: null,
    timeline: [
      { eventId: newEventId("ev"), type: "DETECTED", at: newCase.origin!.detectedAt, actor: currentUser.id, note: "Detectado" },
      { eventId: newEventId("ev"), type: "REPORTED", at: now_, actor: currentUser.id, note: "Reportado en SCCE" },
    ],
    actions: [],
    decisions: [],
    bypass: bypassForm.active,
    bypassMotivo: bypassForm.motivo,
    bypassFlagged,
    bypassActor: bypassForm.active ? currentUser.id : null,
    peseInoperante: bypassForm.cause === "system_down",
    completeness: 0,
    reportedAt: now_,
    firstActionAt: null,
    escalatedAt: null,
    mitigatedAt: null,
    resolvedAt: null,
    closedAt: null,
    createdBy: currentUser.id,
    createdAt: now_,
    updatedAt: now_,
  } as CaseItem & { completeness: number };
  c.completeness = calcCompleteness(c as CaseItem);
  const payloadForApi = {
    summary: newCase.summary,
    status: c.status,
    criticality: result.criticality,
    regionCode: activeRegion === "ALL" ? newCase.region : activeRegion,
    communeCode: newCase.commune,
    localCode: newCase.local,
    localSnapshot: localSnapshot ?? undefined,
  };
  return { c: c as CaseItem, id, payloadForApi, result, bypassFlagged };
}

/** Headers opcionales para peticiones API según membership (reduce complejidad). */
function getMembershipApiHeaders(membership: Membership): Record<string, string> | undefined {
  const headers: Record<string, string> = {};
  if (membership.id) headers["x-scce-membership-id"] = membership.id;
  if (membership.contextType && membership.contextId) {
    headers["x-scce-context-type"] = membership.contextType;
    headers["x-scce-context-id"] = membership.contextId;
  }
  return Object.keys(headers).length ? headers : undefined;
}

/** Aplica estado y notificación tras crear caso (API o local). */
function applyNewCaseSuccess(
  ctx: {
    currentUser: User;
    bypassForm: BypassFormState;
    setCases: React.Dispatch<React.SetStateAction<CaseItem[]>>;
    setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
    notify: (msg: string, type?: string) => void;
    setView: (v: ViewKey) => void;
    setNewCase: React.Dispatch<React.SetStateAction<CaseItem | null>>;
  },
  caseItem: CaseItem,
  caseId: string,
  result: { criticality: string },
  bypassFlagged: boolean
): void {
  const { currentUser, bypassForm, setCases, setAuditLog, notify, setView, setNewCase } = ctx;
  setCases((prev) => [caseItem, ...prev]);
  setAuditLog((prev) => {
    let log = appendEvent(prev, "CASE_CREATED", currentUser.id, currentUser.role, caseId, `Caso: ${caseItem.summary.slice(0, 60)}`);
    if (bypassForm.active) log = appendEvent(log, "BYPASS_USED", currentUser.id, currentUser.role, caseId, `Bypass: ${bypassForm.motivo}`);
    if (bypassFlagged) log = appendEvent(log, "BYPASS_FLAGGED", currentUser.id, currentUser.role, caseId, UI_TEXT.errors.excepcionRequiereValidacion);
    return log;
  });
  notify(
    `Caso ${caseId} — ${result.criticality}${bypassFlagged ? " ⚠️ " + UI_TEXT.states.flagged : ""}`,
    result.criticality === "CRITICA" ? "error" : "success"
  );
  setView("dashboard");
  setNewCase(null);
}

/** Lógica de envío de nuevo caso extraída para reducir complejidad cognitiva de App. */
async function submitNewCaseImpl(ctx: {
  newCase: CaseItem;
  currentUser: User;
  localCatalog: LocalCatalog;
  evalForm: Record<string, number>;
  bypassForm: BypassFormState;
  cases: CaseItem[];
  activeRegion: string;
  authToken: string | null;
  assignedCommuneEffective: string | undefined | null;
  assignedLocalIdEffective: string | undefined | null;
  notify: (msg: string, type?: string) => void;
  setCases: React.Dispatch<React.SetStateAction<CaseItem[]>>;
  setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  setView: (v: ViewKey) => void;
  setNewCase: React.Dispatch<React.SetStateAction<CaseItem | null>>;
}): Promise<void> {
  const {
    newCase,
    currentUser,
    localCatalog,
    evalForm,
    bypassForm,
    cases,
    activeRegion,
    authToken,
    assignedCommuneEffective,
    assignedLocalIdEffective,
    notify,
    setCases,
    setAuditLog,
    setView,
    setNewCase,
  } = ctx;

  const se = validateCaseSchema(newCase, localCatalog);
  if (se.length) {
    notify("⚠️ " + se[0], "error");
    return;
  }
  const validation = validateNewCaseForSubmit(newCase, localCatalog, currentUser, assignedCommuneEffective, assignedLocalIdEffective);
  if ("error" in validation) {
    notify(validation.error, "error");
    return;
  }
  const { localEntry, now_ } = validation;
  const { c, id, payloadForApi, result, bypassFlagged } = buildNewCaseData({
    newCase,
    currentUser,
    evalForm,
    bypassForm,
    cases,
    localEntry,
    now_,
    activeRegion,
  });

  const membership = getActiveMembership();
  if (authToken && membership) {
    const res = await apiRequest<{ id: string; regionCode: string; communeCode: string; localCode: string; localSnapshot?: unknown; status: string; createdAt: string; updatedAt: string }>("/cases", {
      method: "POST",
      token: authToken,
      body: payloadForApi,
      headers: getMembershipApiHeaders(membership),
    });
    if (!res.ok) {
      notify(res.error || "Error al crear caso en el servidor.", "error");
      return;
    }
    const ls = isLocalSnapshot(res.data.localSnapshot) ? res.data.localSnapshot : c.localSnapshot;
    const apiCase = {
      ...c,
      id: res.data.id,
      region: res.data.regionCode,
      commune: res.data.communeCode,
      local: res.data.localCode,
      localSnapshot: ls,
      status: res.data.status,
      createdAt: res.data.createdAt,
      updatedAt: res.data.updatedAt,
    } as CaseItem;
    apiCase.completeness = calcCompleteness(apiCase);
    applyNewCaseSuccess(
      { currentUser, bypassForm, setCases, setAuditLog, notify, setView, setNewCase },
      apiCase,
      res.data.id,
      result,
      bypassFlagged
    );
    return;
  }

  applyNewCaseSuccess(
    { currentUser, bypassForm, setCases, setAuditLog, notify, setView, setNewCase },
    c,
    id,
    result,
    bypassFlagged
  );
}

// ─── Helpers a nivel de módulo para reducir complejidad cognitiva de App (S3776) ─
function computeRegionEffective(
  isCentral: boolean,
  filterState: AppFilterState,
  activeRegion: string,
  effectiveMembership: Membership | null
): string {
  return isCentral ? (filterState.region || activeRegion || "ALL") : (effectiveMembership?.regionCode || "");
}

type DoLoginSetters = {
  setLoginErr: React.Dispatch<React.SetStateAction<string>>;
  setCtxErr: React.Dispatch<React.SetStateAction<string>>;
  setAuthBusy: React.Dispatch<React.SetStateAction<boolean>>;
  setToken: (t: string) => void;
  setAuthToken: React.Dispatch<React.SetStateAction<string | null>>;
  setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
};
async function doLoginImpl(
  loginForm: { email: string; password: string },
  bootstrapOpts: BootstrapSessionOptions,
  setters: DoLoginSetters
): Promise<void> {
  setters.setLoginErr("");
  setters.setCtxErr("");
  setters.setAuthBusy(true);
  try {
    const res = await apiRequest<{ token: string }>("/auth/login", {
      method: "POST",
      body: { email: loginForm.email, password: loginForm.password },
    });
    if (!res.ok) {
      setters.setLoginErr(res.error || "No se pudo iniciar sesión.");
      return;
    }
    const token = res.data.token;
    setToken(token);
    setters.setAuthToken(token);
    await bootstrapSession(token, bootstrapOpts);
    setters.setAuditLog((prev) => appendEvent(prev, "LOGIN", "api", "API", null, "Inicio de sesión (API real)"));
  } finally {
    setters.setAuthBusy(false);
  }
}

function isFixedLocalRoleModule(u: { role?: string } | null | undefined): boolean {
  const r = String(u?.role ?? "").toUpperCase();
  return r === "PESE" || r === "DELEGADO_JE";
}

function getCaseLocalIdSafeModule(
  c: { localScope?: string; localRef?: { idLocal?: string }; localSnapshot?: { idLocal?: string } | null },
  localCatalogById: Map<string, unknown>
): string | null {
  if (c?.localScope === "REGIONAL") return null;
  const raw =
    (c as { localRef?: { idLocal?: string }; localSnapshot?: { idLocal?: string } | null })?.localRef?.idLocal ??
    (c as { localSnapshot?: { idLocal?: string } | null })?.localSnapshot?.idLocal ??
    null;
  if (!raw) return null;
  const id = String(raw);
  return localCatalogById.has(id) ? id : null;
}

function computeAssignedLocalIdEffective(
  fixedLocalRole: boolean,
  currentUser: User | null,
  localCatalog: LocalCatalog,
  localCatalogById: Map<string, LocalCatalogEntry>
): string | null {
  if (!fixedLocalRole) return null;
  const explicit = currentUser?.assignedLocalId == null ? null : String(currentUser.assignedLocalId);
  if (explicit && localCatalogById.has(explicit)) return explicit;
  const fallback =
    localCatalog.find((e) => e.activoGlobal && e.region === currentUser?.region && e.commune === currentUser?.commune)
      ?.idLocal ?? null;
  return fallback && localCatalogById.has(fallback) ? fallback : null;
}

type VisibleCasesFilterOpts = {
  currentUser: User | null;
  activeRegion: string;
  filterState: AppFilterState;
  fixedLocalRole: boolean;
  assignedLocalIdEffective: string | null;
  localCatalogById: Map<string, unknown>;
  isCentral: boolean;
};

function passesFixedLocalRoleFilter(
  c: CaseItem,
  fixedLocalRole: boolean,
  assignedLocalIdEffective: string | null,
  localCatalogById: Map<string, unknown>
): boolean {
  if (!fixedLocalRole) return true;
  if (!assignedLocalIdEffective || !localCatalogById.has(assignedLocalIdEffective)) return false;
  const cid = getCaseLocalIdSafeModule(c, localCatalogById);
  return cid === assignedLocalIdEffective;
}

function passesRegionFilter(c: CaseItem, regionToFilter: string): boolean {
  const caseRegion =
    (c as { region?: string; regionCode?: string }).regionCode ??
    (c as { region?: string; regionCode?: string }).region ??
    null;
  return caseRegion !== null && caseRegion === regionToFilter;
}

function passesViewPermissionFilter(c: CaseItem, currentUser: User | null): boolean {
  if (isFixedLocalRoleModule(currentUser)) return true;
  if (canDo("viewAll", currentUser, c)) return true;
  return c.createdBy === currentUser?.id || c.assignedTo === currentUser?.id;
}

function passesCriticalityStatusCommune(c: CaseItem, filterState: AppFilterState): boolean {
  if (filterState.criticality && c.criticality !== filterState.criticality) return false;
  if (filterState.status && normalizeStatus(c.status) !== normalizeStatus(filterState.status)) return false;
  if (filterState.commune && c.commune !== filterState.commune) return false;
  return true;
}

function passesSearchFilter(c: CaseItem, search: string): boolean {
  const q = search.toLowerCase();
  const localText =
    (c.local || "") +
    " " +
    ((c as { localSnapshot?: { nombre?: string }; localRef?: { label?: string } }).localSnapshot?.nombre || "") +
    " " +
    ((c as { localRef?: { label?: string } }).localRef?.label || "");
  return (
    String(c.summary ?? "").toLowerCase().includes(q) ||
    String(c.id ?? "").toLowerCase().includes(q) ||
    localText.toLowerCase().includes(q)
  );
}

function isCaseVisible(c: CaseItem, opts: VisibleCasesFilterOpts): boolean {
  const {
    currentUser,
    activeRegion,
    filterState,
    fixedLocalRole,
    assignedLocalIdEffective,
    localCatalogById,
    isCentral,
  } = opts;
  if (!passesFixedLocalRoleFilter(c, fixedLocalRole, assignedLocalIdEffective, localCatalogById)) return false;
  const regionToFilter =
    filterState.region || (isCentral && filterState.commune && activeRegion ? activeRegion : null);
  if (regionToFilter && !passesRegionFilter(c, regionToFilter)) return false;
  if (!passesViewPermissionFilter(c, currentUser)) return false;
  if (!passesCriticalityStatusCommune(c, filterState)) return false;
  if (filterState.search && !passesSearchFilter(c, filterState.search)) return false;
  return true;
}

function pushTimelineEvent(timeline: CaseEvent[], ev: CaseEvent): CaseEvent[] {
  if (isDuplicateEvent(timeline, ev)) return timeline;
  return [...timeline, ev];
}

function setUiModeAndPersistImpl(
  next: UiMode,
  currentUserId: string | undefined,
  setUiMode: React.Dispatch<React.SetStateAction<UiMode>>
): void {
  setUiMode(next);
  if (currentUserId) localStorage.setItem(uiModeStorageKey(currentUserId), next);
}

type RecepcionarDeps = {
  currentUser: User;
  cases: CaseItem[];
  notify: (msg: string, type?: string) => void;
  setCases: React.Dispatch<React.SetStateAction<CaseItem[]>>;
  setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
};
function recepcionarImpl(caseId: string, deps: RecepcionarDeps): void {
  const { currentUser, cases, notify, setCases, setAuditLog } = deps;
  const c = cases.find((x) => x.id === caseId);
  if (!c || !canDo("recepcionar", currentUser, c)) {
    notify(UI_TEXT.errors.unauthorized, "error");
    return;
  }
  setCases((prev) =>
    prev.map((x) =>
      x.id === caseId
        ? ({
            ...x,
            status: "Recepcionado por DR",
            updatedAt: nowISO(),
            timeline: [...(x.timeline ?? []), { eventId: newEventId("ev"), type: "RECEPCIONADO", at: nowISO(), actor: currentUser.id, note: `Recepcionado por ${currentUser.name}` }],
          } as CaseItem)
        : x
    )
  );
  setAuditLog((prev) => appendEvent(prev, "STATUS_CHANGED", currentUser.id, currentUser.role, caseId, "Estado → Recepcionado por DR"));
  notify("Caso recepcionado", "success");
}

type ValidateBypassDeps = {
  currentUser: User;
  setCases: React.Dispatch<React.SetStateAction<CaseItem[]>>;
  setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  notify: (msg: string, type?: string) => void;
};
function validateBypassImpl(caseId: string, decision: string, fundament: string, deps: ValidateBypassDeps): void {
  const { currentUser, setCases, setAuditLog, notify } = deps;
  if (!canDo("validateBypass", currentUser)) {
    notify(UI_TEXT.errors.soloDirectorValida, "error");
    return;
  }
  if (!fundament) {
    notify(UI_TEXT.errors.fundamentoRequerido, "error");
    return;
  }
  const validated = decision === "VALIDATED";
  const bypassEv: CaseEvent = {
    eventId: newEventId("ev"),
    type: validated ? "BYPASS_VALIDATED" : "BYPASS_REVOKED",
    at: nowISO(),
    actor: currentUser.id,
    note: fundament,
  };
  setCases((prev) =>
    prev.map((x) => {
      if (x.id === caseId) {
        const tl = pushTimelineEvent(x.timeline ?? [], bypassEv);
        const nd = [...(x.decisions ?? []), { who: currentUser.id, at: nowISO(), fundament: `Bypass ${validated ? "VALIDADO" : "REVOCADO"}: ${fundament}` }];
        return { ...x, bypassValidated: decision, decisions: nd, timeline: tl, updatedAt: nowISO() } as CaseItem;
      }
      return x;
    })
  );
  setAuditLog((prev) => appendEvent(prev, validated ? "BYPASS_VALIDATED" : "BYPASS_REVOKED", currentUser.id, currentUser.role, caseId, fundament.slice(0, 80)));
  notify(`Excepción ${validated ? "validada" : "revocada"}`, "success");
}

type EvalFormState = { continuidad: number; integridad: number; seguridad: number; exposicion: number; capacidadLocal: number };
type EvalVarDef = { key: string; label: string; desc: string };

function EvalVarRow(props: Readonly<{
  v: EvalVarDef;
  le: Record<string, number>;
  setLe: React.Dispatch<React.SetStateAction<EvalFormState>>;
}>) {
  const { v, le, setLe } = props;
  const handleScore = (n: number) => setLe((p) => ({ ...p, [v.key]: n } as EvalFormState));
  const colors = [themeColor("success"), themeColor("warningAlt"), themeColor("warning"), themeColor("danger")];
  const borders = ["#22c55e44", "#eab30844", "#f9731644", "#ef444444"];
  return (
    <div style={{ ...S.card, background: themeColor("bgSurface"), marginBottom: 6 }}>
      <div style={{ fontWeight: 600, marginBottom: 1 }}>{v.label}</div>
      <div style={{ color: themeColor("muted"), fontSize: "10px", marginBottom: 6 }}>{v.desc}</div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {[0, 1, 2, 3].map((n) => {
          const isSelected = le[v.key] === n;
          const btnStyle = { padding: "6px 14px", borderRadius: 4, border: "2px solid", cursor: "pointer", fontWeight: 700, fontSize: "13px", background: isSelected ? colors[n] : "transparent", borderColor: borders[n], color: isSelected ? themeColor("white") : colors[n] };
          return <button key={n} type="button" onClick={() => handleScore(n)} style={btnStyle}>{n}</button>;
        })}
        {le[v.key] === 3 && <span style={{ color: themeColor("danger"), fontWeight: 700, fontSize: "11px" }}>⚠️ ESCALAR</span>}
      </div>
    </div>
  );
}

// NewCaseForm: definido a nivel de módulo para evitar S6478 (componente dentro del padre).
type NewCaseFormGate = {
  newCase: CaseItem | null;
  setNewCase: React.Dispatch<React.SetStateAction<CaseItem | null>>;
  evalForm: EvalFormState;
  setEvalForm: React.Dispatch<React.SetStateAction<EvalFormState>>;
  bypassForm: BypassFormState;
  setBypassForm: React.Dispatch<React.SetStateAction<BypassFormState>>;
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  regionsMap: Record<string, { name?: string; communes?: Record<string, { name?: string }> }>;
  activeMembership: Membership | null;
  activeRegion: string;
  assignedCommuneEffective: string;
  assignedLocalIdEffective: string | null;
  assignedLocal: LocalCatalogEntry | null;
  localCatalog: LocalCatalog;
  setView: React.Dispatch<React.SetStateAction<ViewKey>>;
  canDo: (action: string, user: User | null) => boolean;
  currentUser: User | null;
  notify: (msg: string, type?: string) => void;
  submitCase: () => Promise<void>;
  withBusy: (key: string, fn: () => void) => void;
  busyAction: Record<string, boolean>;
  nowLocalInput: () => string;
};

function NewCaseForm(props: Readonly<{ gate: NewCaseFormGate; hideBack?: boolean }>) {
  const { gate, hideBack = false } = props;
  const {
    newCase,
    setNewCase,
    evalForm,
    setEvalForm,
    bypassForm,
    setBypassForm,
    step,
    setStep,
    regionsMap,
    activeMembership,
    activeRegion,
    assignedCommuneEffective,
    assignedLocalIdEffective,
    assignedLocal,
    localCatalog,
    setView,
    canDo,
    currentUser,
    notify,
    submitCase,
    withBusy,
    busyAction,
    nowLocalInput,
  } = gate;

  const detailStepRef = useRef<DetailStepContentRef>(null);
  const [lnc, setLnc] = useState<LncDraft>(newCase ? { ...newCase } : {});
  const [le, setLe] = useState(evalForm);
  const [lb, setLb] = useState(bypassForm);
  const er = calcCriticality(le);
  const maxVar = Math.max(...Object.values(le));

  const lockedRegion =
    activeMembership?.contextType === "SIMULACION" &&
    activeMembership?.regionScopeMode === "LIST" &&
    Array.isArray(activeMembership?.regionScope) &&
    activeMembership.regionScope.length === 1
      ? activeMembership.regionScope[0]
      : null;
  const effectiveRegion = lockedRegion ?? lnc.region ?? activeRegion ?? "TRP";

  const rData = regionsMap[effectiveRegion];
  const communeForCatalog = getInternalCommuneForCatalog(effectiveRegion, lnc.commune || "") || lnc.commune || "";
  const availableLocals = useMemo(
    () => getActiveLocals(localCatalog, effectiveRegion, communeForCatalog),
    [localCatalog, effectiveRegion, communeForCatalog]
  );

  const isFixedLocal = Boolean(assignedLocalIdEffective);
  const isFixedCommune = Boolean(assignedCommuneEffective);
  const lockCommune = isFixedCommune;
  const lockLocal = isFixedLocal;

  useEffect(() => {
    if (!lnc.origin?.detectedAt) {
      setLnc((p) => ({
        ...p,
        origin: p.origin ? { ...p.origin, detectedAt: nowLocalInput() } : { detectedAt: nowLocalInput() },
      }));
    }
    if (lockCommune && lnc.commune !== assignedCommuneEffective) {
      setLnc((p) => ({ ...p, commune: assignedCommuneEffective, local: "" }));
      return;
    }
    if (lockLocal && lnc.local !== (assignedLocal?.nombre ?? "")) {
      setLnc((p) => ({ ...p, local: assignedLocal?.nombre ?? "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockCommune, lockLocal, assignedCommuneEffective, assignedLocalIdEffective]);

  useEffect(() => {
    if (!lockLocal && availableLocals.length === 1) {
      setLnc((prev) => ({ ...prev, local: availableLocals[0].nombre }));
    }
  }, [availableLocals, lockLocal]);

  const varDefs = [
    { key: "continuidad", label: "1. Continuidad del acto", desc: "0=Sin impacto · 1=Parcial · 2=Mesa suspendida · 3=Local sin funcionar" },
    { key: "integridad", label: "2. Integridad jurídica", desc: "0=Sin riesgo · 1=Dudas · 2=Posible nulidad · 3=Nulidad evidente" },
    { key: "seguridad", label: "3. Seguridad / orden público", desc: "0=Normal · 1=Tensión · 2=Incidente activo · 3=Violencia/amenaza grave" },
    { key: "exposicion", label: "4. Exposición pública", desc: "0=Interna · 1=Testigos · 2=Medios/redes · 3=Atención nacional" },
    { key: "capacidadLocal", label: "5. Capacidad local", desc: "0=Resuelven · 1=Orientación · 2=Apoyo externo · 3=Sin capacidad" },
  ];

  const handleLocalChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setLnc((p) => ({ ...p, local: e.target.value }));

  const renderLocalSelect = () => {
    if (lnc.commune === "" || lnc.commune == null) {
      return (
        <div style={{ ...S.inp, color: themeColor("mutedDark"), cursor: "not-allowed" }}>
          Seleccione una comuna primero
        </div>
      );
    }
    if (availableLocals.length === 0) {
      return (
        <div
          style={{
            ...S.inp,
            color: themeColor("danger"),
            cursor: "not-allowed",
            borderColor: "#ef444444",
          }}
        >
          ⚠️ Sin locales activos — administre el catálogo
        </div>
      );
    }
    return (
      <select
        id="newcase-local"
        style={{ ...S.inp, borderColor: lnc.local ? "#22c55e44" : "#ef444444" }}
        value={lnc.local || ""}
        disabled={lockLocal || !lnc.commune}
        onChange={handleLocalChange}
      >
        {availableLocals.length > 1 && <option value="">Seleccione local...</option>}
        {availableLocals.map((l) => (
          <option key={l.idLocal} value={l.nombre}>
            {l.nombre}
          </option>
        ))}
      </select>
    );
  };

  const stepLabels = ["Identificación", "Evaluación", "Detalles", "Confirmar"];
  const stepIndicators = stepLabels.map((st, i) => {
    let stepBg: string;
    let stepColor: string;
    let stepBorder: string;
    if (step === i + 1) {
      stepBg = themeColor("primary");
      stepColor = themeColor("white");
      stepBorder = themeColor("primary");
    } else if (step > i + 1) {
      stepBg = themeColor("greenLight");
      stepColor = themeColor("greenText");
      stepBorder = themeColor("success");
    } else {
      stepBg = themeColor("stepInactive");
      stepColor = themeColor("textSecondary");
      stepBorder = themeColor("border");
    }
    return (
      <div
        key={st}
        style={{
          padding: "4px 10px",
          borderRadius: 4,
          fontSize: "11px",
          fontWeight: 600,
          background: stepBg,
          color: stepColor,
          border: `1px solid ${stepBorder}`,
        }}
      >
        {step > i + 1 ? "✓ " : ""}
        {st}
      </div>
    );
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        {!hideBack && (
          <button style={S.btn("dark")} onClick={() => setView("dashboard")}>
            ← Volver
          </button>
        )}
        <h2 style={{ margin: 0, fontSize: "16px" }}>Nuevo Incidente — Ficha 60s</h2>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>{stepIndicators}</div>

      {step === 1 && (
        <div style={S.card}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 10 }}>
            PASO 1 — IDENTIFICACIÓN
          </div>
          <div style={{ ...S.g2, marginBottom: 8 }}>
            <div>
              <label style={S.lbl} htmlFor="newcase-region">
                Región
              </label>
              <select
                id="newcase-region"
                style={S.inp}
                value={effectiveRegion}
                disabled={!!lockedRegion}
                onChange={(e) => setLnc((p) => ({ ...p, region: e.target.value, commune: "", local: "" }))}
              >
                {(lockedRegion
                  ? Object.entries(regionsMap).filter(([k]) => k === lockedRegion)
                  : Object.entries(regionsMap)
                ).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v?.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.lbl} htmlFor="newcase-commune">
                Comuna *
              </label>
              <select
                id="newcase-commune"
                style={S.inp}
                value={lnc.commune || ""}
                disabled={lockCommune}
                onChange={(e) => setLnc((p) => ({ ...p, commune: e.target.value, local: "" }))}
              >
                <option value="">Seleccione...</option>
                {Object.entries(rData?.communes || {}).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={S.lbl} htmlFor="newcase-local">
              Local de Votación *
            </label>
            {renderLocalSelect()}
            {lnc.local && (
              <div style={{ fontSize: "9px", color: themeColor("purple"), marginTop: 2 }}>
                📸 Se guardará snapshot del local al registrar
              </div>
            )}
          </div>
          <div style={{ ...S.g2, marginBottom: 8 }}>
            <div>
              <label style={S.lbl} htmlFor="newcase-channel">
                Canal
              </label>
              <select
                id="newcase-channel"
                style={S.inp}
                value={lnc.origin?.channel || "Teams"}
                onChange={(e) => setLnc((p) => ({ ...p, origin: { ...p.origin, channel: e.target.value } }))}
              >
                {["Teams", "Teléfono", "WhatsApp", "Correo", "Presencial"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={S.lbl} htmlFor="newcase-datetime">
                Hora del incidente *
              </label>
              <input
                id="newcase-datetime"
                style={S.inp}
                type="datetime-local"
                value={(lnc.origin?.detectedAt || "").slice(0, 16)}
                onChange={(e) => setLnc((p) => ({ ...p, origin: { ...p.origin, detectedAt: e.target.value } }))}
              />
              <div style={{ fontSize: "10px", color: themeColor("muted"), marginTop: 2 }}>
                Hora en que ocurrió/detectó. Se permite hasta 5 min por desfase de reloj. La hora de registro se guarda al enviar.
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={S.lbl} htmlFor="newcase-summary">
              Resumen *
            </label>
            <input
              id="newcase-summary"
              style={S.inp}
              placeholder="Ej: Urna sellada incorrectamente en mesa 12"
              value={lnc.summary || ""}
              onChange={(e) => setLnc((p) => ({ ...p, summary: e.target.value }))}
            />
          </div>
          {canDo("bypass", currentUser) && (
            <div style={{ ...S.card, background: themeColor("violetBlock"), border: "1px solid #7c3aed44" }}>
              <label
                style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                title={UI_TEXT.tooltips.modoUrgente}
                htmlFor="bypass-active"
              >
                <input
                  id="bypass-active"
                  type="checkbox"
                  checked={lb.active}
                  onChange={(e) => setLb((p) => ({ ...p, active: e.target.checked, confirmed: false }))}
                />
                <span style={{ color: themeColor("purpleLight"), fontWeight: 600, fontSize: "12px" }}>
                  ⚡ Activar Modo urgente (Excepción operativa)
                </span>
              </label>
              {lb.active && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", marginBottom: 6 }}>
                    Úselo solo si no es posible seguir el procedimiento normal. Queda registrado como excepción.
                  </div>
                  <label style={S.lbl} htmlFor="bypass-cause">
                    Causal de la excepción *
                  </label>
                  <select
                    id="bypass-cause"
                    style={S.inp}
                    value={lb.cause}
                    onChange={(e) => setLb((p) => ({ ...p, cause: e.target.value as BypassCause }))}
                  >
                    <option value="">Seleccione...</option>
                    <option value="system_down">Sistema institucional no disponible</option>
                    <option value="risk_imminent">Riesgo inminente (seguridad/orden público/continuidad)</option>
                    <option value="critical_level_3">Evaluación crítica máxima (Nivel 3)</option>
                    <option value="other">Otra (requiere explicación detallada)</option>
                  </select>
                  <label style={S.lbl} htmlFor="bypass-motivo">
                    Motivo / respaldo *
                  </label>
                  <input
                    id="bypass-motivo"
                    style={S.inp}
                    placeholder="Motivo o respaldo de la excepción"
                    value={lb.motivo}
                    onChange={(e) => setLb((p) => ({ ...p, motivo: e.target.value }))}
                  />
                </div>
              )}
            </div>
          )}
          <div style={{ marginTop: 10, textAlign: "right" }}>
            <button
              style={S.btn("primary")}
              onClick={() => {
                const errs = validateCaseSchema({ ...lnc, origin: { ...lnc.origin } }, localCatalog);
                if (errs.length) return notify("⚠️ " + errs[0], "error");
                if (lb.active && !lb.cause) return notify("Seleccione la causal de la excepción", "error");
                if (lb.active && !lb.motivo) return notify("El Modo urgente requiere motivo o respaldo", "error");
                if (lb.active && lb.cause === "other" && lb.motivo.trim().length < 15)
                  return notify("Otra causal requiere explicación detallada (mín. 15 caracteres)", "error");
                setNewCase({ ...lnc } as CaseItem);
                setBypassForm(lb);
                setStep(2);
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={S.card}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 10 }}>
            PASO 2 — FICHA DE EVALUACIÓN (inmutable tras guardar)
          </div>
          {varDefs.map((v) => (
            <EvalVarRow key={v.key} v={v} le={le as Record<string, number>} setLe={setLe} />
          ))}
          {lb.active && maxVar < 3 && lb.cause !== "system_down" && lb.cause !== "critical_level_3" && (
            <div style={{ ...S.card, background: themeColor("redBlock"), border: "2px solid #ef4444", marginTop: 8 }}>
              <div style={{ color: themeColor("danger"), fontWeight: 700, marginBottom: 6 }}>
                ⚠️ {UI_TEXT.misc.excepcionSinFundamentoObjetivo}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} htmlFor="bypass-confirmed">
                <input
                  id="bypass-confirmed"
                  type="checkbox"
                  checked={lb.confirmed || false}
                  onChange={(e) => setLb((p) => ({ ...p, confirmed: e.target.checked }))}
                />
                <span style={{ color: themeColor("danger"), fontSize: "12px", fontWeight: 600 }}>
                  {UI_TEXT.misc.confirmarExcepcionOperativa}
                </span>
              </label>
            </div>
          )}
          <div
            style={{
              ...S.card,
              background: themeColor("bgSurface"),
              border: `2px solid ${critColor(er.criticality as Criticality)}`,
              marginTop: 8,
            }}
          >
            <Badge style={S.badge(critColor(er.criticality as Criticality))} size="sm">
              CRITICIDAD: {er.criticality}
            </Badge>
            <span style={{ marginLeft: 8, color: themeColor("muted"), fontSize: "11px" }}>
              Prioridad sugerida: {er.score}/15
            </span>
            <div style={{ marginTop: 6, color: themeColor("mutedAlt"), fontSize: "12px" }}>{er.recommendation}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <button style={S.btn("dark")} onClick={() => setStep(1)}>
              ← Atrás
            </button>
            <button
              style={S.btn("primary")}
              onClick={() => {
                if (
                  lb.active &&
                  maxVar < 3 &&
                  lb.cause !== "system_down" &&
                  lb.cause !== "critical_level_3" &&
                  !lb.confirmed
                ) {
                  notify("Confirmar Modo urgente atípico", "error");
                  return;
                }
                setEvalForm(le);
                setBypassForm(lb);
                setStep(3);
              }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <DetailStepContent
          ref={detailStepRef}
          initialDetail={newCase?.detail ?? ""}
          newCase={newCase}
          setNewCase={setNewCase}
          onConfirm={() => {
            const d = detailStepRef.current?.getDetail?.() ?? newCase?.detail ?? "";
            setNewCase((p) => (p ? { ...p, detail: d } : p));
            setStep(4);
          }}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <div style={S.card}>
          <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 10 }}>
            PASO 4 — CONFIRMAR Y REGISTRAR
          </div>
          <div style={{ ...S.g2, marginBottom: 8 }}>
            <div>
              <span style={{ color: themeColor("muted") }}>Región:</span>{" "}
              {regionsMap[newCase?.region ?? ""]?.name}
            </div>
            <div>
              <span style={{ color: themeColor("muted") }}>Comuna:</span>{" "}
              {regionsMap[newCase?.region ?? ""]?.communes?.[newCase?.commune ?? ""]?.name || newCase?.commune}
            </div>
            <div>
              <span style={{ color: themeColor("muted") }}>Canal:</span> {newCase?.origin?.channel}
            </div>
            <div>
              <span style={{ color: themeColor("muted") }}>Criticidad:</span>{" "}
              <Badge
                style={S.badge(critColor(calcCriticality(evalForm).criticality as Criticality))}
                size="sm"
              >
                {calcCriticality(evalForm).criticality}
              </Badge>
            </div>
          </div>
          <div
            style={{
              marginBottom: 8,
              padding: "6px 10px",
              background: themeColor("infoBg"),
              border: "1px solid #93c5fd",
              borderRadius: 4,
            }}
          >
            <span style={{ fontSize: "11px", color: themeColor("infoIcon") }}>🏫 Local: </span>
            <span style={{ fontWeight: 700 }}>{newCase?.local}</span>
            <div style={{ fontSize: "9px", color: themeColor("purple"), marginTop: 2 }}>
              📸 Se registrará snapshot del local
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <span style={{ color: themeColor("muted") }}>Resumen:</span> {newCase?.summary}
          </div>
          <div
            style={{
              ...S.card,
              background: themeColor("bgSurface"),
              marginBottom: 8,
              fontSize: "11px",
              color: themeColor("textSecondary"),
            }}
          >
            Estado inicial:{" "}
            <strong style={{ color: themeColor("purpleLight") }}>
              {bypassForm.active
                ? "En gestión (" + UI_TEXT.states.modoUrgenteActive + ")"
                : "Nuevo → requiere recepción"}
            </strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <button style={S.btn("dark")} onClick={() => setStep(3)}>
              ← Atrás
            </button>
            <button
              disabled={!!busyAction["submit_case"]}
              style={{ ...S.btn("success"), padding: "8px 20px" }}
              onClick={() => withBusy("submit_case", submitCase)}
            >
              {UI_TEXT_GOVERNANCE.buttons.registerIncident}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type StartNewCaseDeps = {
  currentUser: User;
  activeRegion: string;
  assignedCommuneEffective: string;
  assignedLocal: LocalCatalogEntry | null;
  setNewCase: React.Dispatch<React.SetStateAction<CaseItem | null>>;
  setEvalForm: React.Dispatch<React.SetStateAction<EvalFormState>>;
  setBypassForm: React.Dispatch<React.SetStateAction<BypassFormState>>;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  setView: React.Dispatch<React.SetStateAction<ViewKey>>;
  nowLocalInput: () => string;
};
function startNewCaseImpl(deps: StartNewCaseDeps): void {
  const {
    currentUser,
    activeRegion,
    assignedCommuneEffective,
    assignedLocal,
    setNewCase,
    setEvalForm,
    setBypassForm,
    setStep,
    setView,
    nowLocalInput,
  } = deps;
  const fixedCommune = assignedCommuneEffective || "";
  const fixedLocal = assignedLocal?.nombre ?? "";
  setNewCase({
    region: currentUser.region || (activeRegion === "ALL" ? DEFAULT_REGION : activeRegion),
    commune: fixedCommune,
    local: fixedLocal,
    origin: { actor: currentUser.name, channel: "Teams", detectedAt: nowLocalInput() },
    summary: "",
    detail: "",
    evidence: [],
    id: "",
    status: "Nuevo",
    criticality: "MEDIA",
  } as CaseItem);
  setEvalForm({ continuidad: 0, integridad: 0, seguridad: 0, exposicion: 0, capacidadLocal: 0 });
  setBypassForm({ active: false, motivo: "", cause: "", confirmed: false });
  setStep(1);
  setView("new_case");
}

// Tipo mínimo para las compuertas y el layout (evita complejidad cognitiva en App)
type SCCEAppGate = {
  authToken: string | null;
  activeMembership: Membership | null;
  currentUser: User | null;
  loginForm: { email: string; password: string };
  setLoginForm: React.Dispatch<React.SetStateAction<{ email: string; password: string }>>;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  loginErr: string;
  ctxErr: string;
  authBusy: boolean;
  doLogin: () => void;
  doReset: () => void;
  memberships: Membership[];
  setActiveMembership: React.Dispatch<React.SetStateAction<Membership | null>>;
  setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  apiUser: ApiUser | null;
  clearSession: () => void;
  setAuthToken: React.Dispatch<React.SetStateAction<string | null>>;
  setApiUser: React.Dispatch<React.SetStateAction<ApiUser | null>>;
  setMemberships: React.Dispatch<React.SetStateAction<Membership[]>>;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  setLoginErr: React.Dispatch<React.SetStateAction<string>>;
  setCtxErr: React.Dispatch<React.SetStateAction<string>>;
};

function LoginScreen({ app }: Readonly<{ app: SCCEAppGate }>) {
  return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`.tipWrap:hover .tip{display:block!important}`}</style>
      <div style={{ ...S.card, width: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: "24px", fontWeight: 800, color: themeColor("primary"), letterSpacing: 1 }}>SCCE</div>
          <div style={{ color: themeColor("mutedDark"), fontSize: "12px" }}>Sistema de Comunicación de Contingencias Electorales</div>
          <div style={{ color: themeColor("mutedDarker"), fontSize: "10px", marginTop: 2 }}>v{APP_VERSION} · SERVEL Chile</div>
          <div style={{ color: themeColor("muted"), fontSize: "10px", marginTop: 6 }}>
            API: <span style={{ fontFamily: "monospace" }}>{API_BASE_URL}</span>
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ ...S.lbl, display: "block" }} htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            style={S.inp}
            value={app.loginForm.email}
            onChange={e => app.setLoginForm(p => ({ ...p, email: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && !app.authBusy && app.doLogin()}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.lbl} htmlFor="login-password">
            Contraseña
          </label>
          <div style={{ display: "flex", alignItems: "stretch", gap: 6 }}>
            <input
              id="login-password"
              type={app.showPassword ? "text" : "password"}
              autoComplete="current-password"
              style={{ ...S.inp, flex: 1, minWidth: 0 }}
              value={app.loginForm.password}
              onChange={e => app.setLoginForm(p => ({ ...p, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && !app.authBusy && app.doLogin()}
            />
            <button
              type="button"
              aria-label={app.showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              style={{ ...S.inp, width: 44, minWidth: 44, padding: "6px 8px", flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}
              onClick={() => app.setShowPassword(prev => !prev)}
              title={app.showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {app.showPassword ? "🙈" : "👁"}
            </button>
          </div>
        </div>
        {(app.loginErr || app.ctxErr) && (
          <div style={{ color: themeColor("danger"), fontSize: "11px", marginBottom: 8 }}>
            {app.loginErr || app.ctxErr}
          </div>
        )}
        <button
          style={{ ...S.btn("primary"), width: "100%", padding: "8px", opacity: app.authBusy ? 0.7 : 1 }}
          disabled={app.authBusy}
          onClick={()=>{ app.doLogin(); }}
        >
          {app.authBusy ? "Ingresando..." : "Ingresar"}
        </button>
      </div>
    </div>
  );
}

function ContextSelectorScreen({ app }: Readonly<{ app: SCCEAppGate }>) {
  return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ ...S.card, width: 520 }}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Seleccionar contexto</div>
        <div style={{ color: themeColor("muted"), fontSize: 11, marginBottom: 12 }}>
          Debes seleccionar un contexto antes de continuar.
        </div>
        {app.ctxErr && <div style={{ color: themeColor("danger"), fontSize: "11px", marginBottom: 8 }}>{app.ctxErr}</div>}
        {app.memberships.length === 0 ? (
          <div style={{ color: themeColor("mutedAlt"), fontSize: 11 }}>Cargando contextos...</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {app.memberships.map(m => {
              const scopeList = m.regionScopeMode === "LIST" && Array.isArray(m.regionScope) && m.regionScope.length ? m.regionScope : [];
              const regionLabels = scopeList.map(code => (CONFIG.regions as Record<string, { name?: string }>)[code]?.name ?? code).join(", ") || (m.regionScopeMode === "ALL" ? "Todas las regiones" : null);
              const regionText = regionLabels ? ` · ${regionLabels}` : "";
              return (
                <button
                  key={m.id}
                  style={{ ...S.btn("dark"), justifyContent: "space-between", display: "flex", alignItems: "center" }}
                  onClick={() => {
                    setActiveMembership(m);
                    app.setActiveMembership(m);
                    app.setAuditLog(prev => appendEvent(prev, "CONTEXT_SET", "api", "API", null, `Contexto ${m.contextType}/${m.contextId} (${m.role})`));
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{m.contextType} / {m.contextId}{regionText}</span>
                  <Badge style={{ ...S.badge(themeColor("blueDark")) }} size="xs">{m.role}</Badge>
                </button>
              );
            })}
          </div>
        )}
        <div style={{ marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: themeColor("muted"), fontSize: 10 }}>{app.apiUser?.email ?? ""}</span>
          <button
            style={{ ...S.btn("dark"), fontSize: "11px" }}
            onClick={() => {
              app.clearSession();
              app.setAuthToken(null);
              app.setApiUser(null);
              app.setMemberships([]);
              app.setActiveMembership(null);
              app.setCurrentUser(null);
              app.setLoginErr("");
              app.setCtxErr("");
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: themeColor("mutedAlt"), fontSize: 12 }}>Cargando sesión...</div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function App(){
  const currentYear=new Date().getFullYear();
  const defaultYear=Math.max(currentYear,MIN_ELECTION_YEAR);

  const [electionConfig,setElectionConfig]=useState({name:`Elecciones Generales ${defaultYear}`,date:`${defaultYear}-11-15`,year:defaultYear});
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Auth real (API)
  const [authToken, setAuthToken] = useState<string | null>(() => getToken());
  const [apiUser, setApiUser] = useState<ApiUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeMembership, setActiveMembership] = useState<Membership | null>(() => getActiveMembership());
  /** Rol simulado de sesión: solo aplica en SIMULACION, no cambia permisos reales. */
  const [simulatedRoleId, setSimulatedRoleId] = useState<SimulatedRoleId>("DIRECTOR_REGIONAL");

  const [activeRegion,setActiveRegion]=useState(DEFAULT_REGION);
  const [territoryRegionsMap, setTerritoryRegionsMap] = useState<Record<string, { name: string; communes: Record<string, { name: string }> }> | null>(null);
  const [membershipScopes, setMembershipScopes] = useState<MembershipScopesMap>({});
  const justBecameCentralRef = useRef(false);
  const effectiveMembership = getActiveMembership();
  const isCentral = isCentralFromContext(effectiveMembership, currentUser?.role);
  const regionOptions = useMemo(
    () => getRegionOptions(isCentral, effectiveMembership, membershipScopes, CONFIG.regions as Record<string, { name?: string }>),
    [isCentral, effectiveMembership, membershipScopes]
  );

  useEffect(() => {
    if (!activeRegion) return;
    const cutCode = INTERNAL_TO_CUT[activeRegion] ?? activeRegion;
    loadRegionRegionsMap(cutCode)
      .then((map) => setTerritoryRegionsMap(territoryMapToInternalKeys(map)))
      .catch(() => { /* fallback: keep CONFIG.regions */ });
  }, [activeRegion]);

  const localSeqRef = useRef(0);
  const getNextLocalId = useCallback(() => {
    localSeqRef.current += 1;
    return `LOC-${String(localSeqRef.current).padStart(4, "0")}`;
  }, []);

  const [localCatalog, setLocalCatalog] = useState<LocalCatalog>(() => buildCatalogSeed(createLocalIdGenerator()));

  const [cases, setCases] = useState<CaseItem[]>(() => {
    const cat = buildCatalogSeed(createLocalIdGenerator());
    return makeSeedCases(cat);
  });
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => makeSeedAudit());
  const importJsonInputRef = useRef<HTMLInputElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const onExportState = () => handleExportState({ cases, setAuditLog, currentUser, notify });
  const onImportStateFile = (file: File) => handleImportStateFile({ setCases, setAuditLog, currentUser, notify }, file);

  const [view,setView]=useState<ViewKey>("dashboard");
  const PERSISTABLE_VIEWS = new Set<ViewKey>([
    "dashboard",
    "catalog",
    "audit",
    "reports",
    "simulation",
    "checklist",
    "config",
    "trust",
    "detail",
  ]);
  function viewStorageKey(userId: string) {
    return `SCCE_VIEW:${userId}`;
  }
  function selectedCaseStorageKey(userId: string) {
    return `SCCE_SELECTED_CASE:${userId}`;
  }
  function isPersistableView(view: ViewKey): boolean {
    return PERSISTABLE_VIEWS.has(view);
  }
  const detailRestoreAttemptedRef = useRef(false);
  const hydrationDoneRef = useRef(false);
  const OP_HOME_VIEW = "op_home" as const;
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const defaultUiModeForUser = useCallback((u: User | null): UiMode => {
    return isTerrainMode(u) ? "OP" : "FULL";
  }, []);
  const [uiMode, setUiMode] = useState<UiMode>("FULL");
  const [crisisMode,setCrisisMode]=useState(false);
  const [filterState,setFilterState]=useState<AppFilterState>({criticality:"",status:"",commune:"",search:"",region:""});
  const regionEffective = useMemo(
    () => computeRegionEffective(isCentral, filterState, activeRegion, effectiveMembership),
    [isCentral, filterState, activeRegion, effectiveMembership]
  );
  const [notification, setNotification] = useState<Notification>(null);
  const [simCases,setSimCases]=useState<CaseItem[]>([]);
  const [simReport, setSimReport] = useState<SimReport>(null);
  const [simSurvey,setSimSurvey]=useState({claridad:0,respaldo:0,submitted:false});
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loginErr, setLoginErr] = useState<string>("");
  const [ctxErr, setCtxErr] = useState<string>("");
  const [authBusy, setAuthBusy] = useState(false);
  const [newCase, setNewCase] = useState<CaseItem | null>(null);
  const [evalForm,setEvalForm]=useState({continuidad:0,integridad:0,seguridad:0,exposicion:0,capacidadLocal:0});
  const [bypassForm,setBypassForm]=useState<BypassFormState>({active:false,motivo:"",cause:"",confirmed:false});
  const [step,setStep]=useState(1);
  const [helpOpen,setHelpOpen]=useState(false);
  const [actionsOpen,setActionsOpen]=useState(false);
  const [busyAction, setBusyAction] = useState<Record<string, boolean>>({});
  const withBusy = useCallback(
    (key: string, fn: () => void) => withBusyImpl(key, fn, busyAction, setBusyAction),
    [busyAction, setBusyAction]
  );

  const setViewAndCloseHelp = useCallback<React.Dispatch<React.SetStateAction<ViewKey>>>((value) => {
    setView(value);
    setHelpOpen(false);
  }, [setHelpOpen]);

  const goToSection=(nextView: ViewKey,sectionId: string)=>{
    setViewAndCloseHelp(nextView);
    setActionsOpen(false);
    globalThis.setTimeout(()=>{
      const el=document.getElementById(sectionId);
      el?.scrollIntoView({behavior:"smooth",block:"start"});
    },60);
  };
  useActionsMenuCloseOutside(actionsOpen, setActionsOpen);
  useUiModeFromStorage(currentUser, defaultUiModeForUser, setUiMode);

  useEffect(() => {
    if (!currentUser?.id) {
      hydrationDoneRef.current = false;
      return;
    }

    const savedView = localStorage.getItem(viewStorageKey(currentUser.id)) as ViewKey | null;
    const savedCaseId = localStorage.getItem(selectedCaseStorageKey(currentUser.id));

    if (savedView === "detail" && savedCaseId && cases.length === 0) {
      return;
    }

    if (savedView === "detail" && savedCaseId) {
      const foundCase = cases.find((c) => c.id === savedCaseId) ?? null;

      if (foundCase) {
        detailRestoreAttemptedRef.current = false;
        setSelectedCase(foundCase);
        setView("detail");
        hydrationDoneRef.current = true;
        return;
      }

      if (!detailRestoreAttemptedRef.current) {
        detailRestoreAttemptedRef.current = true;
        return;
      }

      detailRestoreAttemptedRef.current = false;
      setSelectedCase(null);
      setView("dashboard");
      hydrationDoneRef.current = true;
      return;
    }

    if (savedView && isPersistableView(savedView)) {
      setSelectedCase(null);
      setView(savedView);
      hydrationDoneRef.current = true;
    } else {
      setSelectedCase(null);
      setView("dashboard");
      hydrationDoneRef.current = true;
    }
  }, [currentUser?.id, cases]);

  useEffect(() => {
    if (!hydrationDoneRef.current) return;
    if (!currentUser?.id) return;

    if (isPersistableView(view)) {
      localStorage.setItem(viewStorageKey(currentUser.id), view);
    } else {
      localStorage.removeItem(viewStorageKey(currentUser.id));
    }

    if (view === "detail" && selectedCase?.id) {
      localStorage.setItem(selectedCaseStorageKey(currentUser.id), selectedCase.id);
    } else {
      localStorage.removeItem(selectedCaseStorageKey(currentUser.id));
    }
  }, [currentUser?.id, view, selectedCase?.id]);

  const setUiModeAndPersist = useCallback(
    (next: UiMode) => setUiModeAndPersistImpl(next, currentUser?.id, setUiMode),
    [currentUser?.id, setUiMode]
  );

  useKeyboardShortcuts(goToSection);

  const chainResult=useMemo(()=>verifyChain(auditLog),[auditLog]);

  // v1.9: divergencias activas
  const divergencias=useMemo(()=>
    cases
      .filter(c=>!["Resuelto","Cerrado"].includes(c.status))
      .map(c=>({caseId:c.id,caseSummary:c.summary,div:checkLocalDivergence(c,localCatalog)}))
      .filter(x=>x.div!==null)
  ,[cases,localCatalog]);

  useEffect(()=>{
    const v=catalogSelfCheck(localCatalog);
    if(v.length)console.warn("[SCCE][CATALOG-SELFCHECK]",v);
  },[localCatalog]);

  // Hidratar caso con eventos (timeline, actions desde ACTION_ADDED, decisions desde DECISION_ADDED) al abrir detalle
  const detailHydratedCaseIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (view !== "detail" || !selectedCase?.id) {
      detailHydratedCaseIdRef.current = null;
      return;
    }
    const caseId = selectedCase.id;
    if (!authToken || !effectiveMembership || detailHydratedCaseIdRef.current === caseId) return;
    detailHydratedCaseIdRef.current = caseId;
    const headers: Record<string, string> = {};
    if (effectiveMembership.id) headers["x-scce-membership-id"] = effectiveMembership.id;
    if (effectiveMembership.contextType && effectiveMembership.contextId) {
      headers["x-scce-context-type"] = effectiveMembership.contextType;
      headers["x-scce-context-id"] = effectiveMembership.contextId;
    }
    apiRequest<Array<{ id: string; eventType: string; payloadJson: Record<string, unknown>; createdAt: string; actorId: string }>>(
      `/cases/${caseId}/events`,
      { method: "GET", token: authToken, headers: Object.keys(headers).length ? headers : undefined }
    ).then((res) => {
      if (!res.ok || !Array.isArray(res.data)) return;
      const events = res.data;
      const actions = events
        .filter((e) => e.eventType === "ACTION_ADDED")
        .map((e) => ({
          id: e.id,
          action: (e.payloadJson?.action as string) ?? "",
          responsible: (e.payloadJson?.responsible as string) ?? "",
          result: (e.payloadJson?.result as string) ?? "",
          at: new Date(e.createdAt).toISOString(),
        }));
      const decisions = events
        .filter((e) => e.eventType === "DECISION_ADDED")
        .map((e) => ({
          fundament: (e.payloadJson?.fundament as string) ?? "",
          who: (e.payloadJson?.who as string) ?? "",
          at: (e.payloadJson?.at as string) ?? e.createdAt,
        }));
      const timeline: CaseEvent[] = events.map((e) => {
        const at = new Date(e.createdAt).toISOString();
        const base = { eventId: e.id, type: e.eventType, at, actor: e.actorId ?? "" };
        if (e.eventType === "OPERATIONAL_VALIDATION" && (e.payloadJson?.result === "OK" || e.payloadJson?.result === "OBSERVATIONS" || e.payloadJson?.result === "FAIL")) {
          return { ...base, result: e.payloadJson.result as OperationalValidationResult, ...(e.payloadJson?.note != null ? { note: String(e.payloadJson.note) } : {}) };
        }
        return { ...base, ...(e.payloadJson?.note != null ? { note: String(e.payloadJson.note) } : {}) };
      });
      setCases((prev) =>
        prev.map((c) => (c.id === caseId ? ({ ...c, actions, timeline, decisions } as CaseItem) : c))
      );
      setSelectedCase((prev) =>
        prev?.id === caseId ? ({ ...prev, actions, timeline, decisions } as CaseItem) : prev
      );
    });
  }, [view, selectedCase?.id, authToken, effectiveMembership]);

  const showTerrainShell = useMemo(() => currentUser != null && uiMode === "OP", [currentUser, uiMode]);
  useTerrainShellRedirect(showTerrainShell, view, setViewAndCloseHelp, OP_HOME_VIEW);
  const goOpHome = () => {
    setSelectedCase(null);
    setViewAndCloseHelp(OP_HOME_VIEW);
  };
  const goNewCase = () => {
    setSelectedCase(null);
    setViewAndCloseHelp("new_case");
  };

  const notify = useCallback((msg: string, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const bootstrapOpts: BootstrapSessionOptions = useMemo(
    () => ({
      setAuthToken,
      setApiUser,
      setMemberships,
      setActiveMembership,
      setCurrentUser,
      setLoginErr,
      setMembershipScopes,
      setCtxErr,
      setCases,
      setAuditLog,
    }),
    [
      setAuthToken,
      setApiUser,
      setMemberships,
      setActiveMembership,
      setCurrentUser,
      setLoginErr,
      setMembershipScopes,
      setCtxErr,
      setCases,
      setAuditLog,
    ]
  );

  useAppSessionEffects({
    authToken,
    apiUser,
    memberships,
    activeMembership,
    setCurrentUser,
    isCentral,
    justBecameCentralRef,
    activeRegion,
    setActiveRegion,
    setFilterState,
    effectiveMembership,
    membershipScopes,
    bootstrapOpts,
  });

  function doReset(){
    localSeqRef.current = 0;
    const cat = buildCatalogSeed(getNextLocalId);
    const y=Math.max(new Date().getFullYear(),MIN_ELECTION_YEAR);
    clearSession();
    setAuthToken(null);
    setApiUser(null);
    setMemberships([]);
    setActiveMembership(null);
    setLocalCatalog(cat);
    setCases(makeSeedCases(cat));
    setAuditLog(makeSeedAudit());
    setCurrentUser(null);setViewAndCloseHelp("dashboard");setSelectedCase(null);
    setCrisisMode(false);setSimCases([]);setSimReport(null);
    setSimSurvey({claridad:0,respaldo:0,submitted:false});
    setLoginForm({ email: "", password: "" });
    setLoginErr("");
    setCtxErr("");
    setElectionConfig({name:`Elecciones Generales ${y}`,date:`${y}-11-15`,year:y});
  }

  const doLogin = useCallback(
    () =>
      doLoginImpl(loginForm, bootstrapOpts, {
        setLoginErr,
        setCtxErr,
        setAuthBusy,
        setToken,
        setAuthToken,
        setAuditLog,
      }),
    [loginForm, bootstrapOpts, setLoginErr, setCtxErr, setAuthBusy, setAuthToken, setAuditLog]
  );

  const nowLocalInput = useCallback(() => nowLocalDatetimeInput(), []);

  const recepcionar = useCallback(
    (caseId: string) => {
      if (!currentUser) return;
      recepcionarImpl(caseId, { currentUser, cases, notify, setCases, setAuditLog });
    },
    [currentUser, cases, notify, setCases, setAuditLog]
  );

  const changeStatus = useCallback(
    async (caseId: string, newStatus: CaseStatus) => {
      if (!currentUser) return;
      if (newStatus === "Cerrado") {
        const c = cases.find((x) => x.id === caseId);
        if (!c) return;
        const closeError = getCloseCaseValidationError(c);
        if (closeError) {
          notify("❌ " + closeError, "error");
          return;
        }
        const reason = c.closingMotivo ?? "";
        if (authToken && effectiveMembership) {
          const headers: Record<string, string> = {};
          if (effectiveMembership.id) headers["x-scce-membership-id"] = effectiveMembership.id;
          if (effectiveMembership.contextType && effectiveMembership.contextId) {
            headers["x-scce-context-type"] = effectiveMembership.contextType;
            headers["x-scce-context-id"] = effectiveMembership.contextId;
          }
          const res = await apiRequest<unknown>(`/cases/${caseId}/events`, {
            method: "POST",
            token: authToken,
            headers: Object.keys(headers).length ? headers : undefined,
            body: { eventType: "CASE_CLOSED", reason, payloadJson: {} },
          });
          if (!res.ok) {
            notify(res.error ?? UI_TEXT_GOVERNANCE.validationMessages.missingCloseReason, "error");
            return;
          }
        }
      }
      if (newStatus === "Resuelto" && authToken && effectiveMembership) {
        const headers: Record<string, string> = {};
        if (effectiveMembership.id) headers["x-scce-membership-id"] = effectiveMembership.id;
        if (effectiveMembership.contextType && effectiveMembership.contextId) {
          headers["x-scce-context-type"] = effectiveMembership.contextType;
          headers["x-scce-context-id"] = effectiveMembership.contextId;
        }
        const res = await apiRequest<unknown>(`/cases/${caseId}/events`, {
          method: "POST",
          token: authToken,
          headers: Object.keys(headers).length ? headers : undefined,
          body: { eventType: "RESOLVE", payloadJson: { who: currentUser.id, at: nowISO() } },
        });
        if (!res.ok) {
          notify(res.error ?? "Error al marcar caso como resuelto", "error");
          return;
        }
      }
      changeCaseStatusImpl(caseId, newStatus, { currentUser, cases, notify, setCases, setAuditLog });
    },
    [currentUser, cases, notify, setCases, setAuditLog, authToken, effectiveMembership]
  );

  const validateBypass = useCallback(
    (caseId: string, decision: string, fundament: string) => {
      if (!currentUser) return;
      validateBypassImpl(caseId, decision, fundament, { currentUser, setCases, setAuditLog, notify });
    },
    [currentUser, setCases, setAuditLog, notify]
  );

  async function addOperationalValidation(caseId: string, result: OperationalValidationResult, note: string) {
    if (!currentUser) return;
    const ev: CaseEvent = {
      eventId: newEventId("ev"),
      type: "OPERATIONAL_VALIDATION",
      at: nowISO(),
      actor: currentUser.id,
      result,
      ...(note ? { note } : {}),
    };
    if (authToken && effectiveMembership) {
      const headers: Record<string, string> = {};
      if (effectiveMembership.id) headers["x-scce-membership-id"] = effectiveMembership.id;
      if (effectiveMembership.contextType && effectiveMembership.contextId) {
        headers["x-scce-context-type"] = effectiveMembership.contextType;
        headers["x-scce-context-id"] = effectiveMembership.contextId;
      }
      const res = await apiRequest<unknown>(`/cases/${caseId}/events`, {
        method: "POST",
        token: authToken,
        headers: Object.keys(headers).length ? headers : undefined,
        body: { eventType: "OPERATIONAL_VALIDATION", payloadJson: { result, ...(note ? { note } : {}) } },
      });
      if (!res.ok) {
        notify(res.error ?? "Error al guardar validación operacional", "error");
        return;
      }
    }
    setCases((prev) =>
      prev.map((x) => {
        if (x.id === caseId) {
          return { ...x, timeline: pushTimelineEvent(x.timeline ?? [], ev), updatedAt: nowISO() } as CaseItem;
        }
        return x;
      })
    );
    setAuditLog((prev) => appendEvent(prev, "OPERATIONAL_VALIDATION", currentUser.id, currentUser.role, caseId, `${result}${note ? ": " + note.slice(0, 40) : ""}`));
    notify(UI_TEXT_GOVERNANCE.successMessages.operationalValidationSaved, "success");
  }

  async function assignCaseResponsible(caseId: string, selectedUserId: string) {
    const selectedUser = USERS.find((u) => u.id === selectedUserId);
    if (!selectedUser) return;
    const nameToSave = selectedUser.name;
    if (authToken && effectiveMembership) {
      const headers: Record<string, string> = {};
      if (effectiveMembership.id) headers["x-scce-membership-id"] = effectiveMembership.id;
      if (effectiveMembership.contextType && effectiveMembership.contextId) {
        headers["x-scce-context-type"] = effectiveMembership.contextType;
        headers["x-scce-context-id"] = effectiveMembership.contextId;
      }
      const res = await apiRequest<unknown>(`/cases/${caseId}/events`, {
        method: "POST",
        token: authToken,
        headers: Object.keys(headers).length ? headers : undefined,
        body: { eventType: "ASSIGNMENT_CHANGED", payloadJson: { assignedTo: nameToSave } },
      });
      if (!res.ok) {
        console.warn("[SCCE] Assign responsible API failed:", res.error);
        notify(res.error ?? "Error al asignar responsable", "error");
        return;
      }
    }
    setCases((prev) =>
      prev.map((x) => (x.id === caseId ? { ...x, assignedTo: nameToSave, updatedAt: nowISO() } : x))
    );
    setAuditLog((prev) =>
      appendEvent(prev, "ASSIGNED", currentUser!.id, currentUser!.role, caseId, "Asignado a " + nameToSave)
    );
    notify(UI_TEXT_GOVERNANCE.successMessages.commandAssigned, "success");
  }

  function requestReassessment(caseId: string, newEval: Record<string, number>, justification: string){
    if(!currentUser) return;
    const c=cases.find(x=>x.id===caseId);
    if(!c||!canDo("update",currentUser,c))return notify(UI_TEXT.errors.unauthorized,"error");
    const nr=calcCriticality(newEval);
    const snap={previousEval:c.evaluation,at:nowISO(),by:currentUser.id,justification};
    setCases(prev=>prev.map(x=>{
      if(x.id===caseId){
        const tl=[...(x.timeline ?? []),{eventId:newEventId("ev"),type:"REASSESSMENT",at:nowISO(),actor:currentUser.id,note:`Reevaluación: ${justification}`}];
        const upd={...x,evaluation:newEval,criticality:nr.criticality as Criticality,criticalityScore:nr.score,evaluationHistory:[...(x.evaluationHistory||[]),snap],timeline:tl,updatedAt:nowISO()} as CaseItem;
        upd.completeness=calcCompleteness(upd);return upd;
      }
      return x;
    }));
    setAuditLog(prev=>appendEvent(prev,"REASSESSMENT",currentUser.id,currentUser.role,caseId,`Reevaluación: ${justification.slice(0,60)}`));
    notify("Reevaluación registrada","success");
  }

  async function addAction(caseId: string, action: string, responsible: string, result_: string): Promise<boolean> {
    if (!currentUser) return false;
    const c = cases.find((x) => x.id === caseId);
    if (!c || !canDo("update", currentUser, c)) {
      notify(UI_TEXT.errors.unauthorized, "error");
      return false;
    }
    if (authToken && effectiveMembership) {
      const headers: Record<string, string> = {};
      if (effectiveMembership.id) headers["x-scce-membership-id"] = effectiveMembership.id;
      if (effectiveMembership.contextType && effectiveMembership.contextId) {
        headers["x-scce-context-type"] = effectiveMembership.contextType;
        headers["x-scce-context-id"] = effectiveMembership.contextId;
      }
      const res = await apiRequest<unknown>(`/cases/${caseId}/events`, {
        method: "POST",
        token: authToken,
        headers: Object.keys(headers).length ? headers : undefined,
        body: { eventType: "ACTION_ADDED", payloadJson: { action, responsible, result: result_ } },
      });
      if (!res.ok) {
        console.warn("[SCCE] Add action API failed:", res.error);
        notify(res.error ?? UI_TEXT_GOVERNANCE.validationMessages.missingAction, "error");
        return false;
      }
    }
    setCases((prev) =>
      prev.map((x) => {
        if (x.id === caseId) {
          const na = { id: "a" + Date.now(), action, responsible, at: nowISO(), result: result_ };
          const tl = [...(x.timeline ?? [])];
          if (!x.firstActionAt) tl.push({ eventId: newEventId("ev"), type: "FIRST_ACTION", at: nowISO(), actor: currentUser.id, note: action });
          const upd = { ...x, actions: [...(x.actions ?? []), na], firstActionAt: x.firstActionAt || nowISO(), timeline: tl, updatedAt: nowISO() } as CaseItem;
          upd.completeness = calcCompleteness(upd);
          return upd;
        }
        return x;
      })
    );
    setAuditLog((prev) => appendEvent(prev, "ACTION_ADDED", currentUser.id, currentUser.role, caseId, action.slice(0, 80)));
    return true;
  }

  async function addDecision(caseId: string, fundament: string): Promise<void> {
    if (!currentUser) return;
    const c = cases.find((x) => x.id === caseId);
    if (!c || (!canDo("update", currentUser, c) && !canDo("close", currentUser, c))) {
      notify(UI_TEXT.errors.unauthorized, "error");
      return;
    }
    if (authToken && effectiveMembership) {
      const headers: Record<string, string> = {};
      if (effectiveMembership.id) headers["x-scce-membership-id"] = effectiveMembership.id;
      if (effectiveMembership.contextType && effectiveMembership.contextId) {
        headers["x-scce-context-type"] = effectiveMembership.contextType;
        headers["x-scce-context-id"] = effectiveMembership.contextId;
      }
      const res = await apiRequest<unknown>(`/cases/${caseId}/events`, {
        method: "POST",
        token: authToken,
        headers: Object.keys(headers).length ? headers : undefined,
        body: {
          eventType: "DECISION_ADDED",
          payloadJson: { fundament, who: currentUser.id, at: nowISO() },
        },
      });
      if (!res.ok) {
        console.warn("[SCCE] Add decision API failed:", res.error);
        notify(res.error ?? UI_TEXT.errors.alMenosUnaDecision, "error");
        return;
      }
    }
    setCases((prev) =>
      prev.map((x) => {
        if (x.id === caseId) {
          const upd = { ...x, decisions: [...(x.decisions ?? []), { who: currentUser.id, at: nowISO(), fundament }], updatedAt: nowISO() } as CaseItem;
          upd.completeness = calcCompleteness(upd);
          return upd;
        }
        return x;
      })
    );
    setAuditLog((prev) => appendEvent(prev, "DECISION_ADDED", currentUser.id, currentUser.role, caseId, fundament.slice(0, 60)));
  }

  function addComment(caseId: string, comment: string){
    if(!currentUser) return;
    setCases(prev=>prev.map(x=>x.id===caseId?{...x,timeline:[...(x.timeline ?? []),{eventId:newEventId("ev"),type:"COMMENT",at:nowISO(),actor:currentUser.id,note:comment}],updatedAt:nowISO()} as CaseItem:x));
    setAuditLog(prev=>appendEvent(prev,"COMMENT_ADDED",currentUser.id,currentUser.role,caseId,comment.slice(0,80)));
  }

  /** Fase 3.5 — Respuesta de terreno a una instrucción: COMMENT en timeline con refInstructionId. */
  function addInstructionReply(caseId: string, instructionId: string, replyText: string){
    if(!currentUser?.id || !replyText?.trim()) return;
    setCases(prev=>prev.map(x=>x.id===caseId?{...x,timeline:[...(x.timeline ?? []),{eventId:newEventId("ev"),type:"COMMENT",kind:"INSTRUCTION_REPLY",refInstructionId:instructionId,at:nowISO(),actor:currentUser.id,note:replyText.trim()}],updatedAt:nowISO()} as CaseItem:x));
    setAuditLog(prev=>appendEvent(prev,"COMMENT_ADDED",currentUser.id,currentUser.role,caseId,`Respuesta instrucción ${instructionId}: ${replyText.trim().slice(0,60)}`));
  }

  /** Fase 3.8 — evento formal de ciclo de instrucción (append-only en timeline). Fase 3.9: eventId estable. */
  function makeInstructionTraceEvent(kind: CaseEventKind, instructionId: string, note: string): CaseEvent {
    return { eventId: newEventId("ev"), type: "COMMENT", kind, refInstructionId: instructionId, at: nowISO(), actor: currentUser!.id, note };
  }

  type CreateInstructionParams = {
    caseId: string;
    scope: string;
    audience: string;
    summary: string;
    details: string;
    impactLevel?: ImpactLevel;
    scopeFunctional?: ScopeFunctional;
    bypass?: { enabled: boolean; reason?: string };
    cc?: { role?: string; userId?: string; label: string }[];
  };

  function createInstruction(params: CreateInstructionParams): void {
    const {
      caseId,
      scope,
      audience,
      summary,
      details,
      impactLevel = "L1",
      scopeFunctional = "OPERACIONES",
      bypass,
      cc,
    } = params;
    if(!currentUser?.id) return;
    if(!summary?.trim()) return notify(UI_TEXT.errors.instructionSummaryRequired, "error");
    const role = currentUser.role;
    const canL3WithoutBypass = role === "DIRECTOR_REGIONAL" || role === "NIVEL_CENTRAL";
    if (impactLevel === "L3" && !canL3WithoutBypass) {
      if (!bypass?.enabled || !bypass?.reason?.trim()) return notify(UI_TEXT.errors.l3RequiresBypass, "error");
      if (bypass.reason.trim().length < 30) return notify(UI_TEXT.errors.bypassReasonMin, "error");
    }
    if (bypass?.enabled && (!bypass?.reason?.trim() || bypass.reason.trim().length < 30)) {
      return notify(UI_TEXT.errors.bypassReasonMin, "error");
    }
    const newIns: InstructionItem = {
      id: uuidSimple(),
      caseId,
      scope: scope || "LOCAL",
      audience: audience || "AMBOS",
      summary: summary.trim(),
      details: details?.trim() || null,
      createdAt: nowISO(),
      createdBy: currentUser.id,
      status: "PENDIENTE",
      ackRequired: true,
      acks: [],
      evidence: [],
      impactLevel,
      scopeFunctional,
      to: (() => {
        let toLabel: string;
        if (audience === "AMBOS") toLabel = "Dirección Regional / Terreno";
        else if (audience === "PESE") toLabel = "PESE";
        else toLabel = "Delegado";
        let toRole: string | undefined;
        if (audience === "PESE") toRole = "PESE";
        else if (audience === "DELEGADO") toRole = "DELEGADO_JE";
        else toRole = undefined;
        return { label: toLabel, role: toRole };
      })(),
      ...(cc?.length ? { cc } : {}),
      ...(bypass?.enabled && bypass?.reason?.trim()
        ? { bypass: { enabled: true, reason: bypass.reason.trim() } }
        : {}),
    };
    const traceEv = makeInstructionTraceEvent("INSTRUCTION_CREATED", newIns.id, `Instrucción creada: ${newIns.summary.slice(0, 80)}`);
    setCases((prev) =>
      prev.map((x) =>
        x.id === caseId
          ? { ...x, instructions: [...(x.instructions ?? []), newIns], timeline: pushTimelineEvent(x.timeline ?? [], traceEv), updatedAt: nowISO() } as CaseItem
          : x
      )
    );
    setAuditLog((prev) =>
      appendEvent(prev, bypass?.enabled ? "INSTRUCTION_BYPASS_USED" : "COMMENT_ADDED", currentUser.id, currentUser.role, caseId, `Instrucción ${impactLevel}: ${summary.slice(0, 50)}${bypass?.enabled ? " [BYPASS]" : ""}`)
    );
    notify("Instrucción creada", "success");
  }
  function ackInstruction(caseId: string, instructionId: string){
    if(!currentUser?.id) return;
    const c = cases.find((x) => x.id === caseId);
    const ins = c?.instructions?.find((i) => i.id === instructionId);
    if (ins && (ins.acks ?? []).some((a) => a.userId === currentUser.id)) return;
    const role = currentUser?.role ?? "unknown";
    const traceEv = makeInstructionTraceEvent("INSTRUCTION_ACK", instructionId, "Acuse registrado");
    setCases((prev) =>
      updateOneCase(prev, caseId, (x) => {
        const instructions = addAckToInstruction(x.instructions ?? [], instructionId, currentUser.id, role);
        return { ...x, instructions, timeline: pushTimelineEvent(x.timeline ?? [], traceEv), updatedAt: nowISO() } as CaseItem;
      })
    );
    setAuditLog((prev) =>
      appendEvent(prev, "COMMENT_ADDED", currentUser.id, currentUser.role, caseId, `Acuse instrucción ${instructionId}`)
    );
    notify(UI_TEXT.buttons.ackConfirmReceipt, "success");
  }

  /** Fase 3.8 — cierre formal de instrucción (status CERRADA + evento en timeline). Fase 4.0: guard + dedupe. */
  function closeInstruction(caseId: string, instructionId: string){
    if(!currentUser?.id) return;
    const c = cases.find((x) => x.id === caseId);
    const ins = c?.instructions?.find((i) => i.id === instructionId);
    if (ins && isClosedStatus(ins.status)) return;
    const traceEv = makeInstructionTraceEvent("INSTRUCTION_CLOSED", instructionId, "Instrucción cerrada");
    setCases((prev) =>
      updateOneCase(prev, caseId, (x) => {
        const instructions = closeInstructionInList(x.instructions ?? [], instructionId);
        return { ...x, instructions, timeline: pushTimelineEvent(x.timeline ?? [], traceEv), updatedAt: nowISO() } as CaseItem;
      })
    );
    setAuditLog((prev) => appendEvent(prev, "COMMENT_ADDED", currentUser.id, currentUser.role, caseId, `Instrucción cerrada ${instructionId}`));
    notify("Instrucción cerrada", "success");
  }

  function catalogAddLocal(nombre: string, region: string, commune: string, actor: User){
    if(!nombre?.trim())return notify(UI_TEXT.errors.nombreObligatorio,"error");
    if(!commune)return notify(UI_TEXT.errors.seleccioneComuna,"error");
    if(localCatalog.some(l=>l.nombre===nombre&&l.region===region&&l.commune===commune))return notify(`Ya existe "${nombre}" en esa comarca`,"error");
    const entry={idLocal:getNextLocalId(),nombre:nombre.trim(),region,commune,activoGlobal:true,activoEnEleccionActual:true,fechaCreacion:nowISO(),fechaDesactivacion:null,origenSeed:false};
    setLocalCatalog(prev=>[...prev,entry]);
    setAuditLog(prev=>appendEvent(prev,"LOCAL_CREATED",actor.id,actor.role,null,`Local: "${nombre}" [${region}/${commune}]`));
    notify(`Local "${nombre}" añadido`,"success");
  }
  function catalogDeactivate(idLocal: string, actor: User){
    const e=localCatalog.find(l=>l.idLocal===idLocal);
    if(!e?.activoGlobal)return notify("Ya está desactivado","error");
    setLocalCatalog(prev=>prev.map(l=>l.idLocal===idLocal?{...l,activoGlobal:false,activoEnEleccionActual:false,fechaDesactivacion:nowISO()}:l));
    setAuditLog(prev=>appendEvent(prev,"LOCAL_DEACTIVATED",actor.id,actor.role,null,`SD: "${e.nombre}" [${idLocal}]`));
    notify(`Local "${e.nombre}" desactivado`,"warning");
  }
  function catalogReactivate(idLocal: string, actor: User){
    const e=localCatalog.find(l=>l.idLocal===idLocal);
    if(!e||e.activoGlobal)return notify("Ya está activo","error");
    setLocalCatalog(prev=>prev.map(l=>l.idLocal===idLocal?{...l,activoGlobal:true,fechaDesactivacion:null}:l));
    setAuditLog(prev=>appendEvent(prev,"LOCAL_REACTIVATED",actor.id,actor.role,null,`Reactivado: "${e.nombre}" [${idLocal}]`));
    notify(`Local "${e.nombre}" reactivado`,"success");
  }
  function catalogToggleEleccion(idLocal: string, actor: User){
    const e=localCatalog.find(l=>l.idLocal===idLocal);
    if(!e)return;
    if(!e.activoGlobal)return notify("No se puede activar en elección: local desactivado globalmente","error");
    const next=!e.activoEnEleccionActual;
    setLocalCatalog(prev=>prev.map(l=>l.idLocal===idLocal?{...l,activoEnEleccionActual:next}:l));
    setAuditLog(prev=>appendEvent(prev,"LOCAL_ELECTION_TOGGLED",actor.id,actor.role,null,`"${e.nombre}": elección → ${next}`));
    notify(`"${e.nombre}": elección → ${next?"ACTIVO":"INACTIVO"}`,"success");
  }

  function runSimulation(){
    const communes=Object.keys(CONFIG.regions.TRP.communes);
    const sc=SIM_SCENARIOS.map((s,i)=>{
      const result=calcCriticality(s.ev);
      const commune=communes[i%communes.length];
      const activos=getActiveLocals(localCatalog,"TRP",commune);
      const le=activos.length?activos[0]:null;
      return{id:genId("TRP",commune,100+i),region:"TRP",commune,local:le?le.nombre:"Escuela Simulación",localSnapshot:le?{idLocal:le.idLocal,nombre:le.nombre,region:"TRP",commune,snapshotAt:tsISO(30-i*2)}:null,origin:{actor:"Simulación",channel:"Teams",detectedAt:tsISO(30-i*2)},summary:s.summary,detail:"[SIM] "+s.summary,evidence:[],bypass:false,bypassFlagged:false,evaluation:s.ev,evaluationLocked:true,evaluationHistory:[],criticality:result.criticality,criticalityScore:result.score,status:"Nuevo" as CaseStatus,assignedTo:null,slaMinutes:SLA_MINUTES[result.criticality as SlaLevel]||60,closingMotivo:null,bypassValidated:null,timeline:[{type:"DETECTED",at:tsISO(30-i*2),actor:"SIM",note:"Simulación"}],actions:[],decisions:[],completeness:40,reportedAt:tsISO(28-i*2),firstActionAt:null,escalatedAt:null,mitigatedAt:null,resolvedAt:null,closedAt:null,createdBy:"SIM",createdAt:tsISO(30-i*2),updatedAt:tsISO(30-i*2),isSim:true};
    });
    setSimCases(sc as CaseItem[]);
    setSimReport({total:sc.length,critica:sc.filter(c=>c.criticality==="CRITICA").length,alta:sc.filter(c=>c.criticality==="ALTA").length,avgScore:Number((sc.reduce((s,c)=>s+(c.criticalityScore ?? 0),0)/sc.length).toFixed(1))});
    setSimSurvey({claridad:0,respaldo:0,submitted:false});
    notify("Simulación: 10 incidentes generados","warning");
  }
  function loadSimCases(){
    setCases(prev=>([...simCases,...prev.filter(x=>!x.isSim)] as CaseItem[]));
    setAuditLog(prev=>{let log=prev;for(const c of simCases){log=appendEvent(log,"CASE_CREATED","SIM","SIMULACION",c.id,`[SIM] ${c.summary}`);}return log;});
    notify("Incidentes de simulación cargados","warning");
  }

  function exportCSV(){
    if (!currentUser) return;
    const rows=[[ "ID","Región","Comuna","Local","Criticidad","Estado",UI_TEXT.labels.bypassColumn,UI_TEXT.labels.flaggedColumn,"SnapshotID","Creado","Completitud"]];
    cases.forEach(c=>rows.push([c.id,c.region,c.commune,c.local||"—",c.criticality,c.status,c.bypass?"SÍ":"No",c.bypassFlagged?UI_TEXT.states.flaggedShort:"—",c.localSnapshot?.idLocal||"—",fmtDate(c.createdAt),(c.completeness ?? 0)+"%"]));
    const csv=rows.map(r=>r.map(x=>`"${String(x).replaceAll('"', '""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="SCCE_casos.csv";a.click();
    setAuditLog(prev=>appendEvent(prev,"EXPORT_DONE",currentUser.id,currentUser.role,null,"Export CSV"));
    notify("CSV exportado");
  }
  function exportJSON(){
    if (!currentUser) return;
    const metadata={schemaVersion:1,exportedAt:nowISO(),scceVersion:APP_VERSION,election:electionConfig,chainIntegrity:chainResult.ok?"INTEGRA":"COMPROMETIDA"};

    // Guardrail mínimo (Fase 6.1-2): forma del payload
    if (!Array.isArray(cases)){
      alert("Export JSON bloqueado: 'cases' no es un array.");
      return;
    }
    if (!metadata||typeof metadata!=="object"||Array.isArray(metadata)){
      alert("Export JSON bloqueado: 'metadata' no es un objeto válido.");
      return;
    }

    const payload={metadata,cases};
    const json=JSON.stringify(payload,null,2);

    // Guardrail mínimo (Fase 6.1-1): límite de tamaño del export
    const approxBytes=new TextEncoder().encode(json).length;
    const MAX_BYTES=5*1024*1024; // 5 MB
    if (approxBytes>MAX_BYTES){
      alert(`Export JSON bloqueado: ${(approxBytes/(1024*1024)).toFixed(2)} MB excede el máximo de ${(MAX_BYTES/(1024*1024)).toFixed(0)} MB.`);
      return;
    }

    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([json],{type:"application/json"}));
    a.download="SCCE_casos.json";a.click();
    setAuditLog(prev=>appendEvent(prev,"EXPORT_DONE",currentUser.id,currentUser.role,null,"Export JSON"));
    notify("JSON exportado");
  }
  function importJSONClick(){
    if (!currentUser) return;
    importJsonInputRef.current?.click();
  }
  async function importJSONSelected(e: React.ChangeEvent<HTMLInputElement>){
    if (!currentUser) return;
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    try {
      const text = await parseImportFile(file);
      const parsed = JSON.parse(text) as unknown;
      const { casesIn } = validateImportRoot(parsed);
      const seen = new Set<string>();
      for (let i = 0; i < casesIn.length; i++) {
        const c = casesIn[i] as Record<string, unknown>;
        const id = assertIdStable(c?.id);
        if (seen.has(id)) importFail(`Import fail-closed: case.id duplicado "${id}".`);
        seen.add(id);
        validateImportCase(c, i);
      }
      const hasExisting = Array.isArray(cases) && cases.length > 0;
      if (hasExisting && !confirmImportReplace()) {
        alert("Import cancelado: no se realizaron cambios.");
        return;
      }
      const migrated = migrateLegacyInstructionsInCases(casesIn as CaseItem[]);
      setCases(migrated);
      setAuditLog(prev => appendEvent(prev, "IMPORT_DONE", currentUser.id, currentUser.role, null, "Import JSON"));
      notify("JSON importado");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Import JSON bloqueado: JSON inválido (no se pudo interpretar).");
    }
  }
  function exportAuditCSV(){
    if (!currentUser) return;
    const{ok,failIndex}=chainResult;
    const rows=[["EventID","Tipo","Timestamp","Actor","Rol","CaseID","Resumen","Hash","Verificacion"]];
    auditLog.forEach((e,i)=>{const u=USERS.find(u=>u.id===e.actor);rows.push([e.eventId,e.type,e.at,u?.name||e.actor,e.role,e.caseId||"",e.summary,e.hash,!ok&&i===failIndex?"FALLA":"OK"]);});
    const csv=rows.map(r=>r.map(x=>`"${String(x).replaceAll('"', '""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="SCCE_auditoria.csv";a.click();
    setAuditLog(prev=>appendEvent(prev,"EXPORT_DONE",currentUser.id,currentUser.role,null,"Export CSV auditoría"));
    notify("Auditoría exportada");
  }
  function exportCaseTXT(c: CaseItem){
    const ca=auditLog.filter(e=>e.caseId===c.id);
    const div=checkLocalDivergence(c,localCatalog);
    const regionsMap = CONFIG.regions as Record<string, { name?: string; communes?: Record<string, { name?: string }> }>;
    const regionName = regionsMap[c.region]?.name ?? "";
    const communeName = getCommuneDisplayName(regionsMap, c.region ?? "", c.commune ?? "");
    const snapshotLine = c.localSnapshot
      ? `${c.localSnapshot.nombre} [${c.localSnapshot.idLocal}] @ ${fmtDate(c.localSnapshot.snapshotAt)}`
      : "sin snapshot";
    const divLine = div ? `⚠️ DIVERGENCIA: ${div.msg}\n` : "";
    const bypassLine = c.bypass ? `SÍ — ${c.bypassMotivo}` : "No";
    const actionsBlock = (c.actions as { action?: string; result?: string }[])?.length
      ? (c.actions as { action?: string; result?: string }[]).map((a: { action?: string; result?: string }) => `• ${a.action} → ${a.result||"—"}`).join("\n")
      : "—";
    const decisionsBlock = (c.decisions as { who?: string; fundament?: string }[])?.length
      ? (c.decisions as { who?: string; fundament?: string }[]).map((d: { who?: string; fundament?: string }) => `• ${USERS.find(u=>u.id===d.who)?.name}: ${d.fundament}`).join("\n")
      : "—";
    const auditBlock = ca.length ? ca.map(e=>`[${e.at}] ${e.type} | ${USERS.find(u=>u.id===e.actor)?.name||e.actor} | ${e.summary} | ${e.hash}`).join("\n") : "—";
    const txt = [
      `SCCE v${APP_VERSION} — REPORTE DE CASO`,
      `ID: ${c.id}`,
      `Elección: ${electionConfig.name} · ${electionConfig.date}`,
      `Región: ${regionName}`,
      `Comuna: ${communeName}`,
      `Local: ${c.local||"—"}`,
      `Snapshot: ${snapshotLine}`,
      divLine,
      `CRITICIDAD: ${c.criticality} (${c.criticalityScore}/15)`,
      `ESTADO: ${c.status}`,
      `${UI_TEXT.misc.reporteBypassLabel}: ${bypassLine}`,
      "",
      `RESUMEN: ${c.summary}`,
      `DETALLE: ${c.detail||"—"}`,
      "",
      `${UI_TEXT_GOVERNANCE.sections.actions.toUpperCase()}:\n${actionsBlock}`,
      "",
      `${UI_TEXT_GOVERNANCE.sections.decisions.toUpperCase()}:\n${decisionsBlock}`,
      "",
      `AUDITORÍA (${ca.length} eventos):\n${auditBlock}`,
      "",
      `Generado: ${nowISO()}`,
      `SCCE v${APP_VERSION} — SERVEL Chile`,
    ].join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"text/plain"}));a.download=`SCCE_${c.id}.txt`;a.click();
    notify("Reporte exportado");
  }

  const fixedLocalRole = isFixedLocalRoleModule(currentUser);

  const localCatalogById = useMemo(() => new Map(localCatalog.map((e) => [e.idLocal, e])), [localCatalog]);

  const assignedLocalIdEffective = useMemo(
    () => computeAssignedLocalIdEffective(fixedLocalRole, currentUser, localCatalog, localCatalogById),
    [fixedLocalRole, currentUser, localCatalog, localCatalogById]
  );

  const assignedLocal = useMemo(() => {
    if (!assignedLocalIdEffective) return null;
    return localCatalogById.get(assignedLocalIdEffective) ?? null;
  }, [assignedLocalIdEffective, localCatalogById]);

  const assignedCommuneEffective = assignedLocal?.commune ?? "";

  const startNewCase = useCallback(() => {
    if (!currentUser) return;
    startNewCaseImpl({
      currentUser,
      activeRegion,
      assignedCommuneEffective,
      assignedLocal,
      setNewCase,
      setEvalForm,
      setBypassForm,
      setStep,
      setView: setViewAndCloseHelp,
      nowLocalInput,
    });
  }, [currentUser, activeRegion, assignedCommuneEffective, assignedLocal, setNewCase, setEvalForm, setBypassForm, setStep, setViewAndCloseHelp, nowLocalInput]);

  const submitCase = useCallback(async () => {
    if (!currentUser || !newCase) return;
    await submitNewCaseImpl({
      newCase,
      currentUser,
      localCatalog,
      evalForm,
      bypassForm,
      cases,
      activeRegion,
      authToken,
      assignedCommuneEffective,
      assignedLocalIdEffective,
      notify,
      setCases,
      setAuditLog,
      setView: setViewAndCloseHelp,
      setNewCase,
    });
  }, [newCase, currentUser, localCatalog, evalForm, bypassForm, cases, activeRegion, authToken, assignedCommuneEffective, assignedLocalIdEffective, notify, setCases, setAuditLog, setViewAndCloseHelp, setNewCase]);

  // Filtro efectivo: con rol local fijo la comuna se deriva de assignedCommuneEffective (evita setState en effect)
  const effectiveFilterState = useMemo(() => {
    if (!fixedLocalRole) return filterState;
    const nextCommune = assignedCommuneEffective || "";
    if ((filterState.commune || "") === nextCommune) return filterState;
    return { ...filterState, commune: nextCommune };
  }, [fixedLocalRole, assignedCommuneEffective, filterState]);

  const visibleCases = useMemo(
    () =>
      cases.filter((c) =>
        isCaseVisible(c, {
          currentUser,
          activeRegion,
          filterState: effectiveFilterState,
          fixedLocalRole,
          assignedLocalIdEffective,
          localCatalogById,
          isCentral,
        })
      ),
    [cases, currentUser, activeRegion, effectiveFilterState, fixedLocalRole, assignedLocalIdEffective, localCatalogById, isCentral]
  );

  const metrics=useMemo(()=>({
    total:visibleCases.length,
    critica:visibleCases.filter(c=>c.criticality==="CRITICA").length,
    alta:visibleCases.filter(c=>c.criticality==="ALTA").length,
    open:visibleCases.filter(c=>!["Resuelto","Cerrado"].includes(normalizeStatus(c.status))).length,
    slaVencido:visibleCases.filter(c=>isSlaVencido(c)).length,
    flagged:visibleCases.filter(c=>c.bypassFlagged&&!c.bypassValidated).length,
  }),[visibleCases]);

  // ─── DASHBOARD (gate inyectado en views/dashboard) ─────────────────────────
  const regionsMap = CONFIG.regions as Record<string, { name?: string; communes?: Record<string, { name?: string }> }>;
  const dashboardGate = {
    setView: (v: string) => setViewAndCloseHelp(v as ViewKey),
    setSelectedCase,
    cases,
    visibleCases,
    metrics,
    divergencias,
    S,
    themeColor,
    crisisMode,
    setCrisisMode,
    filterState: effectiveFilterState,
    setFilterState,
    regionOptions,
    isCentral,
    regionEffective,
    activeRegion,
    fixedLocalRole,
    assignedCommuneEffective,
    assignedLocal,
    assignedLocalIdEffective,
    regionsMap,
    normalizeStatus,
    statusColor,
    critColor,
    isSlaVencido,
    currentUser,
    canDo,
    changeStatus,
    RecBadge,
    recepcionar,
    checkLocalDivergence,
    localCatalog,
    fmtDate,
    UI_TEXT,
    UI_TEXT_GOVERNANCE,
    Badge,
    Tooltip,
    SlaBadge,
    IconButton,
  };

  // ─── NEW CASE FORM (componente a nivel de módulo; datos vía gate) ─────────
  const newCaseFormRegionsMap = territoryRegionsMap ?? regionsMap;
  const newCaseFormGate: NewCaseFormGate = {
    newCase,
    setNewCase,
    evalForm,
    setEvalForm,
    bypassForm,
    setBypassForm,
    step,
    setStep,
    regionsMap: newCaseFormRegionsMap,
    activeMembership: activeMembership ?? null,
    activeRegion,
    assignedCommuneEffective,
    assignedLocalIdEffective: assignedLocalIdEffective ?? null,
    assignedLocal,
    localCatalog,
    setView: setViewAndCloseHelp,
    canDo: canDo as (action: string, user: User | null) => boolean,
    currentUser,
    notify,
    submitCase,
    withBusy,
    busyAction,
    nowLocalInput,
  };

  // ─── Rol simulado activo (solo cuando contexto es SIMULACION); una sola resolución para barra y gates ───
  const activeSimulatedRole = activeMembership?.contextType === "SIMULACION" ? getSimulatedRole(simulatedRoleId) : undefined;

  // ─── CASE DETAIL (gate inyectado en views/case/CaseDetailView) ───────────
  const caseDetailGate = {
    setView: (v: string) => setViewAndCloseHelp(v as ViewKey),
    cases,
    setCases,
    setAuditLog,
    auditLog,
    localCatalog,
    currentUser: currentUser ?? null,
    uiMode,
    notify,
    exportCaseTXT,
    assignCaseResponsible,
    changeStatus,
    canDo,
    addAction,
    addDecision,
    addComment,
    validateBypass,
    addOperationalValidation,
    requestReassessment,
    ackInstruction,
    closeInstruction,
    addInstructionReply,
    createInstruction,
    withBusy,
    busyAction,
    chainResult,
    isNivelCentral,
    normalizeStatus,
    critColor,
    statusColor,
    USERS,
    regionsMap,
    S,
    themeColor,
    ClosedOverlay,
    SlaBadge,
    RecBadge,
    isInstructionAckedByUser,
    lastAck,
    contextType: activeMembership?.contextType,
    simulatedRoleId: activeSimulatedRole?.id,
    simulatedRoleLabel: activeSimulatedRole?.label,
  };

  // ─── CATALOG VIEW (gate inyectado en views/catalog) ────────────────────────
  const catalogGate = {
    activeRegion,
    regionOptions,
    regionsMap,
    localCatalog,
    divergencias,
    cases,
    S,
    themeColor,
    catalogSelfCheck,
    currentUser,
    catalogAddLocal,
    catalogToggleEleccion,
    catalogDeactivate,
    catalogReactivate,
    auditLog,
    USERS,
    fmtDate,
    UI_TEXT_GOVERNANCE,
    Badge,
  };

  // ─── REPORTS ─────────────────────────────────────────────────────────────
  const reportsGate: ReportsGate = {
    cases,
    divergencias,
    S,
    themeColor: themeColor as (key: string) => string,
    critColor,
    timeDiff,
    isSlaVencido,
    importJsonInputRef,
    importFileRef,
    importJSONSelected: (e: React.ChangeEvent<HTMLInputElement>): void => { void importJSONSelected(e); },
    onImportStateFile: (file: File): void => { void onImportStateFile(file); },
    canDo: canDo as (action: string, user: unknown, c?: CaseItem | null) => boolean,
    currentUser,
    exportCSV,
    exportJSON,
    importJSONClick,
    exportAuditCSV,
  };

  // ─── AUDIT VIEW ───────────────────────────────────────────────────────────
  const auditGate: AuditGate = {
    auditLog,
    chainResult,
    S,
    themeColor: themeColor as (key: string) => string,
    fmtDate,
    USERS,
    UI_TEXT_GOVERNANCE,
    canDo: canDo as (action: string, user: unknown, c?: CaseItem | null) => boolean,
    currentUser,
    exportAuditCSV,
    Badge: Badge as unknown as AuditGate["Badge"],
    Tooltip: Tooltip as unknown as AuditGate["Tooltip"],
  };

  // ─── SIMULATION VIEW ──────────────────────────────────────────────────────
  const simulationGate: SimulationGate = {
    simCases,
    simReport,
    simSurvey,
    setSimSurvey,
    runSimulation,
    loadSimCases,
    S,
    themeColor: themeColor as (key: string) => string,
    critColor: critColor as (criticality: string) => string,
    Badge: Badge as unknown as SimulationGate["Badge"],
    contextType: activeMembership?.contextType,
    simulatedRoleId: activeSimulatedRole?.id,
    simulatedRoleLabel: activeSimulatedRole?.label,
  };

  // ─── CHECKLIST ────────────────────────────────────────────────────────────
  const checklistGate: ChecklistGate = {
    S,
    themeColor: themeColor as (key: string) => string,
    Badge: Badge as unknown as ChecklistGate["Badge"],
  };

  // ─── CONFIG VIEW ──────────────────────────────────────────────────────────
  const applyConfig = (draft: ElectionConfigShape, confirmYear: boolean) => {
    if (!currentUser) return;
    const yearChanged = draft.year !== electionConfig.year;
    const activeCatalogCount = localCatalog.filter((l) => l.activoEnEleccionActual).length;
    if (yearChanged && !confirmYear) return notify("Confirma el cambio de año electoral", "error");
    setElectionConfig({ ...draft, name: draft.name || `Elecciones Generales ${draft.year}` });
    if (yearChanged) {
      setAuditLog((prev) =>
        appendEvent(
          prev,
          "ELECTION_YEAR_CHANGED",
          currentUser.id,
          currentUser.role,
          null,
          `Año: ${electionConfig.year} → ${draft.year}. Locales activos: ${activeCatalogCount}`
        )
      );
      notify(`Año actualizado a ${draft.year}. Revise activación de locales en Catálogo.`, "warning");
    } else {
      notify("Configuración guardada", "success");
    }
  };
  const configGate: ConfigGate = {
    electionConfig,
    applyConfig,
    localCatalog,
    chainResult,
    divergencias,
    APP_VERSION,
    MIN_ELECTION_YEAR,
    doReset,
    S,
    themeColor: themeColor as (key: string) => string,
  };

  // ─── FIRMA Y CONFIANZA (4.3.b) ─────────────────────────────────────────────
  const onTrustKeyAdded = (alias: string, fingerprint: string): void => {
    if (currentUser?.id)
      setAuditLog((prev) =>
        appendEvent(prev, "TRUST_KEY_ADDED", currentUser.id, currentUser.role, null, `${alias} – ${fingerprint}`)
      );
  };
  const onTrustKeyRemoved = (alias: string, fingerprint: string): void => {
    if (currentUser?.id)
      setAuditLog((prev) =>
        appendEvent(prev, "TRUST_KEY_REMOVED", currentUser.id, currentUser.role, null, `${alias} – ${fingerprint}`)
      );
  };
  const trustGate: TrustGate = {
    notify,
    onTrustKeyAdded,
    onTrustKeyRemoved,
    currentUser,
    UI_TEXT,
    S,
    themeColor: themeColor as (key: string) => string,
    setView: setViewAndCloseHelp as (v: string) => void,
  };

  // Objeto único para compuertas (reduce complejidad cognitiva de App)
  const app: SCCEAppGate = {
    authToken,
    activeMembership,
    currentUser,
    loginForm,
    setLoginForm,
    showPassword,
    setShowPassword,
    loginErr,
    ctxErr,
    authBusy,
    doLogin: () => { void doLogin(); },
    doReset,
    memberships,
    setActiveMembership,
    setAuditLog,
    apiUser,
    clearSession,
    setAuthToken,
    setApiUser,
    setMemberships,
    setCurrentUser,
    setLoginErr,
    setCtxErr,
  };

  if (!authToken) return <LoginScreen app={app} />;
  if (!activeMembership) return <ContextSelectorScreen app={app} />;
  if (!currentUser) return <LoadingScreen />;
  if (!currentUser?.id || !hydrationDoneRef.current) {
    return <div style={{ padding: 24 }}>Cargando...</div>;
  }

  const user = currentUser;

  // ─── LAYOUT PRINCIPAL ─────────────────────────────────────────────────────
  return (
    showTerrainShell ? (
      <TerrainShell
        currentUser={user}
        cases={visibleCases}
        selectedCaseId={selectedCase?.id ?? null}
        setSelectedCaseId={(id) => {
          const found = cases.find((x) => x.id === id) ?? null;
          setSelectedCase(found);
          setViewAndCloseHelp("detail");
        }}
        onGoToDashboard={() => {
          setUiModeAndPersist("FULL");
          setViewAndCloseHelp("dashboard");
          setSelectedCase(null);
        }}
        onLogout={() => {
          clearSession();
          setAuthToken(null);
          setApiUser(null);
          setMemberships([]);
          setActiveMembership(null);
          setCurrentUser(null);
          setLoginErr("");
          setCtxErr("");
        }}
        membershipsCount={memberships.length}
        onSwitchContext={() => {
          clearActiveMembership();
          setActiveMembership(null);
        }}
        isCrisisMode={crisisMode}
      >
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
            {view !== OP_HOME_VIEW && (
              <button type="button" style={S.btn("dark")} onClick={goOpHome}>
                ← Volver
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" style={{ ...S.btn("primary"), minWidth: 220 }} onClick={goNewCase}>
              + Nuevo incidente
            </button>
          </div>
          {(() => {
            if (view === "new_case") return <NewCaseForm gate={newCaseFormGate} hideBack />;
            if (view === "detail" && selectedCase) return <CaseDetailView gate={caseDetailGate as CaseDetailGate} selectedCaseId={selectedCase?.id ?? null} />;
            return <OpHome onNew={goNewCase} />;
          })()}
        </div>
      </TerrainShell>
    ) : (
    <div style={S.app}>
      <style>{`.tipWrap:hover .tip{display:block!important}input,select,textarea{color:var(--text-primary)!important}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:#0f1117}::-webkit-scrollbar-thumb{background:#374151;border-radius:2px}`}</style>
      <div style={S.nav}>
        <span style={{fontWeight:800,color:themeColor("primary"),fontSize:"13px",marginRight:4,letterSpacing:.5}}>SCCE</span>
        <span style={{color:themeColor("mutedDarker"),fontSize:"10px",marginRight:8}}>v{APP_VERSION}</span>
        {(["dashboard","catalog","audit","reports","simulation","checklist","config"] as const).map(v=>(
          <button key={v} style={S.nBtn(view===v)} onClick={()=>setViewAndCloseHelp(v)}>
            {NAV_LABELS[v] ?? v}
          </button>
        ))}
        <button style={{background:themeColor("greenText"),color:themeColor("white"),border:"1px solid #22c55e66",padding:"5px 12px",borderRadius:"4px",cursor:"pointer",fontSize:"12px",fontWeight:700,boxShadow:"0 0 8px #16a34a44"}} onClick={startNewCase}>+ Incidente</button>
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          <div data-actions-menu style={{position:"relative",display:"flex",alignItems:"center"}}>
            <button type="button" onClick={()=>setActionsOpen(v=>!v)} title="Acciones globales: Exportar / Importar / Reset Demo" style={S.nBtn(false)} aria-label="Abrir acciones globales" aria-expanded={actionsOpen}>Acciones ▾</button>
            {actionsOpen&&(
              <div style={{position:"absolute",right:0,top:"calc(100% + 6px)",minWidth:220,background:themeColor("white"),border:"1px solid rgba(0,0,0,0.12)",borderRadius:12,boxShadow:"0 12px 30px rgba(0,0,0,0.18)",padding:6,zIndex:1200}} role="menu" aria-label="Acciones globales">
                <div style={{fontSize:10,opacity:0.7,padding:"6px 8px"}}>Atajos: Ctrl+E Export · Ctrl+I Import</div>
                <button type="button" role="menuitem" onClick={onExportState} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:10,border:"0",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:800}}>
                  📤 {UI_TEXT.buttons.exportState ?? "Exportar"}
                </button>
                <button type="button" role="menuitem" onClick={()=>importFileRef.current?.click()} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:10,border:"0",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:800}}>
                  📥 {UI_TEXT.buttons.importState ?? "Importar"}
                </button>
                <button type="button" role="menuitem" onClick={()=>{setViewAndCloseHelp("trust");setActionsOpen(false);}} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:10,border:"0",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:800}}>
                  🔐 {UI_TEXT.labels.trustPanelTitle ?? "Firma y confianza"}
                </button>
                <div style={{height:1,background:"rgba(0,0,0,0.08)",margin:"6px 6px"}} />
                <button type="button" role="menuitem" onClick={()=>goToSection("reports","reports-export")} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:10,border:"0",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:800}}>
                  📦 Exportar (CSV/JSON)
                  <div style={{fontSize:10,fontWeight:600,opacity:0.7,marginTop:2}}>Ir a Reportes → Exportar</div>
                </button>
                <button type="button" role="menuitem" onClick={()=>goToSection("reports","reports-import")} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:10,border:"0",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:800}}>
                  📥 Importar JSON
                  <div style={{fontSize:10,fontWeight:600,opacity:0.7,marginTop:2}}>Ir a Reportes → Importar</div>
                </button>
                <div style={{height:1,background:"rgba(0,0,0,0.08)",margin:"6px 6px"}} />
                <button type="button" role="menuitem" onClick={()=>goToSection("config","config-reset")} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:10,border:"0",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:800}}>
                  🧨 Reset Demo
                  <div style={{fontSize:10,fontWeight:600,opacity:0.7,marginTop:2}}>Ir a Config → Resetear sistema</div>
                </button>
              </div>
            )}
          </div>
          <button type="button" onClick={()=>setHelpOpen(true)} title="Ayuda del módulo actual" style={S.nBtn(false)} aria-label="Abrir ayuda">?</button>
          {divergencias.length > 0 && (
          <Badge
            style={{ ...S.badge(themeColor("warning")) }}
            size="xs"
            onClick={() => setViewAndCloseHelp("catalog")}
          >
            ⚡ {divergencias.length}
          </Badge>
        )}
          <div style={{ display: "flex", gap: 4, alignItems: "center", marginRight: 6 }}>
            <span style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 700 }}>Vista:</span>
            <button type="button" style={S.nBtn(uiMode === "OP")} onClick={() => setUiModeAndPersist("OP")} title="Vista operativa (terreno)">Operativa</button>
            <button type="button" style={S.nBtn(uiMode === "FULL")} onClick={() => setUiModeAndPersist("FULL")} title="Vista completa (central)">Completa</button>
          </div>
          <span style={{fontSize:"10px",color:themeColor("mutedDark")}}>{electionConfig.name}</span>
          {activeMembership && (
            <>
              <Badge style={{ ...S.badge(themeColor("legacyGreenDark")) }} size="xs" title={`Contexto actual: ${activeMembership.contextType}/${activeMembership.contextId}. Click para cambiar.`}>
                {activeMembership.contextType}/{activeMembership.contextId}
              </Badge>
              {activeSimulatedRole && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600 }}>
                    Modo simulación · Actuando como: {activeSimulatedRole.label}
                  </span>
                  <span style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600 }}>Actuar como:</span>
                  <select
                    value={simulatedRoleId}
                    onChange={(e) => setSimulatedRoleId(e.target.value as SimulatedRoleId)}
                    title="Rol simulado en el ejercicio (solo perspectiva, no cambia permisos reales)"
                    style={{ fontSize: "11px", padding: "4px 8px", borderRadius: 6, border: `1px solid ${themeColor("mutedDarker")}`, background: themeColor("white"), color: themeColor("textPrimary"), fontWeight: 600 }}
                    aria-label="Rol simulado en simulación"
                  >
                    {SIMULATED_ROLES.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
              )}
              {memberships.length > 1 && (
                <button
                  type="button"
                  style={{ ...S.btn("dark"), fontSize: "11px", padding: "4px 8px" }}
                  onClick={() => {
                    clearActiveMembership();
                    setActiveMembership(null);
                    setAuditLog((prev) => appendEvent(prev, "CONTEXT_SWITCH", "ui", "Usuario", null, "Cambio de contexto solicitado"));
                  }}
                  title="Elegir otro rol/contexto sin cerrar sesión"
                >
                  Cambiar contexto
                </button>
              )}
            </>
          )}
          <Badge style={S.badge(themeColor("mutedDarker"))} size="sm">
            {user.name}
          </Badge>
          <Badge style={{ ...S.badge(themeColor("blueDark")) }} size="xs">
            {activeSimulatedRole?.label ?? ROLE_LABELS[user.role]}
          </Badge>
          <button
            style={{ ...S.btn("dark"), fontSize: "11px" }}
            onClick={() => {
              clearSession();
              setAuthToken(null);
              setApiUser(null);
              setMemberships([]);
              setActiveMembership(null);
              setCurrentUser(null);
              setLoginErr("");
              setCtxErr("");
            }}
          >
            Salir
          </button>
        </div>
      </div>

      {notification&&(
        <div style={{background:{error:themeColor("danger"),success:themeColor("success"),warning:themeColor("warning"),info:themeColor("primary")}[notification.type]||themeColor("primary"),color:themeColor("white"),padding:"8px 16px",fontSize:"12px",fontWeight:600,position:"sticky",top:0,zIndex:100}}>
          {notification.msg}
        </div>
      )}

      <div style={{maxWidth:1100,margin:"0 auto",padding:"12px 16px"}}>
        {view==="dashboard"&&<DashboardGateWrapper gate={dashboardGate as DashboardGate} />}
        {view==="new_case"&&<NewCaseForm gate={newCaseFormGate} />}
        {view==="detail"&&<CaseDetailView gate={caseDetailGate as CaseDetailGate} selectedCaseId={selectedCase?.id ?? null} />}
        {view==="catalog"&&<CatalogGateWrapper gate={catalogGate as CatalogGate} />}
        {view==="audit"&&<AuditGateWrapper gate={auditGate} />}
        {view==="reports"&&<ReportsGateWrapper gate={reportsGate} />}
        {view==="simulation"&&<SimulationGateWrapper gate={simulationGate} />}
        {view==="checklist"&&<ChecklistGateWrapper gate={checklistGate} />}
        {view==="config"&&<ConfigGateWrapper gate={configGate} />}
        {view==="trust"&&<TrustGateWrapper gate={trustGate} />}
      </div>
      <HelpDrawer open={helpOpen} onClose={()=>setHelpOpen(false)} content={helpByView[view]??helpByView.dashboard} caseContext={view==="detail"?cases.find((x): x is CaseItem=>x.id===selectedCase?.id)??null:null} />
    </div>
  ) );
}
