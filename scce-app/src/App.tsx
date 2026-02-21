import React, { useState, useMemo, useEffect } from "react";

const APP_VERSION = "1.9";
const MIN_ELECTION_YEAR = 2026;

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

const USERS = [
  {id:"u1",name:"PESE Local",                  username:"pese1",         password:"demo",role:"PESE",               region:"TRP",commune:"IQQ"},
  {id:"u2",name:"Delegado Junta Electoral",     username:"delegado1",     password:"demo",role:"DELEGADO_JE",        region:"TRP",commune:"IQQ"},
  {id:"u3",name:"Funcionario DR Eventual",      username:"dr_eventual",   password:"demo",role:"DR_EVENTUAL",        region:"TRP"},
  {id:"u4",name:"Funcionario Registro SCCE",    username:"registro",      password:"demo",role:"REGISTRO_SCCE",      region:"TRP"},
  {id:"u5",name:"Funcionario Jefe Operaciones", username:"jefe_ops",      password:"demo",role:"JEFE_OPS",           region:"TRP"},
  {id:"u6",name:"Funcionario Encargado Gasto",  username:"gasto",         password:"demo",role:"ENCARGADO_GASTO",    region:"TRP"},
  {id:"u7",name:"Director Regional",            username:"director",      password:"demo",role:"DIRECTOR_REGIONAL",  region:"TRP"},
  {id:"u8",name:"Usuario Nivel Central",        username:"nivel_central", password:"demo",role:"NIVEL_CENTRAL",      region:null},
];
const ROLE_LABELS = {PESE:"PESE",DELEGADO_JE:"Delegado JE",DR_EVENTUAL:"DR Eventual",REGISTRO_SCCE:"Registro SCCE",JEFE_OPS:"Jefe Ops",ENCARGADO_GASTO:"Encargado Gasto",DIRECTOR_REGIONAL:"Director Regional",NIVEL_CENTRAL:"Nivel Central"} as const;
const POLICIES = {
  PESE:              {create:true, update:false,assign:false,close:false,bypass:false,viewAll:false,comment:true, instruct:false,recepcionar:false,export:false,validateBypass:false,manageCatalog:false},
  DELEGADO_JE:       {create:true, update:false,assign:false,close:false,bypass:false,viewAll:false,comment:true, instruct:false,recepcionar:false,export:false,validateBypass:false,manageCatalog:false},
  DR_EVENTUAL:       {create:true, update:true, assign:false,close:false,bypass:false,viewAll:false,comment:true, instruct:false,recepcionar:false,export:false,validateBypass:false,manageCatalog:false},
  REGISTRO_SCCE:     {create:true, update:true, assign:true, close:false,bypass:true, viewAll:true, comment:true, instruct:false,recepcionar:true, export:true, validateBypass:false,manageCatalog:false},
  JEFE_OPS:          {create:false,update:true, assign:true, close:false,bypass:false,viewAll:true, comment:true, instruct:false,recepcionar:false,export:true, validateBypass:false,manageCatalog:false},
  ENCARGADO_GASTO:   {create:false,update:false,assign:false,close:false,bypass:false,viewAll:true, comment:true, instruct:false,recepcionar:false,export:false,validateBypass:false,manageCatalog:false},
  DIRECTOR_REGIONAL: {create:true, update:true, assign:true, close:true, bypass:true, viewAll:true, comment:true, instruct:false,recepcionar:true, export:true, validateBypass:true, manageCatalog:false},
  NIVEL_CENTRAL:     {create:false,update:false,assign:false,close:false,bypass:false,viewAll:true, comment:true, instruct:true, recepcionar:false,export:true, validateBypass:false,manageCatalog:true},
} as const;
const SLA_MINUTES: Record<string, number> = { CRITICA: 5, ALTA: 15, MEDIA: 60, BAJA: 120 };

// =====================
// Tipado mínimo SCCE (Enterprise)
// =====================
type Role = keyof typeof POLICIES;
type PolicyAction = keyof (typeof POLICIES)[Role];

type Criticality = "CRITICA" | "ALTA" | "MEDIA" | "BAJA";

type RecLevel = "high" | "medium" | "low";

type CaseStatus =
  | "Nuevo"
  | "Recepcionado por DR"
  | "En gestión"
  | "Escalado"
  | "Mitigado"
  | "Resuelto"
  | "Cerrado";

type Notification = { msg: string; type: string } | null;

type User = {
  id: string;
  name: string;
  role: Role;
  region?: string | null;
  username?: string;
  password?: string;
  commune?: string;
};

type CaseEvent = {
  type: string;
  at: string;
  actor: string;
  note?: string;
};

type CaseItem = {
  id: string;
  region: string;
  commune: string;
  status: CaseStatus;
  criticality: Criticality;
  summary: string;
  local?: string;
  localSnapshot?: { idLocal: string; nombre: string; region: string; commune: string; snapshotAt: string } | null;
  origin?: { actor: string; channel: string; detectedAt: string };
  timeline?: CaseEvent[];
  evaluation?: Record<string, number>;
  criticalityScore?: number;
  detail?: string;
  evidence?: string[];
  actions?: unknown[];
  decisions?: unknown[];
  assignedTo?: string | null;
  closingMotivo?: string | null;
  bypass?: boolean;
  bypassMotivo?: string;
  bypassActor?: string | null;
  bypassFlagged?: boolean;
  peseInoperante?: boolean;
  evaluationLocked?: boolean;
  evaluationHistory?: unknown[];
  slaMinutes?: number;
  bypassValidated?: string | null;
  completeness?: number;
  reportedAt?: string | null;
  firstActionAt?: string | null;
  escalatedAt?: string | null;
  mitigatedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  isSim?: boolean;
};

type SimReport = {
  total: number;
  critica?: number;
  alta?: number;
  avgScore?: number;
  byStatus?: Partial<Record<CaseStatus, number>>;
  byCriticality?: Partial<Record<Criticality, number>>;
} | null;

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
type RegionCode = string;
type CommuneCode = string;

type SlaLevel = "CRITICA" | "ALTA" | "MEDIA" | "BAJA";

type LncDraft = {
  region?: string;
  commune?: string;
  local?: string;
  origin?: { channel?: string; detectedAt?: string };
  summary?: string;
  [key: string]: unknown;
};

type LocalCatalogEntry = {
  idLocal: string;
  nombre: string;
  region: RegionCode;
  commune: CommuneCode;
  activoGlobal: boolean;
  activoEnEleccionActual: boolean;
  fechaCreacion: string; // ISO
  fechaDesactivacion: string | null; // ISO o null
  origenSeed: boolean;
};

type LocalCatalog = LocalCatalogEntry[];

// Tipos mínimos para log de auditoría (evita TS7022/TS7006 en appendEvent/buildSeedLog/verifyChain)
type AuditLogEntry = {
  eventId: string;
  type: string;
  at: string;
  actor: string;
  role: string;
  caseId: string | null;
  summary: string;
  prevHash: string;
  hash: string;
};

// ─── CATÁLOGO ────────────────────────────────────────────────────────────────
let _localSeq = 0;

function newLocalId(): string {
  return `LOC-${String(++_localSeq).padStart(4, "0")}`;
}

function buildCatalogSeed(): LocalCatalog {
  const now = new Date().toISOString();
  const entries: LocalCatalog = [];

  Object.entries(CONFIG.regions).forEach(([rc, rd]) => {
    Object.entries(rd.communes).forEach(([cc, cd]) => {
      (cd.locals || []).forEach((nombre: string) => {
        entries.push({
          idLocal: newLocalId(),
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

function findActiveLocal(
  catalog: LocalCatalog,
  region: RegionCode,
  commune: CommuneCode,
  nombre: string
): LocalCatalogEntry | null {
  return (
    catalog.find(
      (l: LocalCatalogEntry) =>
        l.region === region &&
        l.commune === commune &&
        l.nombre === nombre &&
        l.activoGlobal &&
        l.activoEnEleccionActual
    ) || null
  );
}

// v1.9: detectar si el local snapshot de un caso diverge del catálogo actual
function checkLocalDivergence(caseObj: { localSnapshot?: { idLocal: string; nombre: string } | null }, catalog: LocalCatalog): { type: string; msg: string } | null {
  if(!caseObj.localSnapshot)return null;
  const cur=catalog.find(l=>l.idLocal===caseObj.localSnapshot!.idLocal);
  if(!cur)return{type:"deleted",msg:"Local eliminado del catálogo tras creación"};
  if(!cur.activoGlobal)return{type:"deactivated",msg:`Local desactivado (SD) el ${fmtDate(cur.fechaDesactivacion)}`};
  if(!cur.activoEnEleccionActual)return{type:"election_off",msg:"Local desactivado para la elección actual"};
  if(cur.nombre!==caseObj.localSnapshot.nombre)return{type:"renamed",msg:`Local renombrado a "${cur.nombre}"`};
  return null;
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
const nowISO=()=>new Date().toISOString();
const tsISO=(m=0)=>new Date(Date.now()-m*60000).toISOString();
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL") + " " + d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}
function timeDiff(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return Math.round((tb - ta) / 60000);
}
function getElapsed(c: { createdAt?: string }): number {
  return Math.round((Date.now() - new Date(c.createdAt ?? 0).getTime()) / 60000);
}
function isSlaVencido(c: { createdAt?: string; status?: string; criticality?: string }): boolean {
  if(!c.createdAt||["Resuelto","Cerrado"].includes(c.status||""))return false;
  const slaKey: SlaLevel = (c?.criticality as SlaLevel) ?? "MEDIA";
  const slaMin = (SLA_MINUTES as Record<SlaLevel, number>)[slaKey] ?? 120;
  return getElapsed(c) > slaMin;
}
function getRecommendation(c: { status?: string; criticality?: string; createdAt?: string }){
  const el=getElapsed(c);
  const slaKey: SlaLevel = (c?.criticality as SlaLevel) ?? "MEDIA";
  const sla = (SLA_MINUTES as Record<SlaLevel, number>)[slaKey] ?? 120;
  const br=el>sla;
  if(c.status==="Cerrado")          return{level:"low",  label:"Cerrado",  icon:"✅",text:"Sin acciones",            reason:"Estado Cerrado."};
  if(c.criticality==="CRITICA"&&br) return{level:"high", label:"Escalar",  icon:"🚨",text:"Escalar a Nivel Central", reason:`CRÍTICA+SLA vencido (${el}>${sla} min).`};
  if(c.criticality==="CRITICA")     return{level:"medium",label:"Acción",  icon:"⚠️",text:"Registrar acción inmediata",reason:`CRÍTICA (SLA ${el}/${sla} min).`};
  if(br)                            return{level:"medium",label:"Acción",  icon:"⏱️",text:"Registrar acción formal", reason:`SLA vencido (${el}>${sla} min).`};
  return                                  {level:"low",  label:"Monitoreo",icon:"👁️",text:"Mantener monitoreo",      reason:`SLA dentro de margen (${el}/${sla} min).`};
}
function recColor(l: RecLevel): string {
  const map = { high:"#ef4444", medium:"#f97316", low:"#94a3b8" } as const;
  return map[l] ?? "#94a3b8";
}
function genId(region: RegionCode, commune: CommuneCode, seq: number): string {
  return `${region}-${new Date().getFullYear()}-${commune}-${String(seq).padStart(3, "0")}`;
}
function uuidSimple(){return"ev-"+Math.random().toString(36).slice(2,10)+"-"+Date.now().toString(36);}
function calcCriticality(ev: Record<string, number> | null | undefined) {
  const vals = Object.values(ev ?? {}) as number[];
  const max = vals.length ? Math.max(...vals) : 0;
  const sum = vals.reduce((a: number, b: number) => a + b, 0);

  if(max>=3)return{criticality:"CRITICA",score:sum,recommendation:"⚠️ Escalamiento INMEDIATO al Director Regional y Nivel Central."};
  if(sum>=8) return{criticality:"ALTA",  score:sum,recommendation:"Notificar Director Regional. SLA máx. 30 min."};
  if(sum>=4) return{criticality:"MEDIA", score:sum,recommendation:"Gestionar a través de Registro SCCE. SLA máx. 60 min."};
  return          {criticality:"BAJA",  score:sum,recommendation:"Gestión local. Registrar y monitorear."};
}
function critColor(c: Criticality): string {
  const map = { CRITICA:"#ef4444", ALTA:"#f97316", MEDIA:"#eab308", BAJA:"#22c55e" } as const;
  return map[c] ?? "#6b7280";
}
function statusColor(s: CaseStatus): string {
  const map = {
    "Nuevo":"#6366f1",
    "Recepcionado por DR":"#a78bfa",
    "En gestión":"#3b82f6",
    "Escalado":"#ef4444",
    "Mitigado":"#f97316",
    "Resuelto":"#22c55e",
    "Cerrado":"#6b7280",
  } as const;
  return map[s] ?? "#6b7280";
}
function calcCompleteness(c: CaseItem){
  let f=0;
  if(c.summary)f++;if(c.detail)f++;if(c.evidence?.length)f++;
  if(c.evaluation&&Object.keys(c.evaluation).length===5)f++;
  if(c.assignedTo)f++;if(c.actions?.length)f++;if(c.decisions?.length)f++;
  if((c.timeline?.length ?? 0)>=3)f++;
  return Math.round(f/8*100);
}
function validateCaseSchema(c: { summary?: string; commune?: string; region?: string; local?: string; origin?: { detectedAt?: string } }, catalog: LocalCatalog = []){
  const e=[];
  if(!c.summary?.trim())e.push("Resumen obligatorio.");
  if(!c.commune)e.push("Comuna obligatoria.");
  if(!c.region)e.push("Región obligatoria.");
  if(!c.local?.trim())e.push("Local de votación obligatorio.");
  if(!c.origin?.detectedAt)e.push("Hora de detección obligatoria.");
  if(c.local?.trim()&&catalog.length>0){
    if(!findActiveLocal(catalog,c.region ?? "",c.commune ?? "",c.local ?? ""))
      e.push(`Local "${c.local}" no está activo en el catálogo.`);
  }
  return e;
}
function simpleHash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function chainHash(prev: string, ev: { eventId?: string; type?: string; at?: string; actor?: string; caseId?: string | null; summary?: string }): string {
  return simpleHash(prev + (ev.eventId || "") + (ev.type || "") + (ev.at || "") + (ev.actor || "") + (ev.caseId ?? "") + (ev.summary || ""));
}

function appendEvent(
  log: AuditLogEntry[],
  type: string,
  actor: string,
  role: string,
  caseId: string | null,
  summary: string
): AuditLogEntry[] {
  const prevHash: string = log.length ? log[log.length - 1].hash : "00000000";
  const ev: AuditLogEntry = {
    eventId: uuidSimple(),
    type,
    at: nowISO(),
    actor,
    role,
    caseId,
    summary,
    prevHash,
    hash: "",
  };
  ev.hash = chainHash(prevHash, ev);
  return [...log, ev];
}

type SeedEventInput = { type: string; at: string; actor: string; role: string; caseId?: string | null; summary: string };

function buildSeedLog(events: SeedEventInput[]): AuditLogEntry[] {
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

function verifyChain(events: AuditLogEntry[]): { ok: boolean; failIndex: number } {
  let prev = "00000000";
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.hash !== chainHash(e.prevHash !== undefined ? e.prevHash : prev, e)) return { ok: false, failIndex: i };
    prev = e.hash;
  }
  return { ok: true, failIndex: -1 };
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

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const S={
  app:{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#0f1117",color:"#e2e8f0",minHeight:"100vh",fontSize:"13px"},
  nav:{background:"#1a1d2e",borderBottom:"1px solid #2d3748",padding:"8px 16px",display:"flex",alignItems:"center",gap:"6px",flexWrap:"wrap" as const,minHeight:42},
  nBtn:(a: boolean)=>({background:a?"#3b82f6":"transparent",color:a?"#fff":"#94a3b8",border:"none",padding:"5px 10px",borderRadius:"4px",cursor:"pointer",fontSize:"12px"}),
  card:{background:"#1a1d2e",border:"1px solid #2d3748",borderRadius:"6px",padding:"12px"},
  badge:(color: string)=>({background:color+"22",color,border:"1px solid "+color+"44",borderRadius:"3px",padding:"2px 6px",fontSize:"11px",fontWeight:600}),
  btn:(v="primary")=>({background:{primary:"#3b82f6",success:"#22c55e",danger:"#ef4444",warning:"#f97316",dark:"#2d3748"}[v]||"#3b82f6",color:"#fff",border:"none",padding:"6px 12px",borderRadius:"4px",cursor:"pointer",fontSize:"12px",fontWeight:500}),
  inp:{background:"#0f1117",border:"1px solid #374151",borderRadius:"4px",padding:"6px 8px",color:"#e2e8f0",fontSize:"13px",width:"100%",boxSizing:"border-box"} as React.CSSProperties,
  lbl:{display:"block",marginBottom:"3px",color:"#94a3b8",fontSize:"11px",fontWeight:600,textTransform:"uppercase"} as React.CSSProperties,
  g2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"},
  g4:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px"},
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function App(){
  const currentYear=new Date().getFullYear();
  const defaultYear=Math.max(currentYear,MIN_ELECTION_YEAR);

  const [electionConfig,setElectionConfig]=useState({name:`Elecciones Generales ${defaultYear}`,date:`${defaultYear}-11-15`,year:defaultYear});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeRegion,setActiveRegion]=useState("TRP");
  const [localCatalog, setLocalCatalog] = useState<LocalCatalog>(() => buildCatalogSeed());

  const [cases, setCases] = useState<CaseItem[]>(() => {
    const cat = buildCatalogSeed();
    return makeSeedCases(cat);
  });
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => makeSeedAudit());
  const [view,setView]=useState("dashboard");
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [crisisMode,setCrisisMode]=useState(false);
  const [filterState,setFilterState]=useState({criticality:"",status:"",commune:"",search:""});
  const [notification, setNotification] = useState<Notification>(null);
  const [simCases,setSimCases]=useState<CaseItem[]>([]);
  const [simReport, setSimReport] = useState<SimReport>(null);
  const [simSurvey,setSimSurvey]=useState({claridad:0,respaldo:0,submitted:false});
  const [loginForm,setLoginForm]=useState({username:"director",password:"demo"});
  const [loginErr,setLoginErr]=useState("");
  const [newCase, setNewCase] = useState<CaseItem | null>(null);
  const [evalForm,setEvalForm]=useState({continuidad:0,integridad:0,seguridad:0,exposicion:0,capacidadLocal:0});
  const [bypassForm,setBypassForm]=useState({active:false,motivo:"",peseInoperante:false,confirmed:false});
  const [step,setStep]=useState(1);

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

  const notify=(msg: string, type="info")=>{setNotification({msg,type});setTimeout(()=>setNotification(null),4000);};

  function doReset(){
    _localSeq=0;
    const cat=buildCatalogSeed();
    const y=Math.max(new Date().getFullYear(),MIN_ELECTION_YEAR);
    setLocalCatalog(cat);
    setCases(makeSeedCases(cat));
    setAuditLog(makeSeedAudit());
    setCurrentUser(null);setView("dashboard");setSelectedCase(null);
    setCrisisMode(false);setSimCases([]);setSimReport(null);
    setSimSurvey({claridad:0,respaldo:0,submitted:false});
    setLoginForm({username:"director",password:"demo"});
    setElectionConfig({name:`Elecciones Generales ${y}`,date:`${y}-11-15`,year:y});
  }

  function doLogin(){
    const u=USERS.find(u=>u.username===loginForm.username&&u.password===loginForm.password);
    if(!u){setLoginErr("Usuario o contraseña incorrectos");return;}
    setCurrentUser(u as User);
    if(u.region)setActiveRegion(u.region);
    setAuditLog(prev=>appendEvent(prev,"LOGIN",u.id,u.role,null,"Inicio de sesión"));
    setLoginErr("");
  }

  function startNewCase(){
    if (!currentUser) return;
    setNewCase({region:currentUser.region||activeRegion,commune:"",local:"",origin:{actor:currentUser.name,channel:"Teams",detectedAt:nowISO()},summary:"",detail:"",evidence:[],id:"",status:"Nuevo",criticality:"MEDIA"} as CaseItem);
    setEvalForm({continuidad:0,integridad:0,seguridad:0,exposicion:0,capacidadLocal:0});
    setBypassForm({active:false,motivo:"",peseInoperante:false,confirmed:false});
    setStep(1);setView("new_case");
  }

  function submitCase(){
    if (!currentUser || !newCase) return;
    const se=validateCaseSchema(newCase,localCatalog);
    if(se.length)return notify("⚠️ "+se[0],"error");
    const result=calcCriticality(evalForm);
    const maxVar=Math.max(...Object.values(evalForm));
    const bypassTechOk=maxVar>=3||bypassForm.peseInoperante;
    const bypassFlagged=bypassForm.active&&!bypassTechOk;
    const rCases=cases.filter(c=>c.region===newCase.region&&c.commune===newCase.commune);
    const id=genId(newCase.region,newCase.commune,rCases.length+1);
    const now_=nowISO();
    const localEntry=findActiveLocal(localCatalog,newCase.region,newCase.commune,newCase.local ?? "");
    const localSnapshot=localEntry?{idLocal:localEntry.idLocal,nombre:localEntry.nombre,region:localEntry.region,commune:localEntry.commune,snapshotAt:now_}:null;
    const c={...newCase,id,localSnapshot,evaluation:evalForm,evaluationLocked:true,evaluationHistory:[],criticality:result.criticality,criticalityScore:result.score,status:bypassForm.active?"En gestión":"Nuevo",assignedTo:null,slaMinutes:(SLA_MINUTES as Record<SlaLevel, number>)[result.criticality as SlaLevel]||60,closingMotivo:null,bypassValidated:null,timeline:[{type:"DETECTED",at:newCase.origin!.detectedAt,actor:currentUser.id,note:"Detectado"},{type:"REPORTED",at:now_,actor:currentUser.id,note:"Reportado en SCCE"}],actions:[],decisions:[],bypass:bypassForm.active,bypassMotivo:bypassForm.motivo,bypassFlagged,bypassActor:bypassForm.active?currentUser.id:null,peseInoperante:bypassForm.peseInoperante,completeness:0,reportedAt:now_,firstActionAt:null,escalatedAt:null,mitigatedAt:null,resolvedAt:null,closedAt:null,createdBy:currentUser.id,createdAt:now_,updatedAt:now_};
    c.completeness=calcCompleteness(c as CaseItem);
    setCases(prev=>[c as CaseItem,...prev]);
    setAuditLog(prev=>{
      let log=appendEvent(prev,"CASE_CREATED",currentUser.id,currentUser.role,id,`Caso: ${c.summary.slice(0,60)}`);
      if(bypassForm.active)log=appendEvent(log,"BYPASS_USED",currentUser.id,currentUser.role,id,`Bypass: ${bypassForm.motivo}`);
      if(bypassFlagged)    log=appendEvent(log,"BYPASS_FLAGGED",currentUser.id,currentUser.role,id,"Bypass sin justificación técnica");
      return log;
    });
    notify(`Caso ${id} — ${result.criticality}${bypassFlagged?" ⚠️ BYPASS FLAGGED":""}`,result.criticality==="CRITICA"?"error":"success");
    setView("dashboard");
  }

  function recepcionar(caseId: string){
    if (!currentUser) return;
    const c=cases.find(x=>x.id===caseId);
    if(!c||!canDo("recepcionar",currentUser,c))return notify("Sin permiso","error");
    setCases(prev=>prev.map(x=>x.id!==caseId?x:{...x,status:"Recepcionado por DR",updatedAt:nowISO(),timeline:[...(x.timeline ?? []),{type:"RECEPCIONADO",at:nowISO(),actor:currentUser.id,note:`Recepcionado por ${currentUser.name}`}]} as CaseItem));
    setAuditLog(prev=>appendEvent(prev,"STATUS_CHANGED",currentUser.id,currentUser.role,caseId,"Estado → Recepcionado por DR"));
    notify("Caso recepcionado","success");
  }

  function changeStatus(caseId: string, newStatus: CaseStatus){
    if (!currentUser) return;
    const c=cases.find(x=>x.id===caseId);
    if(!c)return;
    if(!canDo("update",currentUser,c)&&!canDo("close",currentUser,c))return notify("Sin permiso","error");
    if(newStatus==="En gestión"&&c.status==="Nuevo"&&!c.bypass)return notify("❌ Recepcionar el caso primero.","error");
    if(newStatus==="Cerrado"){
      if(c.bypassFlagged&&!c.bypassValidated)return notify("❌ Bypass flagged sin validación.","error");
      if(!c.actions?.length)return notify("❌ Se requiere al menos 1 acción.","error");
      if(!c.decisions?.length)return notify("❌ Se requiere al menos 1 decisión.","error");
      if(c.status!=="Resuelto")return notify("❌ El caso debe estar en 'Resuelto' antes de cerrar.","error");
      if(!c.closingMotivo)return notify("❌ Ingresa el motivo de cierre.","error");
    }
    const tlMap: Record<CaseStatus, string> = {Escalado:"ESCALATED",Mitigado:"MITIGATED",Resuelto:"RESOLVED",Cerrado:"CLOSED","En gestión":"IN_MANAGEMENT","Recepcionado por DR":"RECEPCIONADO",Nuevo:"DETECTED"};
    const tsMap: Partial<Record<CaseStatus, string>> = {Escalado:"escalatedAt",Mitigado:"mitigatedAt",Resuelto:"resolvedAt",Cerrado:"closedAt"};
    setCases(prev=>prev.map(x=>{
      if(x.id!==caseId)return x;
      const tl=[...(x.timeline ?? []),{type:tlMap[newStatus]||"STATUS_CHANGED",at:nowISO(),actor:currentUser.id,note:`Estado → ${newStatus}`}];
      return{...x,status:newStatus,...(tsMap[newStatus]?{[tsMap[newStatus]!]:nowISO()}:{}),timeline:tl,updatedAt:nowISO()} as CaseItem;
    }));
    setAuditLog(prev=>appendEvent(prev,"STATUS_CHANGED",currentUser.id,currentUser.role,caseId,`Estado → ${newStatus}`));
  }

  function validateBypass(caseId: string, decision: string, fundament: string){
    if(!currentUser) return;
    if(!canDo("validateBypass",currentUser))return notify("Solo el Director Regional puede validar bypass","error");
    if(!fundament)return notify("Se requiere fundamento","error");
    const validated=decision==="VALIDATED";
    setCases(prev=>prev.map(x=>{
      if(x.id!==caseId)return x;
      const tl=[...(x.timeline ?? []),{type:validated?"BYPASS_VALIDATED":"BYPASS_REVOKED",at:nowISO(),actor:currentUser.id,note:fundament}];
      const nd=[...(x.decisions ?? []),{who:currentUser.id,at:nowISO(),fundament:`Bypass ${validated?"VALIDADO":"REVOCADO"}: ${fundament}`}];
      return{...x,bypassValidated:decision,decisions:nd,timeline:tl,updatedAt:nowISO()} as CaseItem;
    }));
    setAuditLog(prev=>appendEvent(prev,validated?"BYPASS_VALIDATED":"BYPASS_REVOKED",currentUser.id,currentUser.role,caseId,fundament.slice(0,80)));
    notify(`Bypass ${validated?"validado":"revocado"}`,"success");
  }

  function requestReassessment(caseId: string, newEval: Record<string, number>, justification: string){
    if(!currentUser) return;
    const c=cases.find(x=>x.id===caseId);
    if(!c||!canDo("update",currentUser,c))return notify("Sin permiso","error");
    const nr=calcCriticality(newEval);
    const snap={previousEval:c.evaluation,at:nowISO(),by:currentUser.id,justification};
    setCases(prev=>prev.map(x=>{
      if(x.id!==caseId)return x;
      const tl=[...(x.timeline ?? []),{type:"REASSESSMENT",at:nowISO(),actor:currentUser.id,note:`Reevaluación: ${justification}`}];
      const upd={...x,evaluation:newEval,criticality:nr.criticality as Criticality,criticalityScore:nr.score,evaluationHistory:[...(x.evaluationHistory||[]),snap],timeline:tl,updatedAt:nowISO()} as CaseItem;
      upd.completeness=calcCompleteness(upd);return upd;
    }));
    setAuditLog(prev=>appendEvent(prev,"REASSESSMENT",currentUser.id,currentUser.role,caseId,`Reevaluación: ${justification.slice(0,60)}`));
    notify("Reevaluación registrada","success");
  }

  function addAction(caseId: string, action: string, responsible: string, result_: string){
    if(!currentUser) return;
    const c=cases.find(x=>x.id===caseId);
    if(!c||!canDo("update",currentUser,c))return notify("Sin permiso","error");
    setCases(prev=>prev.map(x=>{
      if(x.id!==caseId)return x;
      const na={id:"a"+Date.now(),action,responsible,at:nowISO(),result:result_};
      const tl=[...(x.timeline ?? [])];
      if(!x.firstActionAt)tl.push({type:"FIRST_ACTION",at:nowISO(),actor:currentUser.id,note:action});
      const upd={...x,actions:[...(x.actions ?? []),na],firstActionAt:x.firstActionAt||nowISO(),timeline:tl,updatedAt:nowISO()} as CaseItem;
      upd.completeness=calcCompleteness(upd);return upd;
    }));
    setAuditLog(prev=>appendEvent(prev,"ACTION_ADDED",currentUser.id,currentUser.role,caseId,action.slice(0,80)));
  }

  function addDecision(caseId: string, fundament: string){
    if(!currentUser) return;
    const c=cases.find(x=>x.id===caseId);
    if(!c||(!canDo("update",currentUser,c)&&!canDo("close",currentUser,c)))return notify("Sin permiso","error");
    setCases(prev=>prev.map(x=>{
      if(x.id!==caseId)return x;
      const upd={...x,decisions:[...(x.decisions ?? []),{who:currentUser.id,at:nowISO(),fundament}],updatedAt:nowISO()} as CaseItem;
      upd.completeness=calcCompleteness(upd);return upd;
    }));
    setAuditLog(prev=>appendEvent(prev,"DECISION_ADDED",currentUser.id,currentUser.role,caseId,fundament.slice(0,60)));
  }

  function addComment(caseId: string, comment: string){
    if(!currentUser) return;
    setCases(prev=>prev.map(x=>x.id!==caseId?x:{...x,timeline:[...(x.timeline ?? []),{type:"COMMENT",at:nowISO(),actor:currentUser.id,note:comment}],updatedAt:nowISO()} as CaseItem));
    setAuditLog(prev=>appendEvent(prev,"COMMENT_ADDED",currentUser.id,currentUser.role,caseId,comment.slice(0,80)));
  }

  function catalogAddLocal(nombre: string, region: string, commune: string, actor: User){
    if(!nombre?.trim())return notify("Nombre obligatorio","error");
    if(!commune)return notify("Seleccione una comuna","error");
    if(localCatalog.find(l=>l.nombre===nombre&&l.region===region&&l.commune===commune))return notify(`Ya existe "${nombre}" en esa comarca`,"error");
    const entry={idLocal:newLocalId(),nombre:nombre.trim(),region,commune,activoGlobal:true,activoEnEleccionActual:true,fechaCreacion:nowISO(),fechaDesactivacion:null,origenSeed:false};
    setLocalCatalog(prev=>[...prev,entry]);
    setAuditLog(prev=>appendEvent(prev,"LOCAL_CREATED",actor.id,actor.role,null,`Local: "${nombre}" [${region}/${commune}]`));
    notify(`Local "${nombre}" añadido`,"success");
  }
  function catalogDeactivate(idLocal: string, actor: User){
    const e=localCatalog.find(l=>l.idLocal===idLocal);
    if(!e||!e.activoGlobal)return notify("Ya está desactivado","error");
    setLocalCatalog(prev=>prev.map(l=>l.idLocal!==idLocal?l:{...l,activoGlobal:false,activoEnEleccionActual:false,fechaDesactivacion:nowISO()}));
    setAuditLog(prev=>appendEvent(prev,"LOCAL_DEACTIVATED",actor.id,actor.role,null,`SD: "${e.nombre}" [${idLocal}]`));
    notify(`Local "${e.nombre}" desactivado`,"warning");
  }
  function catalogReactivate(idLocal: string, actor: User){
    const e=localCatalog.find(l=>l.idLocal===idLocal);
    if(!e||e.activoGlobal)return notify("Ya está activo","error");
    setLocalCatalog(prev=>prev.map(l=>l.idLocal!==idLocal?l:{...l,activoGlobal:true,fechaDesactivacion:null}));
    setAuditLog(prev=>appendEvent(prev,"LOCAL_REACTIVATED",actor.id,actor.role,null,`Reactivado: "${e.nombre}" [${idLocal}]`));
    notify(`Local "${e.nombre}" reactivado`,"success");
  }
  function catalogToggleEleccion(idLocal: string, actor: User){
    const e=localCatalog.find(l=>l.idLocal===idLocal);
    if(!e)return;
    if(!e.activoGlobal)return notify("No se puede activar en elección: local desactivado globalmente","error");
    const next=!e.activoEnEleccionActual;
    setLocalCatalog(prev=>prev.map(l=>l.idLocal!==idLocal?l:{...l,activoEnEleccionActual:next}));
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
      return{id:genId("TRP",commune,100+i),region:"TRP",commune,local:le?le.nombre:"Escuela Simulación",localSnapshot:le?{idLocal:le.idLocal,nombre:le.nombre,region:"TRP",commune,snapshotAt:tsISO(30-i*2)}:null,origin:{actor:"Simulación",channel:"Teams",detectedAt:tsISO(30-i*2)},summary:s.summary,detail:"[SIM] "+s.summary,evidence:[],bypass:false,bypassFlagged:false,evaluation:s.ev,evaluationLocked:true,evaluationHistory:[],criticality:result.criticality,criticalityScore:result.score,status:"Nuevo" as CaseStatus,assignedTo:null,slaMinutes:SLA_MINUTES[result.criticality]||60,closingMotivo:null,bypassValidated:null,timeline:[{type:"DETECTED",at:tsISO(30-i*2),actor:"SIM",note:"Simulación"}],actions:[],decisions:[],completeness:40,reportedAt:tsISO(28-i*2),firstActionAt:null,escalatedAt:null,mitigatedAt:null,resolvedAt:null,closedAt:null,createdBy:"SIM",createdAt:tsISO(30-i*2),updatedAt:tsISO(30-i*2),isSim:true};
    });
    setSimCases(sc as CaseItem[]);
    setSimReport({total:sc.length,critica:sc.filter(c=>c.criticality==="CRITICA").length,alta:sc.filter(c=>c.criticality==="ALTA").length,avgScore:Number((sc.reduce((s,c)=>s+(c.criticalityScore ?? 0),0)/sc.length).toFixed(1))});
    setSimSurvey({claridad:0,respaldo:0,submitted:false});
    notify("Simulación: 10 incidentes generados","warning");
  }
  function loadSimCases(){
    setCases(prev=>([...simCases,...prev.filter(x=>!x.isSim)] as CaseItem[]));
    setAuditLog(prev=>{let log=prev;for(const c of simCases)log=appendEvent(log,"CASE_CREATED","SIM","SIMULACION",c.id,`[SIM] ${c.summary}`);return log;});
    notify("Incidentes de simulación cargados","warning");
  }

  function exportCSV(){
    if (!currentUser) return;
    const rows=[["ID","Región","Comuna","Local","Criticidad","Estado","Bypass","Flagged","SnapshotID","Creado","Completitud"]];
    cases.forEach(c=>rows.push([c.id,c.region,c.commune,c.local||"—",c.criticality,c.status,c.bypass?"SÍ":"No",c.bypassFlagged?"FLAGGED":"—",c.localSnapshot?.idLocal||"—",fmtDate(c.createdAt),(c.completeness ?? 0)+"%"]));
    const csv=rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="SCCE_casos.csv";a.click();
    setAuditLog(prev=>appendEvent(prev,"EXPORT_DONE",currentUser.id,currentUser.role,null,"Export CSV"));
    notify("CSV exportado");
  }
  function exportJSON(){
    if (!currentUser) return;
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([JSON.stringify({metadata:{exportedAt:nowISO(),scceVersion:APP_VERSION,election:electionConfig,chainIntegrity:chainResult.ok?"INTEGRA":"COMPROMETIDA"},cases},null,2)],{type:"application/json"}));
    a.download="SCCE_casos.json";a.click();
    setAuditLog(prev=>appendEvent(prev,"EXPORT_DONE",currentUser.id,currentUser.role,null,"Export JSON"));
    notify("JSON exportado");
  }
  function exportAuditCSV(){
    if (!currentUser) return;
    const{ok,failIndex}=chainResult;
    const rows=[["EventID","Tipo","Timestamp","Actor","Rol","CaseID","Resumen","Hash","Verificacion"]];
    auditLog.forEach((e,i)=>{const u=USERS.find(u=>u.id===e.actor);rows.push([e.eventId,e.type,e.at,u?.name||e.actor,e.role,e.caseId||"",e.summary,e.hash,!ok&&i===failIndex?"FALLA":"OK"]);});
    const csv=rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="SCCE_auditoria.csv";a.click();
    setAuditLog(prev=>appendEvent(prev,"EXPORT_DONE",currentUser.id,currentUser.role,null,"Export CSV auditoría"));
    notify("Auditoría exportada");
  }
  function exportCaseTXT(c: CaseItem){
    const ca=auditLog.filter(e=>e.caseId===c.id);
    const div=checkLocalDivergence(c,localCatalog);
    const regionsMap = CONFIG.regions as Record<string, { name?: string; communes?: Record<string, { name?: string }> }>;
    const txt=`SCCE v${APP_VERSION} — REPORTE DE CASO\nID: ${c.id}\nElección: ${electionConfig.name} · ${electionConfig.date}\nRegión: ${regionsMap[c.region]?.name}\nComuna: ${regionsMap[c.region]?.communes?.[c.commune]?.name||c.commune}\nLocal: ${c.local||"—"}\nSnapshot: ${c.localSnapshot?`${c.localSnapshot.nombre} [${c.localSnapshot.idLocal}] @ ${fmtDate(c.localSnapshot.snapshotAt)}`:"sin snapshot"}\n${div?`⚠️ DIVERGENCIA: ${div.msg}\n`:""}\nCRITICIDAD: ${c.criticality} (${c.criticalityScore}/15)\nESTADO: ${c.status}\nBYPASS: ${c.bypass?`SÍ — ${c.bypassMotivo}`:"No"}\n\nRESUMEN: ${c.summary}\nDETALLE: ${c.detail||"—"}\n\nACCIONES:\n${(c.actions as { action?: string; result?: string }[]).map((a: { action?: string; result?: string })=>`• ${a.action} → ${a.result||"—"}`).join("\n")||"—"}\n\nDECISIONES:\n${(c.decisions as { who?: string; fundament?: string }[]).map((d: { who?: string; fundament?: string })=>`• ${USERS.find(u=>u.id===d.who)?.name}: ${d.fundament}`).join("\n")||"—"}\n\nAUDITORÍA (${ca.length} eventos):\n${ca.map(e=>`[${e.at}] ${e.type} | ${USERS.find(u=>u.id===e.actor)?.name||e.actor} | ${e.summary} | ${e.hash}`).join("\n")||"—"}\n\nGenerado: ${nowISO()}\nSCCE v${APP_VERSION} — SERVEL Chile`;
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([txt],{type:"text/plain"}));a.download=`SCCE_${c.id}.txt`;a.click();
    notify("Reporte exportado");
  }

  const visibleCases=useMemo(()=>cases.filter(c=>{
    if(currentUser?.role!=="NIVEL_CENTRAL"&&c.region!==activeRegion)return false;
    if(!canDo("viewAll",currentUser,c)){if(c.createdBy!==currentUser?.id&&c.assignedTo!==currentUser?.id)return false;}
    if(filterState.criticality&&c.criticality!==filterState.criticality)return false;
    if(filterState.status&&c.status!==filterState.status)return false;
    if(filterState.commune&&c.commune!==filterState.commune)return false;
    if(filterState.search){
      const q=filterState.search.toLowerCase();
      if(!c.summary.toLowerCase().includes(q)&&!c.id.toLowerCase().includes(q)&&!(c.local||"").toLowerCase().includes(q))return false;
    }
    return true;
  }),[cases,currentUser,activeRegion,filterState]);

  const metrics=useMemo(()=>({
    total:visibleCases.length,
    critica:visibleCases.filter(c=>c.criticality==="CRITICA").length,
    alta:visibleCases.filter(c=>c.criticality==="ALTA").length,
    open:visibleCases.filter(c=>!["Resuelto","Cerrado"].includes(c.status)).length,
    avgComp:visibleCases.length?Math.round(visibleCases.reduce((s,c)=>s+(c.completeness ?? 0),0)/visibleCases.length):0,
    flagged:visibleCases.filter(c=>c.bypassFlagged&&!c.bypassValidated).length,
  }),[visibleCases]);

  // ─── SUB-COMPONENTS ───────────────────────────────────────────────────────
  const SlaBadge=({c}:{c:CaseItem})=>isSlaVencido(c)?<span style={{...S.badge("#ef4444"),fontSize:"9px"}}>SLA VENCIDO</span>:null;

  const RecBadge=({c}:{c:CaseItem})=>{
    const rec=getRecommendation(c);
    return(
      <span style={{position:"relative",display:"inline-flex",alignItems:"center"}} className="tipWrap">
        <span style={{...S.badge(recColor(rec.level as RecLevel)),fontSize:"9px",cursor:"help"}}>{rec.icon} {rec.label}</span>
        <span className="tip" style={{position:"absolute",top:"125%",left:0,background:"#0b1220",color:"#e2e8f0",border:"1px solid #334155",borderRadius:"8px",padding:"10px 12px",width:"220px",fontSize:"11px",lineHeight:1.4,boxShadow:"0 10px 28px rgba(0,0,0,.45)",zIndex:999,display:"none"}}>
          <div style={{fontWeight:800,marginBottom:4,color:"#fff"}}>{rec.text}</div>
          <div style={{color:"#94a3b8"}}>{rec.reason}</div>
        </span>
      </span>
    );
  };

  const DivBadge=({c}:{c:CaseItem})=>{
    const div=checkLocalDivergence(c,localCatalog);
    if(!div)return null;
    return(
      <span style={{position:"relative",display:"inline-flex",alignItems:"center"}} className="tipWrap">
        <span style={{...S.badge("#f97316"),fontSize:"9px",cursor:"help"}}>⚡ CAT</span>
        <span className="tip" style={{position:"absolute",top:"125%",left:0,background:"#0b1220",color:"#e2e8f0",border:"1px solid #f9731644",borderRadius:"8px",padding:"10px 12px",width:"240px",fontSize:"11px",lineHeight:1.4,boxShadow:"0 10px 28px rgba(0,0,0,.45)",zIndex:999,display:"none"}}>
          <div style={{fontWeight:800,marginBottom:4,color:"#f97316"}}>⚡ Divergencia de catálogo</div>
          <div style={{color:"#94a3b8"}}>{div.msg}</div>
          <div style={{color:"#64748b",marginTop:4,fontSize:"10px"}}>El caso es válido. Revisar estado operacional del local.</div>
        </span>
      </span>
    );
  };

  const ClosedOverlay=()=>(
    <div style={{position:"absolute",inset:0,background:"rgba(15,17,23,.82)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"6px"}}>
      <div style={{background:"#1a1d2e",border:"1px solid #374151",borderRadius:"6px",padding:"14px 24px",textAlign:"center"}}>
        <div style={{fontWeight:700,color:"#94a3b8"}}>🔒 REGISTRO CERRADO</div>
        <div style={{fontSize:"11px",color:"#475569",marginTop:3}}>Solo lectura</div>
      </div>
    </div>
  );

  const CaseCard=({c,onClick}:{c:CaseItem;onClick:()=>void})=>{
    const div=checkLocalDivergence(c,localCatalog);
    return(
      <div style={{...S.card,cursor:"pointer",borderLeft:`3px solid ${critColor(c.criticality)}`,marginBottom:6,position:"relative"}} onClick={onClick}>
        {div&&<div style={{position:"absolute",top:0,right:0,width:3,bottom:0,background:"#f97316",borderRadius:"0 6px 6px 0"}}/>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3,flexWrap:"wrap",gap:4}}>
          <span style={{fontSize:"11px",color:"#64748b",fontFamily:"monospace"}}>{c.id}</span>
          <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
            {c.bypassFlagged&&!c.bypassValidated&&<span style={{...S.badge("#ef4444"),fontSize:"9px"}}>⚠️ BYPASS</span>}
            {c.isSim&&<span style={{...S.badge("#6366f1"),fontSize:"9px"}}>SIM</span>}
            <SlaBadge c={c}/><RecBadge c={c}/><DivBadge c={c}/>
            <span style={S.badge(critColor(c.criticality))}>{c.criticality}</span>
            <span style={S.badge(statusColor(c.status))}>{c.status}</span>
          </div>
        </div>
        <div style={{fontWeight:600,marginBottom:4}}>{c.summary}</div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
          <span style={{fontSize:"10px",background:"#1e2d3d",color:"#60a5fa",border:"1px solid #1d4ed844",borderRadius:"3px",padding:"1px 7px",fontWeight:600}}>🏫 {c.local||"—"}</span>
          <span style={{fontSize:"10px",color:"#475569"}}>{(CONFIG.regions as Record<string,{communes?:Record<string,{name?:string}>}>)[c.region]?.communes?.[c.commune]?.name||c.commune}</span>
        </div>
        <div style={{display:"flex",gap:10,color:"#64748b",fontSize:"11px",flexWrap:"wrap",alignItems:"center"}}>
          <span>🕐 {fmtDate(c.createdAt)}</span>
          {(()=>{const comp=c.completeness??0;return <span style={{color:comp>=80?"#22c55e":comp>=50?"#eab308":"#ef4444"}}>✓ {comp}%</span>;})()}
          {canDo("recepcionar",currentUser,c)&&c.status==="Nuevo"&&!c.bypass&&(
            <button style={{...S.btn("primary"),fontSize:"10px",padding:"1px 8px"}} onClick={e=>{e.stopPropagation();recepcionar(c.id);}}>Recepcionar</button>
          )}
        </div>
      </div>
    );
  };

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  if(!currentUser){
    return(
      <div style={{...S.app,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <style>{`.tipWrap:hover .tip{display:block!important}`}</style>
        <div style={{...S.card,width:340}}>
          <div style={{textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:"24px",fontWeight:800,color:"#3b82f6",letterSpacing:1}}>SCCE</div>
            <div style={{color:"#475569",fontSize:"12px"}}>Sistema de Comunicación de Contingencias Electorales</div>
            <div style={{color:"#374151",fontSize:"10px",marginTop:2}}>v{APP_VERSION} · SERVEL Chile</div>
          </div>
          <div style={{marginBottom:8}}>
            <label style={S.lbl}>Usuario</label>
            <input style={S.inp} value={loginForm.username} onChange={e=>setLoginForm(p=>({...p,username:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doLogin()}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={S.lbl}>Contraseña</label>
            <input style={S.inp} type="password" value={loginForm.password} onChange={e=>setLoginForm(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&doLogin()}/>
          </div>
          {loginErr&&<div style={{color:"#ef4444",fontSize:"11px",marginBottom:8}}>{loginErr}</div>}
          <button style={{...S.btn("primary"),width:"100%",padding:"8px"}} onClick={doLogin}>Ingresar</button>
          <div style={{marginTop:12,borderTop:"1px solid #2d3748",paddingTop:10}}>
            <div style={{color:"#475569",fontSize:"10px",marginBottom:4}}>Usuarios demo (password: demo):</div>
            {USERS.map(u=><div key={u.id} style={{fontSize:"10px",color:"#64748b"}}><span style={{color:"#94a3b8",fontFamily:"monospace"}}>{u.username}</span> — <span style={{color:"#475569"}}>{(ROLE_LABELS as Record<string, string>)[u.role] ?? String(u.role)}</span></div>)}
          </div>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD ────────────────────────────────────────────────────────────
  const regionsMap = CONFIG.regions as Record<string, { name?: string; communes?: Record<string, { name?: string }> }>;
  const Dashboard=()=>(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <h2 style={{margin:0,fontSize:"16px"}}>Panel de Operación</h2>
          {metrics.critica>0&&<span style={S.badge("#ef4444")}>🚨 {metrics.critica} CRÍTICOS</span>}
          {metrics.flagged>0&&<span style={S.badge("#ef4444")}>⚠️ {metrics.flagged} BYPASS SIN VALIDAR</span>}
          {divergencias.length>0&&<span style={{...S.badge("#f97316"),cursor:"pointer"}} onClick={()=>setView("catalog")}>⚡ {divergencias.length} LOCAL(ES) MOD.</span>}
        </div>
        <button style={S.btn(crisisMode?"danger":"dark")} onClick={()=>setCrisisMode(p=>!p)}>{crisisMode?"🔄 Normal":"⚡ Crisis"}</button>
      </div>

      {divergencias.length>0&&(
        <div style={{...S.card,background:"#1c1408",border:"1px solid #f9731644",marginBottom:10}}>
          <div style={{color:"#f97316",fontWeight:700,fontSize:"12px",marginBottom:6}}>⚡ Locales modificados en catálogo post-creación ({divergencias.length})</div>
          {divergencias.map(x=>(
            <div key={x.caseId} style={{display:"flex",gap:6,alignItems:"center",marginBottom:3,fontSize:"11px",flexWrap:"wrap"}}>
              <span style={{fontFamily:"monospace",color:"#64748b"}}>{x.caseId}</span>
              <span style={{color:"#94a3b8"}}>{x.caseSummary.slice(0,40)}</span>
              <span style={{color:"#f97316"}}>→ {x.div?.msg}</span>
              <button style={{...S.btn("dark"),fontSize:"9px",padding:"1px 6px"}} onClick={()=>{const found=cases.find((c:CaseItem)=>c.id===x.caseId)??null;setSelectedCase(found);setView("detail");}}>Ver</button>
            </div>
          ))}
          <div style={{fontSize:"10px",color:"#64748b",marginTop:4}}>Los casos son válidos. Verificar estado operacional del local.</div>
        </div>
      )}

      <div style={{...S.g4,marginBottom:10}}>
        {[{l:"Total",v:metrics.total,c:"#3b82f6"},{l:"Abiertos",v:metrics.open,c:"#f97316"},{l:"Críticos+Altos",v:metrics.critica+metrics.alta,c:"#ef4444"},{l:"Completitud",v:metrics.avgComp+"%",c:"#22c55e"}].map(k=>(
          <div key={k.l} style={S.card}><div style={{color:k.c,fontSize:"22px",fontWeight:700}}>{k.v}</div><div style={{color:"#64748b",fontSize:"11px"}}>{k.l}</div></div>
        ))}
      </div>

      {!crisisMode&&(
        <div style={{...S.card,marginBottom:8,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <select style={{...S.inp,width:"180px",borderColor:"#3b82f6"}} value={activeRegion} onChange={e=>{setActiveRegion(e.target.value);setFilterState(p=>({...p,commune:""}));}}>
            {Object.entries(regionsMap).map(([k,v])=><option key={k} value={k}>{v?.name}</option>)}
          </select>
          <input style={{...S.inp,width:"150px"}} placeholder="🔍 ID, resumen, local..." value={filterState.search} onChange={e=>setFilterState(p=>({...p,search:e.target.value}))}/>
          <select style={{...S.inp,width:"120px"}} value={filterState.criticality} onChange={e=>setFilterState(p=>({...p,criticality:e.target.value}))}>
            {["","CRITICA","ALTA","MEDIA","BAJA"].map(o=><option key={o} value={o}>{o||"Criticidad"}</option>)}
          </select>
          <select style={{...S.inp,width:"130px"}} value={filterState.status} onChange={e=>setFilterState(p=>({...p,status:e.target.value}))}>
            {["","Nuevo","Recepcionado por DR","En gestión","Escalado","Mitigado","Resuelto","Cerrado"].map(o=><option key={o} value={o}>{o||"Estado"}</option>)}
          </select>
          <select style={{...S.inp,width:"150px"}} value={filterState.commune} onChange={e=>setFilterState(p=>({...p,commune:e.target.value}))}>
            <option value="">Todas las comunas</option>
            {Object.entries(regionsMap[activeRegion]?.communes||{}).map(([k,v])=><option key={k} value={k}>{(v as { name?: string })?.name}</option>)}
          </select>
          <button style={S.btn("dark")} onClick={()=>setFilterState({criticality:"",status:"",commune:"",search:""})}>✕</button>
        </div>
      )}

      {crisisMode?(
        <div>
          <div style={{color:"#ef4444",fontWeight:700,marginBottom:8}}>⚡ MODO CRISIS — Críticos y altos activos</div>
          {visibleCases.filter(c=>["CRITICA","ALTA"].includes(c.criticality)&&!["Resuelto","Cerrado"].includes(c.status)).map(c=>(
            <div key={c.id} style={{...S.card,borderLeft:`4px solid ${critColor(c.criticality)}`,marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
              <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontFamily:"monospace",color:"#64748b",fontSize:"11px"}}>{c.id}</span>
                <span style={{fontWeight:600}}>{c.summary}</span>
                <span style={S.badge(critColor(c.criticality))}>{c.criticality}</span>
                <RecBadge c={c}/><DivBadge c={c}/>
              </div>
              <div style={{display:"flex",gap:4}}>
                <button style={S.btn("primary")} onClick={()=>{const found=cases.find(x=>x.id===c.id)??null;setSelectedCase(found);setView("detail");}}>Ver</button>
                {canDo("assign",currentUser,c)&&<button style={S.btn("warning")} onClick={()=>changeStatus(c.id,"Escalado")}>Escalar</button>}
              </div>
            </div>
          ))}
        </div>
      ):(
        <div>
          {["Nuevo","Recepcionado por DR","En gestión","Escalado","Mitigado","Resuelto","Cerrado"].map(st=>{
            const bucket=visibleCases.filter(c=>c.status===st);
            if(!bucket.length)return null;
            return(
              <div key={st} style={{marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:statusColor(st as CaseStatus)}}/>
                  <span style={{fontWeight:600,fontSize:"12px",color:"#94a3b8"}}>{st} ({bucket.length})</span>
                </div>
                {bucket.map(c=><CaseCard key={c.id} c={c} onClick={()=>{const found=cases.find(x=>x.id===c.id)??null;setSelectedCase(found);setView("detail");}}/>)}
              </div>
            );
          })}
          {!visibleCases.length&&<div style={{color:"#475569",textAlign:"center",padding:40}}>Sin casos para los filtros aplicados</div>}
        </div>
      )}
    </div>
  );

  // ─── NEW CASE FORM ────────────────────────────────────────────────────────
  const NewCaseForm=()=>{
    const[lnc,setLnc]=useState<LncDraft>(newCase?{...newCase}:{});
    const[le,setLe]=useState(evalForm);
    const[lb,setLb]=useState(bypassForm);
    const er=calcCriticality(le);
    const maxVar=Math.max(...Object.values(le));
    const rData=regionsMap[lnc.region||"TRP"];
    const availableLocals=useMemo(()=>getActiveLocals(localCatalog,lnc.region||"TRP",lnc.commune||""),[lnc.region,lnc.commune,localCatalog]);
    useEffect(()=>{
      if(availableLocals.length===1&&lnc.local!==availableLocals[0].nombre)setLnc(p=>({...p,local:availableLocals[0].nombre}));
      else if(availableLocals.length===0&&lnc.local)setLnc(p=>({...p,local:""}));
    },[lnc.commune,lnc.region]);

    const varDefs=[
      {key:"continuidad",   label:"1. Continuidad del acto",     desc:"0=Sin impacto · 1=Parcial · 2=Mesa suspendida · 3=Local sin funcionar"},
      {key:"integridad",    label:"2. Integridad jurídica",       desc:"0=Sin riesgo · 1=Dudas · 2=Posible nulidad · 3=Nulidad evidente"},
      {key:"seguridad",     label:"3. Seguridad / orden público", desc:"0=Normal · 1=Tensión · 2=Incidente activo · 3=Violencia/amenaza grave"},
      {key:"exposicion",    label:"4. Exposición pública",        desc:"0=Interna · 1=Testigos · 2=Medios/redes · 3=Atención nacional"},
      {key:"capacidadLocal",label:"5. Capacidad local",           desc:"0=Resuelven · 1=Orientación · 2=Apoyo externo · 3=Sin capacidad"},
    ];
    return(
      <div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <button style={S.btn("dark")} onClick={()=>setView("dashboard")}>← Volver</button>
          <h2 style={{margin:0,fontSize:"16px"}}>Nuevo Incidente — Ficha 60s</h2>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
          {["Identificación","Evaluación","Detalles","Confirmar"].map((st,i)=>(
            <div key={st} style={{padding:"4px 10px",borderRadius:4,fontSize:"11px",fontWeight:600,background:step===i+1?"#3b82f6":step>i+1?"#1e4a2a":"#1a1d2e",color:step===i+1?"#fff":step>i+1?"#22c55e":"#475569",border:"1px solid "+(step===i+1?"#3b82f6":step>i+1?"#22c55e":"#2d3748")}}>
              {step>i+1?"✓ ":""}{st}
            </div>
          ))}
        </div>

        {step===1&&(
          <div style={S.card}>
            <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:10}}>PASO 1 — IDENTIFICACIÓN</div>
            <div style={{...S.g2,marginBottom:8}}>
              <div>
                <label style={S.lbl}>Región</label>
                <select style={S.inp} value={lnc.region||"TRP"} onChange={e=>setLnc(p=>({...p,region:e.target.value,commune:"",local:""}))}>
                  {Object.entries(regionsMap).map(([k,v])=><option key={k} value={k}>{v?.name}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Comuna *</label>
                <select style={S.inp} value={lnc.commune||""} onChange={e=>setLnc(p=>({...p,commune:e.target.value,local:""}))}>
                  <option value="">Seleccione...</option>
                  {Object.entries(rData?.communes||{}).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:8}}>
              <label style={S.lbl}>Local de Votación *</label>
              {!lnc.commune?(
                <div style={{...S.inp,color:"#475569",cursor:"not-allowed"}}>Seleccione una comuna primero</div>
              ):availableLocals.length===0?(
                <div style={{...S.inp,color:"#ef4444",cursor:"not-allowed",borderColor:"#ef444444"}}>⚠️ Sin locales activos — administre el catálogo</div>
              ):(
                <select style={{...S.inp,borderColor:lnc.local?"#22c55e44":"#ef444444"}} value={lnc.local||""} onChange={e=>setLnc(p=>({...p,local:e.target.value}))}>
                  {availableLocals.length>1&&<option value="">Seleccione local...</option>}
                  {availableLocals.map(l=><option key={l.idLocal} value={l.nombre}>{l.nombre}</option>)}
                </select>
              )}
              {lnc.local&&<div style={{fontSize:"9px",color:"#6366f1",marginTop:2}}>📸 Se guardará snapshot del local al registrar</div>}
            </div>
            <div style={{...S.g2,marginBottom:8}}>
              <div>
                <label style={S.lbl}>Canal</label>
                <select style={S.inp} value={lnc.origin?.channel||"Teams"} onChange={e=>setLnc(p=>({...p,origin:{...p.origin,channel:e.target.value}}))}>
                  {["Teams","Teléfono","WhatsApp","Correo","Presencial"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Hora Detección *</label>
                <input style={S.inp} type="datetime-local" value={(lnc.origin?.detectedAt||"").slice(0,16)} onChange={e=>setLnc(p=>({...p,origin:{...p.origin,detectedAt:e.target.value}}))}/>
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <label style={S.lbl}>Resumen *</label>
              <input style={S.inp} placeholder="Ej: Urna sellada incorrectamente en mesa 12" value={lnc.summary||""} onChange={e=>setLnc(p=>({...p,summary:e.target.value}))}/>
            </div>
            {canDo("bypass",currentUser)&&(
              <div style={{...S.card,background:"#1e1528",border:"1px solid #7c3aed44"}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                  <input type="checkbox" checked={lb.active} onChange={e=>setLb(p=>({...p,active:e.target.checked,confirmed:false}))}/>
                  <span style={{color:"#a78bfa",fontWeight:600,fontSize:"12px"}}>⚡ ACTIVAR BYPASS</span>
                </label>
                {lb.active&&(
                  <div style={{marginTop:8}}>
                    <div style={{color:"#f97316",fontSize:"11px",marginBottom:6}}>Solo si: variable=3 / PESE inoperante / riesgo inminente.</div>
                    <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",marginBottom:8}}>
                      <input type="checkbox" checked={lb.peseInoperante} onChange={e=>setLb(p=>({...p,peseInoperante:e.target.checked}))}/>
                      <span style={{color:"#f97316",fontSize:"12px",fontWeight:600}}>PESE inoperante</span>
                    </label>
                    <label style={S.lbl}>Motivo *</label>
                    <input style={S.inp} placeholder="Motivo del bypass" value={lb.motivo} onChange={e=>setLb(p=>({...p,motivo:e.target.value}))}/>
                  </div>
                )}
              </div>
            )}
            <div style={{marginTop:10,textAlign:"right"}}>
              <button style={S.btn("primary")} onClick={()=>{
                const errs=validateCaseSchema({...lnc,origin:{...lnc.origin}},localCatalog);
                if(errs.length)return notify("⚠️ "+errs[0],"error");
                if(lb.active&&!lb.motivo)return notify("El bypass requiere motivo","error");
                setNewCase({...lnc} as CaseItem);setBypassForm(lb);setStep(2);
              }}>Siguiente →</button>
            </div>
          </div>
        )}

        {step===2&&(
          <div style={S.card}>
            <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:10}}>PASO 2 — FICHA DE EVALUACIÓN (inmutable tras guardar)</div>
            {varDefs.map(v=>(
              <div key={v.key} style={{...S.card,background:"#111827",marginBottom:6}}>
                <div style={{fontWeight:600,marginBottom:1}}>{v.label}</div>
                <div style={{color:"#64748b",fontSize:"10px",marginBottom:6}}>{v.desc}</div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  {[0,1,2,3].map(n=>(
                    <button key={n} onClick={()=>setLe(p=>({...p,[v.key]:n} as typeof evalForm))} style={{padding:"6px 14px",borderRadius:4,border:"2px solid",cursor:"pointer",fontWeight:700,fontSize:"13px",background:(le as Record<string, number>)[v.key]===n?["#22c55e","#eab308","#f97316","#ef4444"][n]:"transparent",borderColor:["#22c55e44","#eab30844","#f9731644","#ef444444"][n],color:(le as Record<string, number>)[v.key]===n?"#fff":["#22c55e","#eab308","#f97316","#ef4444"][n]}}>{n}</button>
                  ))}
                  {(le as Record<string, number>)[v.key]===3&&<span style={{color:"#ef4444",fontWeight:700,fontSize:"11px"}}>⚠️ ESCALAR</span>}
                </div>
              </div>
            ))}
            {lb.active&&maxVar<3&&!lb.peseInoperante&&(
              <div style={{...S.card,background:"#2d0a0a",border:"2px solid #ef4444",marginTop:8}}>
                <div style={{color:"#ef4444",fontWeight:700,marginBottom:6}}>⚠️ BYPASS SIN JUSTIFICACIÓN TÉCNICA → Quedará FLAGGED</div>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                  <input type="checkbox" checked={lb.confirmed||false} onChange={e=>setLb(p=>({...p,confirmed:e.target.checked}))}/>
                  <span style={{color:"#ef4444",fontSize:"12px",fontWeight:600}}>Entiendo y confirmo el bypass</span>
                </label>
              </div>
            )}
            <div style={{...S.card,background:"#111827",border:`2px solid ${critColor(er.criticality as Criticality)}`,marginTop:8}}>
              <span style={S.badge(critColor(er.criticality as Criticality))}>CRITICIDAD: {er.criticality}</span>
              <span style={{marginLeft:8,color:"#64748b",fontSize:"11px"}}>Score: {er.score}/15</span>
              <div style={{marginTop:6,color:"#94a3b8",fontSize:"12px"}}>{er.recommendation}</div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
              <button style={S.btn("dark")} onClick={()=>setStep(1)}>← Atrás</button>
              <button style={S.btn("primary")} onClick={()=>{if(lb.active&&maxVar<3&&!lb.peseInoperante&&!lb.confirmed)return notify("Confirmar bypass atípico","error");setEvalForm(le);setBypassForm(lb);setStep(3);}}>Siguiente →</button>
            </div>
          </div>
        )}

        {step===3&&(
          <div style={S.card}>
            <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:10}}>PASO 3 — DETALLES</div>
            <div style={{marginBottom:8}}>
              <label style={S.lbl}>Detalle</label>
              <textarea style={{...S.inp,height:70,resize:"vertical"}} placeholder="Describe el incidente..." value={newCase?.detail||""} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)=>{const val=e.currentTarget.value;setNewCase(p=>{if(!p)return p;return {...p,detail:val};});}}/>
            </div>
            <div>
              <label style={S.lbl}>Evidencia (Enter para agregar)</label>
              <input style={S.inp} placeholder="URL o descripción" onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>)=>{const target=e.currentTarget;if(e.key==="Enter"&&target.value){setNewCase(p=>{if(!p)return p;return{...p,evidence:[...(Array.isArray(p.evidence)?p.evidence:[]),target.value]};});target.value="";}}}/>
              {(newCase?.evidence||[]).map((ev,i)=><div key={i} style={{fontSize:"11px",color:"#94a3b8",marginTop:2}}>📎 {ev}</div>)}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
              <button style={S.btn("dark")} onClick={()=>setStep(2)}>← Atrás</button>
              <button style={S.btn("primary")} onClick={()=>setStep(4)}>Confirmar →</button>
            </div>
          </div>
        )}

        {step===4&&(
          <div style={S.card}>
            <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:10}}>PASO 4 — CONFIRMAR Y REGISTRAR</div>
            <div style={{...S.g2,marginBottom:8}}>
              <div><span style={{color:"#64748b"}}>Región:</span> {regionsMap[newCase?.region ?? ""]?.name}</div>
              <div><span style={{color:"#64748b"}}>Comuna:</span> {regionsMap[newCase?.region ?? ""]?.communes?.[newCase?.commune ?? ""]?.name||newCase?.commune}</div>
              <div><span style={{color:"#64748b"}}>Canal:</span> {newCase?.origin?.channel}</div>
              <div><span style={{color:"#64748b"}}>Criticidad:</span> <span style={S.badge(critColor(calcCriticality(evalForm).criticality as Criticality))}>{calcCriticality(evalForm).criticality}</span></div>
            </div>
            <div style={{marginBottom:8,padding:"6px 10px",background:"#0f2035",border:"1px solid #1d4ed844",borderRadius:4}}>
              <span style={{fontSize:"11px",color:"#60a5fa"}}>🏫 Local: </span>
              <span style={{fontWeight:700}}>{newCase?.local}</span>
              <div style={{fontSize:"9px",color:"#6366f1",marginTop:2}}>📸 Se registrará snapshot del local</div>
            </div>
            <div style={{marginBottom:8}}><span style={{color:"#64748b"}}>Resumen:</span> {newCase?.summary}</div>
            <div style={{...S.card,background:"#111827",marginBottom:8,fontSize:"11px",color:"#64748b"}}>
              Estado inicial: <strong style={{color:"#a78bfa"}}>{bypassForm.active?"En gestión (bypass activo)":"Nuevo → requiere recepción"}</strong>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
              <button style={S.btn("dark")} onClick={()=>setStep(3)}>← Atrás</button>
              <button style={{...S.btn("success"),padding:"8px 20px"}} onClick={submitCase}>✓ Registrar Incidente</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── CASE DETAIL ─────────────────────────────────────────────────────────
  // Hooks NO pueden ir después de returns condicionales. Wrapper sin hooks + contenido con hooks.
  const CaseDetail = () => {
    const c = cases.find((x): x is CaseItem => x.id === selectedCase?.id);
    if (!c) return <div style={{ color: "#475569", padding: 20 }}>Caso no encontrado</div>;
    return <CaseDetailContent c={c} />;
  };

  const CaseDetailContent = ({ c }: { c: CaseItem }) => {
    const [aForm, setAForm] = useState({ action: "", responsible: currentUser.id, result: "" });
    const [cmtTxt, setCmtTxt] = useState("");
    const [decForm, setDecForm] = useState("");
    const [showRA, setShowRA] = useState(false);
    const [raEval, setRaEval] = useState({ ...(c.evaluation ?? {}) });
    const [raJust, setRaJust] = useState("");
    const [motDraft, setMotDraft] = useState(c.closingMotivo ?? "");
    const [bvForm, setBvForm] = useState({ decision: "VALIDATED", fundament: "" });

    const isClosed = c.status === "Cerrado";
    const canAssign =
      !isClosed &&
      canDo("assign", currentUser, c) &&
      (c.status === "Recepcionado por DR" || c.bypass || c.status === "En gestión" || c.status === "Escalado");
    const ca = auditLog.filter((e) => e.caseId === c.id);
    const assignee = USERS.find((u) => u.id === c.assignedTo);
    const div = checkLocalDivergence(c, localCatalog);
    const tlC: Record<string, string> = {
      DETECTED: "#22c55e", REPORTED: "#3b82f6", FIRST_ACTION: "#f97316", ESCALATED: "#ef4444", RESOLVED: "#22c55e",
      CLOSED: "#6b7280", BYPASS: "#a78bfa", COMMENT: "#64748b", MITIGATED: "#eab308", RECEPCIONADO: "#a78bfa",
      REASSESSMENT: "#f97316", IN_MANAGEMENT: "#3b82f6", BYPASS_VALIDATED: "#22c55e", BYPASS_REVOKED: "#ef4444",
    };
    return (
      <div style={{position:"relative"}}>
        {isClosed&&<ClosedOverlay/>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:6}}>
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <button style={S.btn("dark")} onClick={()=>setView("dashboard")}>← Volver</button>
            <span style={{fontFamily:"monospace",color:"#64748b",fontSize:"12px"}}>{c.id}</span>
            <span style={S.badge(critColor(c.criticality))}>{c.criticality}</span>
            <span style={S.badge(statusColor(c.status))}>{c.status}</span>
            {c.bypass&&<span style={S.badge(c.bypassFlagged&&!c.bypassValidated?"#ef4444":"#f97316")}>⚡ BYPASS{c.bypassFlagged&&!c.bypassValidated?" ⚠️ FLAGGED":""}{c.bypassValidated?" ["+c.bypassValidated+"]":""}</span>}
            <SlaBadge c={c}/><RecBadge c={c}/>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            <button style={S.btn("dark")} onClick={()=>exportCaseTXT(c)}>⬇ TXT</button>
            <button style={S.btn("dark")} onClick={()=>{const txt=`MINUTA SCCE\nID: ${c.id} | ${fmtDate(nowISO())}\nLocal: ${c.local||"—"}\nResumen: ${c.summary}\nCriticidad: ${c.criticality} | Estado: ${c.status}`;navigator.clipboard?.writeText(txt);notify("Minuta copiada");}}>📋 Minuta</button>
            {canAssign&&(
              <select style={{...S.inp,width:"auto"}} onChange={e=>e.target.value&&(()=>{setCases(prev=>prev.map(x=>x.id!==c.id?x:{...x,assignedTo:e.target.value,updatedAt:nowISO()}));setAuditLog(prev=>appendEvent(prev,"ASSIGNED",currentUser.id,currentUser.role,c.id,"Asignado a "+USERS.find(u=>u.id===e.target.value)?.name));})()}>
                <option value="">Asignar a...</option>
                {USERS.filter(u=>u.region===c.region||!u.region).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            )}
            {(canDo("update",currentUser,c)||canDo("close",currentUser,c))&&(
              <select style={{...S.inp,width:"auto"}} value={c.status} onChange={e=>changeStatus(c.id,e.target.value as CaseStatus)}>
                {["Nuevo","Recepcionado por DR","En gestión","Escalado","Mitigado","Resuelto","Cerrado"].map(st=><option key={st}>{st}</option>)}
              </select>
            )}
          </div>
        </div>

        {div&&(
          <div style={{...S.card,background:"#1c1408",border:"2px solid #f97316",marginBottom:8}}>
            <div style={{color:"#f97316",fontWeight:700,marginBottom:4}}>⚡ Divergencia de catálogo</div>
            <div style={{fontSize:"12px",color:"#fbd38d",marginBottom:4}}>{div.msg}</div>
            <div style={{fontSize:"11px",color:"#64748b"}}>Snapshot: <span style={{color:"#94a3b8",fontFamily:"monospace"}}>{c.localSnapshot?.nombre} [{c.localSnapshot?.idLocal}]</span> @ {fmtDate(c.localSnapshot?.snapshotAt)}</div>
            <div style={{fontSize:"10px",color:"#475569",marginTop:4}}>El caso es jurídicamente válido. Verificar disponibilidad del local y registrar acción si corresponde.</div>
          </div>
        )}

        {c.bypassFlagged&&!c.bypassValidated&&(
          <div style={{...S.card,background:"#2d0a0a",border:"2px solid #ef4444",marginBottom:8}}>
            <div style={{color:"#ef4444",fontWeight:700,marginBottom:4}}>⚠️ BYPASS FLAGGED — Requiere validación ex-post</div>
            <div style={{fontSize:"11px",color:"#f87171",marginBottom:8}}>Motivo: {c.bypassMotivo||"—"}</div>
            {canDo("validateBypass",currentUser)&&(
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                <select style={{...S.inp,width:"auto"}} value={bvForm.decision} onChange={e=>setBvForm(p=>({...p,decision:e.target.value}))}>
                  <option value="VALIDATED">VALIDAR el bypass</option>
                  <option value="REVOKED">REVOCAR el bypass</option>
                </select>
                <input style={{...S.inp,flex:1,minWidth:200}} placeholder="Fundamento obligatorio..." value={bvForm.fundament} onChange={e=>setBvForm(p=>({...p,fundament:e.target.value}))}/>
                <button style={S.btn(bvForm.decision==="VALIDATED"?"success":"danger")} onClick={()=>validateBypass(c.id,bvForm.decision,bvForm.fundament)}>{bvForm.decision==="VALIDATED"?"✓ Validar":"✕ Revocar"}</button>
              </div>
            )}
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <div style={{...S.card,marginBottom:8}}>
              <div style={{fontWeight:700,fontSize:"14px",marginBottom:4}}>{c.summary}</div>
              <div style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:8,padding:"5px 8px",background:"#0f2035",border:"1px solid #1d4ed844",borderRadius:4}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:"11px",color:"#60a5fa",fontWeight:700}}>🏫 Local:</span>
                    <span style={{fontWeight:600}}>{c.local||"—"}</span>
                    {div&&<span style={{...S.badge("#f97316"),fontSize:"8px"}}>⚡ MODIF.</span>}
                  </div>
                  {c.localSnapshot&&<div style={{fontSize:"9px",color:"#475569",marginTop:1}}>📸 {c.localSnapshot.idLocal} · {fmtDate(c.localSnapshot.snapshotAt)}</div>}
                </div>
              </div>
              <div style={{color:"#94a3b8",fontSize:"12px",marginBottom:8}}>{c.detail||"—"}</div>
              <div style={S.g2}>
                <div><span style={{color:"#64748b"}}>Región:</span> {regionsMap[c.region]?.name}</div>
                <div><span style={{color:"#64748b"}}>Comuna:</span> {regionsMap[c.region]?.communes?.[c.commune]?.name||c.commune}</div>
                <div><span style={{color:"#64748b"}}>Canal:</span> {c.origin?.channel}</div>
                <div><span style={{color:"#64748b"}}>Asignado:</span> {assignee?.name||"—"}</div>
                <div><span style={{color:"#64748b"}}>SLA:</span> {c.slaMinutes} min</div>
                {(()=>{const comp=c.completeness??0;return <div><span style={{color:"#64748b"}}>Complet.:</span> <span style={{color:comp>=80?"#22c55e":comp>=50?"#eab308":"#ef4444"}}>{comp}%</span></div>;})()}
              </div>
            </div>

            {!isClosed&&(canDo("close",currentUser,c)||c.status==="Resuelto")&&(
              <div style={{...S.card,marginBottom:8,border:"1px solid #22c55e44"}}>
                <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:6}}>MOTIVO DE CIERRE</div>
                <textarea style={{...S.inp,height:50,resize:"vertical"}} value={motDraft} onChange={e=>setMotDraft(e.target.value)} placeholder="Fundamento formal..."/>
                <button style={{...S.btn("success"),marginTop:4,fontSize:"11px"}} onClick={()=>{if(!motDraft)return notify("Ingresa el motivo","error");setCases(prev=>prev.map(x=>x.id!==c.id?x:{...x,closingMotivo:motDraft,updatedAt:nowISO()}));setAuditLog(prev=>appendEvent(prev,"CASE_UPDATED",currentUser.id,currentUser.role,c.id,"Motivo de cierre registrado"));notify("Motivo guardado","success");}}>{c.closingMotivo?"✓ Actualizar":"Guardar motivo"}</button>
                {c.closingMotivo&&<div style={{marginTop:4,fontSize:"11px",color:"#22c55e"}}>✓ {c.closingMotivo.slice(0,60)}</div>}
              </div>
            )}

            <div style={{...S.card,marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600}}>FICHA EVALUACIÓN</div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <span style={{...S.badge("#22c55e"),fontSize:"9px"}}>🔒 BLOQUEADA</span>
                  {!isClosed&&canDo("update",currentUser,c)&&(
                    <button style={{...S.btn("dark"),fontSize:"10px",padding:"2px 8px"}} onClick={()=>setShowRA(p=>!p)}>{showRA?"✕":"✏ Reevaluar"}</button>
                  )}
                </div>
              </div>
              {(()=>{const ev=(c.evaluation??{}) as Record<string, number>;return Object.entries({continuidad:"Continuidad",integridad:"Integridad jurídica",seguridad:"Seguridad",exposicion:"Exposición",capacidadLocal:"Capacidad local"}).map(([k,lbl])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{color:"#94a3b8",fontSize:"11px"}}>{lbl}</span>
                  <div style={{display:"flex",gap:3,alignItems:"center"}}>
                    {[0,1,2,3].map(n=><div key={n} style={{width:14,height:14,borderRadius:2,background:(ev[k]??0)>=n?["#22c55e","#eab308","#f97316","#ef4444"][n]:"#1e2535"}}/>)}
                    <span style={{marginLeft:4,color:["#22c55e","#eab308","#f97316","#ef4444"][ev[k]??0],fontWeight:700}}>{ev[k]??0}</span>
                  </div>
                </div>
              ));})()}
              <div style={{marginTop:6,borderTop:"1px solid #2d3748",paddingTop:6,display:"flex",justifyContent:"space-between"}}>
                <span style={{color:"#64748b",fontSize:"11px"}}>Score:</span>
                <span style={{color:critColor(c.criticality),fontWeight:700}}>{c.criticalityScore}/15 — {c.criticality}</span>
              </div>
              {showRA&&(
                <div style={{...S.card,background:"#111827",marginTop:8,border:"1px solid #f9731644"}}>
                  <div style={{color:"#f97316",fontSize:"11px",fontWeight:600,marginBottom:8}}>REEVALUACIÓN</div>
                  {Object.entries({continuidad:"Continuidad",integridad:"Integridad",seguridad:"Seguridad",exposicion:"Exposición",capacidadLocal:"Cap. Local"}).map(([k,lbl])=>(
                    <div key={k} style={{marginBottom:6,display:"flex",gap:6,alignItems:"center"}}>
                      <span style={{color:"#94a3b8",fontSize:"11px",width:90,flexShrink:0}}>{lbl}</span>
                      {[0,1,2,3].map(n=>(
                        <button key={n} onClick={()=>setRaEval(p=>({...p,[k]:n}))} style={{padding:"3px 9px",borderRadius:3,border:"1px solid",cursor:"pointer",fontWeight:700,fontSize:"12px",background:raEval[k]===n?["#22c55e","#eab308","#f97316","#ef4444"][n]:"transparent",borderColor:["#22c55e44","#eab30844","#f9731644","#ef444444"][n],color:raEval[k]===n?"#fff":["#22c55e","#eab308","#f97316","#ef4444"][n]}}>{n}</button>
                      ))}
                    </div>
                  ))}
                  <label style={S.lbl}>Justificación *</label>
                  <input style={S.inp} placeholder="Fundamento..." value={raJust} onChange={e=>setRaJust(e.target.value)}/>
                  <button style={{...S.btn("warning"),marginTop:6}} onClick={()=>{if(!raJust)return notify("Justificación obligatoria","error");requestReassessment(c.id,raEval,raJust);setShowRA(false);setRaJust("");}}>Registrar Reevaluación</button>
                </div>
              )}
            </div>

            <div style={S.card}>
              <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:6}}>MÉTRICAS</div>
              {[["T. Activación",timeDiff(c.origin?.detectedAt,c.reportedAt)],["T. 1ª Acción",timeDiff(c.reportedAt,c.firstActionAt)],["T. Escalamiento",timeDiff(c.reportedAt,c.escalatedAt)],["T. Resolución",timeDiff(c.reportedAt,c.resolvedAt)]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:"12px"}}>
                  <span style={{color:"#64748b"}}>{l}</span>
                  <span style={{color:v!=null?"#e2e8f0":"#475569"}}>{v!=null?`${v} min`:"—"}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{...S.card,marginBottom:8}}>
              <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:8}}>LÍNEA DE TIEMPO</div>
              <div style={{maxHeight:200,overflowY:"auto"}}>
                {(c.timeline??[]).map((t,i)=>{const u=USERS.find(u=>u.id===t.actor);return(
                  <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",paddingBottom:8,borderBottom:"1px solid #1e2535"}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:tlC[t.type]||"#64748b",marginTop:5,flexShrink:0}}/>
                    <div>
                      <div style={{fontSize:"10px",color:"#475569"}}>{fmtDate(t.at)}</div>
                      <div style={{fontSize:"11px",color:tlC[t.type]||"#64748b",fontWeight:600}}>{t.type}</div>
                      <div style={{fontSize:"11px",color:"#94a3b8"}}>{t.note}{u&&<span style={{color:"#475569"}}> — {u.name}</span>}</div>
                    </div>
                  </div>
                );})}
              </div>
            </div>

            <div style={{...S.card,marginBottom:8}}>
              <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:6}}>ACCIONES</div>
              {((c.actions??[]) as { id?: string; action?: string; responsible?: string; at?: string; result?: string }[]).map((a)=>{const u=USERS.find(u=>u.id===a.responsible);return(
                <div key={a.id ?? ""} style={{...S.card,background:"#111827",marginBottom:4}}>
                  <div style={{fontWeight:600,fontSize:"12px"}}>{a.action}</div>
                  <div style={{fontSize:"10px",color:"#475569"}}>{u?.name} | {fmtDate(a.at)}</div>
                  {a.result&&<div style={{fontSize:"11px",color:"#22c55e",marginTop:2}}>→ {a.result}</div>}
                </div>
              );})}
              {!isClosed&&canDo("update",currentUser,c)&&(
                <div style={{marginTop:6,borderTop:"1px solid #2d3748",paddingTop:6}}>
                  <input style={{...S.inp,marginBottom:4}} placeholder="Acción..." value={aForm.action} onChange={e=>setAForm(p=>({...p,action:e.target.value}))}/>
                  <div style={{...S.g2,marginBottom:4}}>
                    <select style={S.inp} value={aForm.responsible} onChange={e=>setAForm(p=>({...p,responsible:e.target.value}))}>
                      {USERS.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <input style={S.inp} placeholder="Resultado..." value={aForm.result} onChange={e=>setAForm(p=>({...p,result:e.target.value}))}/>
                  </div>
                  <button style={S.btn("primary")} onClick={()=>{if(!aForm.action)return;addAction(c.id,aForm.action,aForm.responsible,aForm.result);setAForm({action:"",responsible:currentUser.id,result:""});notify("Acción registrada");}}>+ Acción</button>
                </div>
              )}
            </div>

            <div style={{...S.card,marginBottom:8}}>
              <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:6}}>DECISIONES</div>
              {((c.decisions??[]) as { who?: string; fundament?: string }[]).map((d,i)=>{const u=USERS.find(u=>u.id===d.who);return(
                <div key={i} style={{fontSize:"11px",marginBottom:4,padding:4,background:"#111827",borderRadius:3}}>
                  <span style={{color:"#64748b"}}>{u?.name}: </span>{d.fundament}
                </div>
              );})}
              {!isClosed&&(canDo("update",currentUser,c)||canDo("close",currentUser,c))&&(
                <div style={{marginTop:6}}>
                  <input style={S.inp} placeholder="Fundamento de decisión..." value={decForm} onChange={e=>setDecForm(e.target.value)}/>
                  <button style={{...S.btn("dark"),marginTop:4}} onClick={()=>{if(!decForm)return;addDecision(c.id,decForm);setDecForm("");notify("Decisión registrada");}}>+ Decisión</button>
                </div>
              )}
              {canDo("close",currentUser,c)&&c.status!=="Cerrado"&&(
                <div style={{marginTop:8,padding:6,background:"#111827",borderRadius:4,fontSize:"10px"}}>
                  <div style={{color:"#64748b",fontWeight:600,marginBottom:3}}>PRE-REQUISITOS DE CIERRE:</div>
                  {[[c.actions?.length,"Al menos 1 acción"],[c.decisions?.length,"Al menos 1 decisión"],[c.status==="Resuelto","Estado = Resuelto"],[!!c.closingMotivo,"Motivo guardado"],[!c.bypassFlagged||!!c.bypassValidated,"Bypass resuelto"]].map(([ok,lbl],idx)=>(
                    <div key={`req-${idx}-${String(lbl)}`} style={{color:ok?"#22c55e":"#ef4444"}}>{ok?"✓":"✕"} {lbl}</div>
                  ))}
                </div>
              )}
            </div>

            <div style={S.card}>
              <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:6}}>{canDo("instruct",currentUser)?"INSTRUCCIÓN (Nivel Central)":"COMENTARIO"}</div>
              <textarea style={{...S.inp,height:50,resize:"vertical"}} value={cmtTxt} onChange={e=>setCmtTxt(e.target.value)} placeholder={canDo("instruct",currentUser)?"Instrucción...":"Comentario..."}/>
              <button style={{...S.btn("dark"),marginTop:4}} onClick={()=>{if(!cmtTxt)return;addComment(c.id,(canDo("instruct",currentUser)?"[INSTRUCCIÓN] ":"")+cmtTxt);setCmtTxt("");notify("Registrado");}}>+ {canDo("instruct",currentUser)?"Instrucción":"Comentario"}</button>
            </div>
          </div>
        </div>

        <div style={{...S.card,marginTop:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600}}>AUDITORÍA ({ca.length} eventos)</div>
            <span style={S.badge(chainResult.ok?"#22c55e":"#ef4444")}>{chainResult.ok?"🔗 Cadena íntegra":"⚠️ Comprometida"}</span>
          </div>
          <div style={{maxHeight:140,overflowY:"auto"}}>
            {ca.map((e,i)=>{const u=USERS.find(u=>u.id===e.actor);const tc: Record<string, string> = {CASE_CREATED:"#22c55e",BYPASS_USED:"#f97316",BYPASS_FLAGGED:"#ef4444",ESCALATED:"#ef4444",STATUS_CHANGED:"#eab308",ACTION_ADDED:"#94a3b8",EXPORT_DONE:"#6366f1",COMMENT_ADDED:"#64748b",REASSESSMENT:"#f97316",DECISION_ADDED:"#3b82f6",ASSIGNED:"#a78bfa"};
              return<div key={i} style={{display:"flex",gap:6,fontSize:"10px",padding:"3px 0",borderBottom:"1px solid #1e2535",flexWrap:"wrap"}}>
                <span style={{color:"#475569",flexShrink:0,width:108}}>{fmtDate(e.at)}</span>
                <span style={{color:tc[e.type]||"#64748b",fontWeight:600,flexShrink:0,width:130}}>{e.type}</span>
                <span style={{color:"#64748b",flexShrink:0,width:100}}>{u?.name||e.actor}</span>
                <span style={{color:"#94a3b8",flexGrow:1}}>{e.summary}</span>
                <span style={{color:"#2d3748",fontFamily:"monospace",fontSize:"9px"}}>{e.hash}</span>
              </div>;
            })}
          </div>
        </div>
      </div>
    );
  };

  // ─── CATALOG VIEW ─────────────────────────────────────────────────────────
  const CatalogView=()=>{
    const[catRegion,setCatRegion]=useState(activeRegion);
    const[catCommune,setCatCommune]=useState("");
    const[newNombre,setNewNombre]=useState("");
    const[showInactive,setShowInactive]=useState(false);
    const[searchCat,setSearchCat]=useState("");
    const violations=useMemo(()=>catalogSelfCheck(localCatalog),[localCatalog]);
    const filtered=useMemo(()=>localCatalog.filter(l=>{
      if(l.region!==catRegion)return false;
      if(catCommune&&l.commune!==catCommune)return false;
      if(!showInactive&&!l.activoGlobal)return false;
      if(searchCat&&!l.nombre.toLowerCase().includes(searchCat.toLowerCase()))return false;
      return true;
    }),[localCatalog,catRegion,catCommune,showInactive,searchCat]);
    const rData=regionsMap[catRegion];
    return(
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:6}}>
          <h2 style={{margin:0,fontSize:"16px"}}>🗂 Catálogo Maestro de Locales</h2>
          <span style={{...S.badge("#374151"),fontSize:"9px"}}>v1.9 · Modelo B + Snapshots</span>
        </div>
        {violations.length>0&&(
          <div style={{...S.card,background:"#2d0a0a",border:"2px solid #ef4444",marginBottom:10}}>
            <div style={{color:"#ef4444",fontWeight:700,marginBottom:4}}>⛔ INVARIANTES VIOLADAS ({violations.length})</div>
            {violations.map((v,i)=><div key={i} style={{fontSize:"11px",color:"#f87171"}}>{v}</div>)}
          </div>
        )}
        {divergencias.length>0&&(
          <div style={{...S.card,background:"#1c1408",border:"1px solid #f9731644",marginBottom:10}}>
            <div style={{color:"#f97316",fontWeight:700,fontSize:"12px",marginBottom:4}}>⚡ {divergencias.length} caso(s) abierto(s) afectado(s) por cambios en catálogo</div>
            {divergencias.map(x=>(
              <div key={x.caseId} style={{fontSize:"11px",color:"#94a3b8",marginBottom:2}}>
                <span style={{fontFamily:"monospace",color:"#64748b"}}>{x.caseId}</span> — {x.div?.msg}
              </div>
            ))}
          </div>
        )}
        <div style={{...S.g4,marginBottom:10}}>
          {[{l:"Total",v:localCatalog.length,c:"#3b82f6"},{l:"Activos global",v:localCatalog.filter(l=>l.activoGlobal).length,c:"#22c55e"},{l:"Activos elección",v:localCatalog.filter(l=>l.activoEnEleccionActual).length,c:"#a78bfa"},{l:"Inactivos (SD)",v:localCatalog.filter(l=>!l.activoGlobal).length,c:"#ef4444"}].map(k=>(
            <div key={k.l} style={S.card}><div style={{color:k.c,fontSize:"20px",fontWeight:700}}>{k.v}</div><div style={{color:"#64748b",fontSize:"11px"}}>{k.l}</div></div>
          ))}
        </div>
        <div style={{...S.card,marginBottom:8,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
          <select style={{...S.inp,width:"180px"}} value={catRegion} onChange={e=>{setCatRegion(e.target.value);setCatCommune("");}}>
            {Object.entries(regionsMap).map(([k,v])=><option key={k} value={k}>{v?.name}</option>)}
          </select>
          <select style={{...S.inp,width:"160px"}} value={catCommune} onChange={e=>setCatCommune(e.target.value)}>
            <option value="">Todas las comunas</option>
            {Object.entries(rData?.communes||{}).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
          </select>
          <input style={{...S.inp,width:"160px"}} placeholder="🔍 Buscar local..." value={searchCat} onChange={e=>setSearchCat(e.target.value)}/>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:"12px",color:"#94a3b8",whiteSpace:"nowrap"}}>
            <input type="checkbox" checked={showInactive} onChange={e=>setShowInactive(e.target.checked)}/>
            Ver inactivos
          </label>
        </div>
        <div style={{...S.card,marginBottom:10,border:"1px solid #22c55e44"}}>
          <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:8}}>+ AGREGAR LOCAL</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{flex:1,minWidth:150}}>
              <label style={S.lbl}>Región</label>
              <select style={S.inp} value={catRegion} onChange={e=>{setCatRegion(e.target.value);setCatCommune("");}}>
                {Object.entries(regionsMap).map(([k,v])=><option key={k} value={k}>{v?.name}</option>)}
              </select>
            </div>
            <div style={{flex:1,minWidth:140}}>
              <label style={S.lbl}>Comuna *</label>
              <select style={S.inp} value={catCommune} onChange={e=>setCatCommune(e.target.value)}>
                <option value="">Seleccione...</option>
                {Object.entries(rData?.communes||{}).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
              </select>
            </div>
            <div style={{flex:2,minWidth:200}}>
              <label style={S.lbl}>Nombre *</label>
              <input style={S.inp} placeholder="Ej: Liceo Nuevo 2027" value={newNombre} onChange={e=>setNewNombre(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){catalogAddLocal(newNombre,catRegion,catCommune,currentUser);setNewNombre("");}}}/>
            </div>
            <button style={{...S.btn("success"),height:32,whiteSpace:"nowrap"}} onClick={()=>{catalogAddLocal(newNombre,catRegion,catCommune,currentUser);setNewNombre("");}}>+ Agregar</button>
          </div>
        </div>
        <div style={S.card}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 110px 80px 80px 70px 120px",gap:6,padding:"4px 0",borderBottom:"1px solid #2d3748",fontSize:"10px",color:"#475569",fontWeight:700}}>
            <span>LOCAL</span><span>CÓDIGO</span><span>GLOBAL</span><span>ELECCIÓN</span><span>ORIGEN</span><span>ACCIONES</span>
          </div>
          <div style={{maxHeight:400,overflowY:"auto"}}>
            {filtered.length===0&&<div style={{color:"#475569",textAlign:"center",padding:20}}>Sin locales para los filtros</div>}
            {filtered.map(l=>{
              const hasDivCase=divergencias.some(d=>cases.find(c=>c.id===d.caseId)?.localSnapshot?.idLocal===l.idLocal);
              return(
                <div key={l.idLocal} style={{display:"grid",gridTemplateColumns:"1fr 110px 80px 80px 70px 120px",gap:6,padding:"5px 0",borderBottom:"1px solid #1e2535",alignItems:"center",opacity:l.activoGlobal?1:0.5}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:"12px",color:l.activoGlobal?"#e2e8f0":"#475569",display:"flex",alignItems:"center",gap:4}}>
                      {l.nombre}
                      {hasDivCase&&<span style={{...S.badge("#f97316"),fontSize:"8px"}}>⚡ caso activo</span>}
                    </div>
                    <div style={{fontSize:"10px",color:"#475569"}}>{regionsMap[l.region]?.communes?.[l.commune]?.name||l.commune}</div>
                    {l.fechaDesactivacion&&<div style={{fontSize:"9px",color:"#ef4444"}}>SD: {fmtDate(l.fechaDesactivacion)}</div>}
                  </div>
                  <span style={{fontFamily:"monospace",fontSize:"10px",color:"#475569"}}>{l.idLocal}</span>
                  <span style={S.badge(l.activoGlobal?"#22c55e":"#ef4444")}>{l.activoGlobal?"Activo":"Inactivo"}</span>
                  <span style={S.badge(l.activoEnEleccionActual?"#a78bfa":"#374151")}>{l.activoEnEleccionActual?"Sí":"No"}</span>
                  <span style={{fontSize:"10px",color:"#475569"}}>{l.origenSeed?"Seed":"Manual"}</span>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {l.activoGlobal?(
                      <>
                        <button style={{...S.btn(l.activoEnEleccionActual?"dark":"primary"),fontSize:"9px",padding:"2px 6px"}} onClick={()=>catalogToggleEleccion(l.idLocal,currentUser)}>{l.activoEnEleccionActual?"↓ Elec.":"↑ Elec."}</button>
                        <button style={{...S.btn("danger"),fontSize:"9px",padding:"2px 6px"}} onClick={()=>{if(window.confirm(`¿Desactivar "${l.nombre}"?${hasDivCase?" ⚠️ Tiene caso(s) activo(s)":""}`))catalogDeactivate(l.idLocal,currentUser);}}>SD</button>
                      </>
                    ):(
                      <button style={{...S.btn("success"),fontSize:"9px",padding:"2px 6px"}} onClick={()=>catalogReactivate(l.idLocal,currentUser)}>Reactiv.</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{...S.card,marginTop:10}}>
          <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:6}}>AUDITORÍA DE CATÁLOGO</div>
          <div style={{maxHeight:130,overflowY:"auto"}}>
            {[...auditLog].filter(e=>["LOCAL_CREATED","LOCAL_DEACTIVATED","LOCAL_REACTIVATED","LOCAL_ELECTION_TOGGLED"].includes(e.type)).slice(-20).reverse().map((e,i)=>{
              const u=USERS.find(u=>u.id===e.actor);
              const tc: Record<string, string> = {LOCAL_CREATED:"#22c55e",LOCAL_DEACTIVATED:"#ef4444",LOCAL_REACTIVATED:"#f97316",LOCAL_ELECTION_TOGGLED:"#a78bfa"};
              return<div key={i} style={{display:"flex",gap:6,fontSize:"10px",padding:"3px 0",borderBottom:"1px solid #1e2535",flexWrap:"wrap"}}>
                <span style={{color:"#475569",width:108,flexShrink:0}}>{fmtDate(e.at)}</span>
                <span style={{color:tc[e.type]||"#64748b",fontWeight:600,width:160,flexShrink:0}}>{e.type}</span>
                <span style={{color:"#64748b",width:100,flexShrink:0}}>{u?.name||e.actor}</span>
                <span style={{color:"#94a3b8",flexGrow:1}}>{e.summary}</span>
              </div>;
            })}
            {!auditLog.some(e=>["LOCAL_CREATED","LOCAL_DEACTIVATED","LOCAL_REACTIVATED","LOCAL_ELECTION_TOGGLED"].includes(e.type))&&(
              <div style={{color:"#475569",textAlign:"center",padding:12}}>Sin operaciones de catálogo</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── REPORTS ─────────────────────────────────────────────────────────────
  const Reports=()=>{
    const avgAct=cases.filter(c=>c.reportedAt&&c.origin?.detectedAt).map(c=>timeDiff(c.origin!.detectedAt,c.reportedAt!)).filter(v=>v!=null);
    const avgAcc=cases.filter(c=>c.firstActionAt&&c.reportedAt).map(c=>timeDiff(c.reportedAt,c.firstActionAt)).filter(v=>v!=null);
    const metricas=[
      ["T. prom. activación", avgAct.length?Math.round(avgAct.reduce((a,b)=>a+b,0)/avgAct.length):null, "min"],
      ["T. prom. 1ª acción",  avgAcc.length?Math.round(avgAcc.reduce((a,b)=>a+b,0)/avgAcc.length):null, "min"],
      ["SLA vencidos",        cases.filter(c=>isSlaVencido(c)).length, "casos"],
      ["Completitud promedio",cases.length?Math.round(cases.reduce((s,c)=>s+(c.completeness??0),0)/cases.length):0, "%"],
      ["Divergencias activas",divergencias.length, "casos"],
    ];
    return(
      <div>
        <h2 style={{margin:"0 0 12px",fontSize:"16px"}}>Reportes y Exportación</h2>
        <div style={{...S.g4,marginBottom:10}}>
          {[{l:"Total casos",v:cases.length,c:"#3b82f6"},{l:"Críticos",v:cases.filter(c=>c.criticality==="CRITICA").length,c:"#ef4444"},{l:"Bypass Flagged",v:cases.filter(c=>c.bypassFlagged&&!c.bypassValidated).length,c:"#f97316"},{l:"Con Snapshot",v:cases.filter(c=>c.localSnapshot).length,c:"#6366f1"}].map(k=>(
            <div key={k.l} style={S.card}><div style={{color:k.c,fontSize:"22px",fontWeight:700}}>{k.v}</div><div style={{color:"#64748b",fontSize:"11px"}}>{k.l}</div></div>
          ))}
        </div>
        <div style={{...S.g2,marginBottom:10}}>
          <div style={S.card}>
            <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:8}}>MÉTRICAS</div>
            {metricas.map(([l,v,u])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:"12px"}}>
                <span style={{color:"#64748b"}}>{l}</span>
                <span style={{color:v!=null?"#e2e8f0":"#475569",fontWeight:600}}>{v!=null?`${v} ${u}`:"—"}</span>
              </div>
            ))}
          </div>
          <div style={S.card}>
            <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:8}}>CRITICIDAD</div>
            {(["CRITICA","ALTA","MEDIA","BAJA"] as Criticality[]).map(cr=>{const n=cases.filter(c=>c.criticality===cr).length;return(
              <div key={cr} style={{marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"11px",marginBottom:2}}>
                  <span style={{color:critColor(cr)}}>{cr}</span><span style={{color:"#94a3b8"}}>{n}</span>
                </div>
                <div style={{height:4,background:"#1e2535",borderRadius:2}}>
                  <div style={{height:"100%",width:cases.length?`${n/cases.length*100}%`:"0%",background:critColor(cr),borderRadius:2}}/>
                </div>
              </div>
            );})}
          </div>
        </div>
        <div style={{...S.card,marginBottom:10}}>
          <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:8}}>EXPORTAR</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {canDo("export",currentUser)&&<button style={S.btn("primary")} onClick={exportCSV}>📊 CSV Casos</button>}
            {canDo("export",currentUser)&&<button style={S.btn("primary")} onClick={exportJSON}>📦 JSON Completo</button>}
            {canDo("export",currentUser)&&<button style={S.btn("dark")} onClick={exportAuditCSV}>🔗 CSV Auditoría</button>}
          </div>
        </div>
        {divergencias.length>0&&(
          <div style={{...S.card,border:"1px solid #f9731644"}}>
            <div style={{color:"#f97316",fontWeight:700,fontSize:"12px",marginBottom:8}}>⚡ Divergencias catálogo activas ({divergencias.length})</div>
            {divergencias.map(x=>(
              <div key={x.caseId} style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,fontSize:"11px",padding:"4px 0",borderBottom:"1px solid #1e2535"}}>
                <span style={{fontFamily:"monospace",color:"#64748b",flexShrink:0}}>{x.caseId}</span>
                <span style={{color:"#94a3b8",flex:1}}>{x.caseSummary.slice(0,50)}</span>
                <span style={{color:"#f97316"}}>{x.div?.msg}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ─── AUDIT VIEW ───────────────────────────────────────────────────────────
  const AuditView=()=>{
    const{ok,failIndex}=chainResult;
    return(
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:6}}>
          <h2 style={{margin:0,fontSize:"16px"}}>Auditoría — Cadena Hash</h2>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <span style={S.badge(ok?"#22c55e":"#ef4444")}>{ok?`🔗 Íntegra (${auditLog.length} eventos)`:`⚠️ Comprometida en evento ${failIndex}`}</span>
            {canDo("export",currentUser)&&<button style={S.btn("dark")} onClick={exportAuditCSV}>⬇ CSV</button>}
          </div>
        </div>
        <div style={S.card}>
          <div style={{display:"grid",gridTemplateColumns:"110px 150px 100px 100px 1fr 80px",gap:4,padding:"4px 0",borderBottom:"1px solid #2d3748",fontSize:"10px",color:"#475569",fontWeight:700}}>
            <span>TIMESTAMP</span><span>TIPO</span><span>ACTOR</span><span>CASO</span><span>RESUMEN</span><span>HASH</span>
          </div>
          <div style={{maxHeight:500,overflowY:"auto"}}>
            {[...auditLog].reverse().map((e,i)=>{
              const u=USERS.find(u=>u.id===e.actor);
              const realIdx=auditLog.length-1-i;
              const isFail=!ok&&realIdx===failIndex;
              const tc: Record<string, string> = {CASE_CREATED:"#22c55e",BYPASS_USED:"#f97316",BYPASS_FLAGGED:"#ef4444",ESCALATED:"#ef4444",STATUS_CHANGED:"#eab308",ACTION_ADDED:"#94a3b8",EXPORT_DONE:"#6366f1",LOCAL_CREATED:"#22c55e",LOCAL_DEACTIVATED:"#ef4444",LOCAL_REACTIVATED:"#f97316",LOCAL_ELECTION_TOGGLED:"#a78bfa"};
              return<div key={i} style={{display:"grid",gridTemplateColumns:"110px 150px 100px 100px 1fr 80px",gap:4,padding:"4px 0",borderBottom:"1px solid #1e2535",fontSize:"10px",background:isFail?"#2d0a0a":"transparent"}}>
                <span style={{color:"#475569"}}>{fmtDate(e.at)}</span>
                <span style={{color:tc[e.type]||"#64748b",fontWeight:600}}>{e.type}</span>
                <span style={{color:"#64748b"}}>{u?.name||e.actor}</span>
                <span style={{color:"#475569",fontFamily:"monospace"}}>{e.caseId?.slice(-10)||"—"}</span>
                <span style={{color:"#94a3b8"}}>{e.summary}</span>
                <span style={{color:isFail?"#ef4444":"#2d3748",fontFamily:"monospace"}}>{e.hash}</span>
              </div>;
            })}
          </div>
        </div>
      </div>
    );
  };

  // ─── SIMULATION VIEW ──────────────────────────────────────────────────────
  const SimulationView=()=>(
    <div>
      <h2 style={{margin:"0 0 12px",fontSize:"16px"}}>Simulación de Día de Elección</h2>
      <div style={{...S.card,marginBottom:10,border:"1px solid #6366f144"}}>
        <div style={{color:"#94a3b8",fontSize:"11px",marginBottom:8}}>Genera 10 incidentes para entrenamiento. Los casos incluyen snapshot de local (v1.9).</div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          <button style={S.btn("primary")} onClick={runSimulation}>▶ Generar Simulación</button>
          {simCases.length>0&&<button style={S.btn("warning")} onClick={loadSimCases}>Cargar en Dashboard</button>}
        </div>
      </div>
      {simReport&&(
        <div style={{...S.g4,marginBottom:10}}>
          {[{l:"Total",v:simReport.total,c:"#3b82f6"},{l:"Críticos",v:simReport.critica,c:"#ef4444"},{l:"Altos",v:simReport.alta,c:"#f97316"},{l:"Score prom.",v:simReport.avgScore,c:"#eab308"}].map(k=>(
            <div key={k.l} style={S.card}><div style={{color:k.c,fontSize:"22px",fontWeight:700}}>{k.v}</div><div style={{color:"#64748b",fontSize:"11px"}}>{k.l}</div></div>
          ))}
        </div>
      )}
      {simCases.map(c=>(
        <div key={c.id} style={{...S.card,borderLeft:`3px solid ${critColor(c.criticality)}`,marginBottom:4}}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
            <div style={{display:"flex",gap:4,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontFamily:"monospace",color:"#64748b",fontSize:"10px"}}>{c.id}</span>
              <span style={S.badge(critColor(c.criticality))}>{c.criticality}</span>
              <span style={{fontSize:"11px",fontWeight:600}}>{c.summary}</span>
            </div>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <span style={{fontSize:"10px",color:"#60a5fa"}}>🏫 {c.local}</span>
              {c.localSnapshot&&<span style={{fontSize:"9px",color:"#6366f1"}}>📸</span>}
            </div>
          </div>
        </div>
      ))}
      {simCases.length>0&&!simSurvey.submitted&&(
        <div style={{...S.card,marginTop:10,border:"1px solid #6366f144"}}>
          <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:8}}>Encuesta post-simulación</div>
          {[{key:"claridad",label:"¿El sistema fue claro bajo presión?"},{key:"respaldo",label:"¿Los snapshots de local aportan confianza?"}].map(q=>(
            <div key={q.key} style={{marginBottom:8}}>
              <div style={{fontSize:"12px",color:"#94a3b8",marginBottom:4}}>{q.label}</div>
              <div style={{display:"flex",gap:4}}>
                {[1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setSimSurvey(p=>({...p,[q.key]:n}))} style={{padding:"4px 10px",borderRadius:3,border:"1px solid",cursor:"pointer",background:(simSurvey as Record<string, number|boolean>)[q.key]===n?"#3b82f6":"transparent",borderColor:(simSurvey as Record<string, number|boolean>)[q.key]===n?"#3b82f6":"#374151",color:(simSurvey as Record<string, number|boolean>)[q.key]===n?"#fff":"#64748b"}}>{n}</button>
                ))}
              </div>
            </div>
          ))}
          <button style={S.btn("success")} onClick={()=>setSimSurvey(p=>({...p,submitted:true}))}>Enviar</button>
        </div>
      )}
      {simSurvey.submitted&&<div style={{...S.card,marginTop:10,color:"#22c55e",fontWeight:600}}>✓ Encuesta registrada — Claridad: {simSurvey.claridad}/5 · Snapshots: {simSurvey.respaldo}/5</div>}
    </div>
  );

  // ─── CHECKLIST ────────────────────────────────────────────────────────────
  const ChecklistView=()=>{
    const[checks,setChecks]=useState<Record<string, boolean>>({});
    const items=[
      {id:"c1",cat:"Pre-apertura",text:"Verificar locales activos en catálogo (activoGlobal + activoEnEleccionActual)"},
      {id:"c2",cat:"Pre-apertura",text:"Confirmar año electoral correcto en Config"},
      {id:"c3",cat:"Pre-apertura",text:"Revisar divergencias pendientes del catálogo (panel naranja)"},
      {id:"c4",cat:"Pre-apertura",text:"Verificar acceso de todos los roles al SCCE"},
      {id:"c5",cat:"Apertura",    text:"Confirmar apertura de mesas en locales críticos"},
      {id:"c6",cat:"Apertura",    text:"Testear registro de incidente con snapshot de local"},
      {id:"c7",cat:"Operación",   text:"Monitorear panel de divergencias en Dashboard"},
      {id:"c8",cat:"Operación",   text:"Revisar bypass flagged pendientes de validación"},
      {id:"c9",cat:"Operación",   text:"Verificar integridad cadena auditoría (badge verde)"},
      {id:"c10",cat:"Cierre",     text:"Exportar CSV y JSON de casos"},
      {id:"c11",cat:"Cierre",     text:"Exportar auditoría completa"},
      {id:"c12",cat:"Cierre",     text:"Verificar casos sin cerrar y completitud ≥80%"},
    ];
    const cats=[...new Set(items.map(i=>i.cat))];
    const done=Object.values(checks).filter(Boolean).length;
    return(
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <h2 style={{margin:0,fontSize:"16px"}}>Checklist Electoral</h2>
          <span style={S.badge(done===items.length?"#22c55e":"#3b82f6")}>{done}/{items.length}</span>
        </div>
        {cats.map(cat=>(
          <div key={cat} style={{...S.card,marginBottom:8}}>
            <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:6}}>{cat.toUpperCase()}</div>
            {items.filter(i=>i.cat===cat).map(it=>(
              <label key={it.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,cursor:"pointer"}}>
                <input type="checkbox" checked={!!checks[it.id]} onChange={e=>setChecks(p=>({...p,[it.id]:e.target.checked}))}/>
                <span style={{color:checks[it.id]?"#22c55e":"#e2e8f0",fontSize:"12px",textDecoration:checks[it.id]?"line-through":"none"}}>{it.text}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // ─── CONFIG VIEW ──────────────────────────────────────────────────────────
  const ConfigView=()=>{
    const[draft,setDraft]=useState({...electionConfig});
    const[confirmYear,setConfirmYear]=useState(false);
    const yearChanged=draft.year!==electionConfig.year;
    const activeCatalogCount=localCatalog.filter(l=>l.activoEnEleccionActual).length;
    function applyConfig(){
      if(!currentUser)return;
      if(yearChanged&&!confirmYear)return notify("Confirma el cambio de año electoral","error");
      setElectionConfig({...draft,name:draft.name||`Elecciones Generales ${draft.year}`});
      if(yearChanged){
        setAuditLog(prev=>appendEvent(prev,"ELECTION_YEAR_CHANGED",currentUser.id,currentUser.role,null,`Año: ${electionConfig.year} → ${draft.year}. Locales activos: ${activeCatalogCount}`));
        notify(`Año actualizado a ${draft.year}. Revise activación de locales en Catálogo.`,"warning");
      } else {
        notify("Configuración guardada","success");
      }
      setConfirmYear(false);
    }
    return(
      <div>
        <h2 style={{margin:"0 0 12px",fontSize:"16px"}}>Configuración</h2>
        <div style={{...S.card,marginBottom:10}}>
          <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:10}}>DATOS DE LA ELECCIÓN</div>
          <div style={{...S.g2,marginBottom:8}}>
            <div>
              <label style={S.lbl}>Nombre del proceso</label>
              <input style={S.inp} value={draft.name} onChange={e=>setDraft(p=>({...p,name:e.target.value}))}/>
            </div>
            <div>
              <label style={S.lbl}>Fecha</label>
              <input style={S.inp} type="date" value={draft.date} onChange={e=>setDraft(p=>({...p,date:e.target.value}))}/>
            </div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={S.lbl}>Año Electoral (≥{MIN_ELECTION_YEAR})</label>
            <div style={{display:"flex",gap:6,alignItems:"flex-start",flexWrap:"wrap"}}>
              <input style={{...S.inp,width:100}} type="number" min={MIN_ELECTION_YEAR} max={2099} value={draft.year}
                onChange={e=>{const y=parseInt(e.target.value);if(y>=MIN_ELECTION_YEAR&&y<=2099){setDraft(p=>({...p,year:y,name:`Elecciones Generales ${y}`,date:`${y}-11-15`}));setConfirmYear(false);}}}
              />
              {yearChanged&&(
                <div style={{...S.card,background:"#1c1408",border:"1px solid #f9731644",padding:"8px 10px",flex:1}}>
                  <div style={{color:"#f97316",fontSize:"11px",fontWeight:600,marginBottom:4}}>⚠️ Cambio: {electionConfig.year} → {draft.year}</div>
                  <div style={{color:"#64748b",fontSize:"10px",marginBottom:6}}>{activeCatalogCount} local(es) activos en elección actual. Snapshots existentes quedan intactos.</div>
                  <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
                    <input type="checkbox" checked={confirmYear} onChange={e=>setConfirmYear(e.target.checked)}/>
                    <span style={{fontSize:"11px",color:"#f97316",fontWeight:600}}>Confirmo el cambio de año</span>
                  </label>
                </div>
              )}
            </div>
          </div>
          <button style={S.btn("success")} onClick={applyConfig}>Guardar configuración</button>
        </div>
        <div style={{...S.card,marginBottom:10}}>
          <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:6}}>INFORMACIÓN DEL SISTEMA</div>
          <div style={{fontSize:"12px",color:"#64748b"}}>
            {[["Versión",`SCCE v${APP_VERSION}`],["Elección activa",electionConfig.name],["Año electoral",electionConfig.year],["Locales en catálogo",localCatalog.length],["Activos en elección",activeCatalogCount],["Cadena auditoría",chainResult.ok?"ÍNTEGRA ✓":"COMPROMETIDA ⚠️"],["Divergencias activas",divergencias.length]].map(([l,v])=>(
              <div key={l} style={{marginBottom:3}}><span style={{color:"#475569"}}>{l}:</span> <span style={{color:"#94a3b8"}}>{String(v)}</span></div>
            ))}
            <div style={{marginTop:6,color:"#374151",fontSize:"10px"}}>Sin backend · Sin BD · Auditoría append-only · Snapshots v1.9</div>
          </div>
        </div>
        <div style={S.card}>
          <div style={{color:"#94a3b8",fontSize:"11px",fontWeight:600,marginBottom:6}}>RESETEAR SISTEMA</div>
          <div style={{color:"#64748b",fontSize:"11px",marginBottom:6}}>Restaura datos de demostración. No reversible.</div>
          <button style={S.btn("danger")} onClick={()=>{if(window.confirm("¿Resetear todo el sistema?"))doReset();}}>Reset Demo</button>
        </div>
      </div>
    );
  };

  // ─── LAYOUT PRINCIPAL ─────────────────────────────────────────────────────
  return(
    <div style={S.app}>
      <style>{`.tipWrap:hover .tip{display:block!important}input,select,textarea{color:#e2e8f0!important}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:#0f1117}::-webkit-scrollbar-thumb{background:#374151;border-radius:2px}`}</style>
      <div style={S.nav}>
        <span style={{fontWeight:800,color:"#3b82f6",fontSize:"13px",marginRight:4,letterSpacing:.5}}>SCCE</span>
        <span style={{color:"#374151",fontSize:"10px",marginRight:8}}>v{APP_VERSION}</span>
        {["dashboard","catalog","audit","reports","simulation","checklist","config"].map(v=>(
          <button key={v} style={S.nBtn(view===v)} onClick={()=>setView(v)}>
            {v==="dashboard"?"Dashboard":v==="catalog"?"🗂 Catálogo":v==="audit"?"🔗 Auditoría":v==="reports"?"Reportes":v==="simulation"?"Simulación":v==="checklist"?"Checklist":"Config"}
          </button>
        ))}
        <button style={{background:"#16a34a",color:"#fff",border:"1px solid #22c55e66",padding:"5px 12px",borderRadius:"4px",cursor:"pointer",fontSize:"12px",fontWeight:700,boxShadow:"0 0 8px #16a34a44"}} onClick={startNewCase}>+ Incidente</button>
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          {divergencias.length>0&&<span style={{...S.badge("#f97316"),fontSize:"9px",cursor:"pointer"}} onClick={()=>setView("catalog")}>⚡ {divergencias.length}</span>}
          <span style={{fontSize:"10px",color:"#475569"}}>{electionConfig.name}</span>
          <span style={S.badge("#374151")}>{currentUser.name}</span>
          <span style={{...S.badge("#1e40af"),fontSize:"9px"}}>{ROLE_LABELS[currentUser.role]}</span>
          <button style={{...S.btn("dark"),fontSize:"11px"}} onClick={()=>setCurrentUser(null)}>Salir</button>
        </div>
      </div>

      {notification&&(
        <div style={{background:{error:"#ef4444",success:"#22c55e",warning:"#f97316",info:"#3b82f6"}[notification.type]||"#3b82f6",color:"#fff",padding:"8px 16px",fontSize:"12px",fontWeight:600,position:"sticky",top:0,zIndex:100}}>
          {notification.msg}
        </div>
      )}

      <div style={{maxWidth:1100,margin:"0 auto",padding:"12px 16px"}}>
        {view==="dashboard"&&<Dashboard/>}
        {view==="new_case"&&<NewCaseForm/>}
        {view==="detail"&&<CaseDetail/>}
        {view==="catalog"&&<CatalogView/>}
        {view==="audit"&&<AuditView/>}
        {view==="reports"&&<Reports/>}
        {view==="simulation"&&<SimulationView/>}
        {view==="checklist"&&<ChecklistView/>}
        {view==="config"&&<ConfigView/>}
      </div>
    </div>
  );
}
