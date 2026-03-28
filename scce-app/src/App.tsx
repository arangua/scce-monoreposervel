import React, { useMemo, useEffect, useCallback } from "react";
import type { CaseItem, CaseStatus } from "./domain/types";
// ── R-1: helpers extraídos (2026-03-27) ──────────────────────────────────────
import { importFail, assertStringMax, assertIdStable, assertArrayMax, assertUnknownItemKind, assertCaseEvent, assertIsoSoft, MAX_ID, MAX_SHORT, MAX_MED, MAX_LONG, MAX_UNKNOWN_ARRAY, MAX_TIMELINE, MAX_EVIDENCE_ITEMS, MAX_TOTAL_PAYLOAD_BYTES } from "./domain/importValidation";
import {
  USERS,
  ROLE_LABELS,
  canDo,
  type PolicyUser,
} from "./domain/policyEngine";
import { genId, calcCriticality, normalizeStatus, SIM_SCENARIOS } from "./domain/caseUtils";
import { CONFIG_REGIONS, buildCatalogSeed, buildCatalogDemo, getActiveLocals, catalogSelfCheck } from "./domain/catalog";
import { makeSeedCases, makeSeedAudit } from "./domain/seed";
import { fmtDate, nowISO, tsISO, nowLocalDatetimeInput } from "./domain/date";
import { checkLocalDivergence } from "./domain/localDivergence";
import { SLA_MINUTES, type SlaLevel } from "./domain/caseSla";
import { themeColor } from "./theme";
import { appendEvent, verifyChain } from "./domain/audit";
import { migrateLegacyInstructionsInCases } from "./domain/migrations/migrateLegacyInstructions";
import { HelpDrawer } from "./components/HelpDrawer";
import { Badge } from "./ui/Badge";
import { helpByView, type ViewKey } from "./helpContent";
import { UI_TEXT } from "./config/uiTextStandard";
import { isTerrainMode } from "./domain/auth/visibility";
import { TerrainShell } from "./ui/terrain/TerrainShell";
import { apiRequest } from "./domain/apiClient";
import {
  clearSession,
  clearActiveMembership,
  getActiveMembership,
  setActiveMembership,
  isCentralFromContext,
} from "./domain/authSession";
import { API_BASE_URL } from "./config/runtime";

// ── R-4a: vistas extraídas (2026-03-27) ──────────────────────────────────────
import { ChecklistView } from "./components/ChecklistView";
import { AuditView } from "./components/AuditView";
import { SimulationView } from "./components/SimulationView";
import { TrustView } from "./components/TrustView";
import { ConfigView } from "./components/ConfigView";
import { DashboardView } from "./components/DashboardView";
import { NewCaseView } from "./components/NewCaseView";
import { CatalogView } from "./components/CatalogView";
import { ReportsView } from "./components/ReportsView";
import { CaseDetailView } from "./components/CaseDetailView";
import { CopView } from "./components/CopView";
import { useAppStore } from "./store/useAppStore";
import { useAuth } from "./hooks/useAuth";
import { useExportImport } from "./hooks/useExportImport";
import { useAssignedLocalScope } from "./hooks/useAssignedLocalScope";

const APP_VERSION = "1.9";
const MIN_ELECTION_YEAR = 2026;

// ─────────────────────────────────────────────────────────────────────────────
// R-1 REFACTOR: constantes/funciones extraídas a:
//   domain/importValidation.ts  → helpers de assert/validación
//   domain/policyEngine.ts      → USERS, POLICIES, canDo
//   domain/caseUtils.ts         → genId, calcCriticality, critColor, etc.
// Las definiciones inline eliminadas — R-2: quitar residuos.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_CASES = 5000;

type User = PolicyUser;

// CONFIG delegado a domain/catalog.ts (CONFIG_REGIONS)
const CONFIG = { regions: CONFIG_REGIONS };
const DEFAULT_REGION = "01"; // Tarapacá — código CUT oficial

/** Misma lógica que DashboardView — filtro TerrainShell / terreno. */
function getCaseLocalIdSafe(
  c: { localScope?: string; localRef?: { idLocal?: string }; localSnapshot?: { idLocal?: string } | null },
  localCatalogById: Map<string, unknown>
): string | null {
  if (c?.localScope === "REGIONAL") return null;
  const raw =
    (c as { localRef?: { idLocal?: string } })?.localRef?.idLocal ??
    (c as { localSnapshot?: { idLocal?: string } | null })?.localSnapshot?.idLocal ??
    null;
  if (!raw) return null;
  const id = String(raw);
  return localCatalogById.has(id) ? id : null;
}

// ─── ESTILOS (tema claro profesional) ─────────────────────────────────────────
const S={
  app:{fontFamily:"'Inter',system-ui,sans-serif",background:"var(--bg-app)",color:"var(--text-primary)",minHeight:"100vh",fontSize:"13px",width:"100%",boxSizing:"border-box" as const},
  nav:{background:"var(--bg-surface)",borderBottom:"1px solid var(--border)",padding:"0 16px",display:"flex",alignItems:"center",gap:"2px",flexWrap:"nowrap" as const,minHeight:48,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflowX:"auto" as const,overflow:"visible" as const},
  nBtn:(a: boolean)=>({background:a?"var(--primary)":"transparent",color:a?"#fff":"var(--text-secondary)",border:"none",padding:"5px 10px",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontWeight: a ? 600 : 400,transition:"all 0.15s"}),
  card:{background:"var(--bg-surface)",border:"1px solid var(--border)",borderRadius:"8px",padding:"12px",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"},
  badge:(color: string)=>({background:color+"22",color,border:"1px solid "+color+"44",borderRadius:"4px",padding:"2px 8px",fontSize:"11px",fontWeight:600}),
  btn:(v="primary")=>({background:{primary:"var(--primary)",success:"var(--success)",danger:"var(--danger)",warning:"var(--warning)",dark:"var(--text-secondary)"}[v]||"var(--primary)",color:"#fff",border:"none",padding:"6px 14px",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontWeight:600,transition:"opacity 0.15s"}),
  inp:{background:"var(--bg-surface)",border:"1px solid var(--border)",borderRadius:"6px",padding:"7px 10px",color:"var(--text-primary)",fontSize:"13px",width:"100%",boxSizing:"border-box"} as React.CSSProperties,
  lbl:{display:"block",marginBottom:"3px",color:themeColor("textSecondary"),fontSize:"11px",fontWeight:600,textTransform:"uppercase"} as React.CSSProperties,
  g2:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"},
  g4:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"8px"},
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function App(){
  // ── Único destructuring del store — R-2/R-3 refactor ────────────────────────────────────────
  const {
    // Auth
    electionConfig, setElectionConfig,
    currentUser, setCurrentUser,
    authToken, setAuthToken,
    apiUser, setApiUser,
    memberships, setMemberships,
    activeMembership, setActiveMembershipState,
    activeRegion, setActiveRegion,
    membershipScopes, justBecameCentralRef,
    // Datos
    localCatalog, setLocalCatalog,
    cases, setCases,
    auditLog, setAuditLog,
    selectedCase, setSelectedCase,
    // UI / navegación
    view, setView,
    uiMode, setUiMode,
    crisisMode, setCrisisMode,
    filterState, setFilterState,
    notification, setNotification,
    helpOpen, setHelpOpen,
    actionsOpen, setActionsOpen,
    busyAction, setBusyAction,
    // Formulario nuevo caso
    setNewCase,
    setEvalForm,
    setBypassForm,
    setStep,
    // Login UI
    loginForm, setLoginForm,
    showPassword, setShowPassword,
    loginErr, setLoginErr,
    ctxErr, setCtxErr,
    authBusy,
    // Tema visual
    darkMode, setDarkMode,
    // Modo operacional
    operationMode, setOperationMode,
    // Simulación
    simCases, setSimCases,
    simReport, setSimReport,
    simSurvey, setSimSurvey,
    // Refs
    importJsonInputRef, importFileRef,
  } = useAppStore();

  // ── Derivados de membership ──────────────────────────────────────────────────────────
  const effectiveMembership = getActiveMembership();
  const isCentral = isCentralFromContext(effectiveMembership, currentUser?.role);

  const {
    fixedLocalRole,
    assignedLocalIdEffective,
    assignedLocal,
    assignedCommuneEffective,
    localCatalogById,
  } = useAssignedLocalScope();

  const visibleCases = useMemo(
    () =>
      cases.filter((c) => {
        if (fixedLocalRole) {
          if (!assignedLocalIdEffective || !localCatalogById.has(assignedLocalIdEffective)) return false;
          const cid = getCaseLocalIdSafe(c, localCatalogById);
          if (cid !== assignedLocalIdEffective) return false;
        }
        const regionToFilter =
          filterState.region ||
          (isCentral && filterState.commune && activeRegion ? activeRegion : null);
        if (regionToFilter) {
          const caseRegion =
            (c as { region?: string; regionCode?: string }).regionCode ??
            (c as { region?: string; regionCode?: string }).region ??
            null;
          if (!caseRegion) return false;
          if (caseRegion !== regionToFilter) return false;
        }
        if (!fixedLocalRole) {
          if (!canDo("viewAll", currentUser, c)) {
            if (c.createdBy !== currentUser?.id && c.assignedTo !== currentUser?.id) return false;
          }
        }
        if (filterState.criticality && c.criticality !== filterState.criticality) return false;
        if (filterState.status) {
          if (normalizeStatus(c.status) !== normalizeStatus(filterState.status)) return false;
        }
        if (filterState.commune && c.commune !== filterState.commune) return false;
        if (filterState.search) {
          const q = filterState.search.toLowerCase();
          const localText =
            (c.local || "") +
            " " +
            ((c as { localSnapshot?: { nombre?: string } }).localSnapshot?.nombre || "") +
            " " +
            ((c as { localRef?: { label?: string } }).localRef?.label || "");
          if (
            !String(c.summary ?? "").toLowerCase().includes(q) &&
            !String(c.id ?? "").toLowerCase().includes(q) &&
            !localText.toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      }),
    [cases, currentUser, activeRegion, filterState, fixedLocalRole, assignedLocalIdEffective, localCatalogById, isCentral]
  );

  // ── Hooks de lógica ────────────────────────────────────────────────────────────────────
  const { bootstrapSession, doLogin } = useAuth();
  const { onExportState, onImportStateFile, exportCaseTXT } = useExportImport();

  // onExportState y onImportStateFile: extraidos a hooks/useExportImport.ts (R-3)
  const OP_HOME_VIEW = "op_home" as const;
  type UiMode = "OP" | "FULL";
  function uiModeStorageKey(userId: string) {
    return `SCCE_UI_MODE:${userId}`;
  }
  const defaultUiModeForUser = useCallback((u: User | null): UiMode => {
    return isTerrainMode(u) ? "OP" : "FULL";
  }, []);

  function withBusy(key: string, fn: () => void) {
    if (busyAction[key]) return;
    setBusyAction((prev) => ({ ...prev, [key]: true }));
    try {
      fn();
    } finally {
      setTimeout(() => setBusyAction((prev) => ({ ...prev, [key]: false })), 350);
    }
  }

  const goToSection=(nextView: ViewKey,sectionId: string)=>{
    setView(nextView);
    setActionsOpen(false);
    window.setTimeout(()=>{
      const el=document.getElementById(sectionId);
      el?.scrollIntoView({behavior:"smooth",block:"start"});
    },60);
  };
  useEffect(()=>{
    if (!actionsOpen) return;
    const onDown=(e: MouseEvent)=>{
      const t=e.target as HTMLElement|null;
      if (!t) return;
      if (t.closest?.("[data-actions-menu]")) return;
      setActionsOpen(false);
    };
    window.addEventListener("mousedown",onDown);
    return ()=>window.removeEventListener("mousedown",onDown);
  },[actionsOpen]);
  useEffect(()=>{setHelpOpen(false);},[view]);

  // Sincronizar modo oscuro con DOM y localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("SCCE_DARK_MODE", String(darkMode));
  }, [darkMode]);
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
  }, [currentUser, defaultUiModeForUser]);

  function setUiModeAndPersist(next: UiMode) {
    setUiMode(next);
    if (currentUser?.id) {
      localStorage.setItem(uiModeStorageKey(currentUser.id), next);
    }
  }

  useEffect(()=>{
    const onKey=(e: KeyboardEvent)=>{
      const isCtrl=e.ctrlKey||e.metaKey;
      if (!isCtrl) return;
      const tag=(e.target as HTMLElement|null)?.tagName?.toLowerCase();
      if (tag==="input"||tag==="textarea") return;
      if (e.key.toLowerCase()==="e"){e.preventDefault();goToSection("reports","reports-export");}
      if (e.key.toLowerCase()==="i"){e.preventDefault();goToSection("reports","reports-export");}
      if (e.shiftKey&&e.key.toLowerCase()==="r"){e.preventDefault();goToSection("config","config-reset");}
    };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[]);

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

  const showTerrainShell = currentUser != null && uiMode === "OP";
  useEffect(() => {
    if (!showTerrainShell) return;
    if (view === "dashboard") setView(OP_HOME_VIEW);
  }, [showTerrainShell, view]);
  const goOpHome = () => {
    setSelectedCase(null);
    setView(OP_HOME_VIEW);
  };
  const goNewCase = () => {
    setSelectedCase(null);
    setView("new_case");
  };

  const notify=(msg: string, type="info")=>{setNotification({msg,type});setTimeout(()=>setNotification(null),4000);};

  useEffect(() => {
    if (!authToken) return;
    if (apiUser && memberships.length) return;
    bootstrapSession(authToken);
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
  }, [apiUser, activeMembership]);

  useEffect(() => {
    async function reloadCasesForActiveMembership() {
      if (!authToken || !activeMembership) {
        setCases([]);
        return;
      }
      const headers: Record<string, string> = {};
      if (activeMembership.id) headers["x-scce-membership-id"] = activeMembership.id;
      if (activeMembership.contextType && activeMembership.contextId) {
        headers["x-scce-context-type"] = activeMembership.contextType;
        headers["x-scce-context-id"] = activeMembership.contextId;
      }
      const res = await apiRequest<unknown>("/cases", {
        token: authToken,
        method: "GET",
        headers: Object.keys(headers).length ? headers : undefined,
      });
      // Si falla, no pisamos el estado actual
      if (res.ok && Array.isArray(res.data)) {
        setCases(res.data as CaseItem[]);
      }
    }
    reloadCasesForActiveMembership();
  }, [authToken, activeMembership]);

  // Por defecto, usuario central ve "Todas las regiones" (solo al volverse central)
  useEffect(() => {
    if (isCentral && !justBecameCentralRef.current) {
      justBecameCentralRef.current = true;
      setActiveRegion("ALL");
    }
    if (!isCentral) {
      justBecameCentralRef.current = false;
      if (activeRegion === "ALL") setActiveRegion(DEFAULT_REGION);
    }
  }, [isCentral, activeRegion]);

  // Enforce: si DR tiene activeRegion fuera de su scope, corregir al primer permitido
  useEffect(() => {
    if (isCentral) return;
    const mid = effectiveMembership?.id;
    if (!mid) return;

    const scope = membershipScopes[mid];
    if (!scope || scope.regionScopeMode !== "LIST") return;

    const allowed = scope.regionScope || [];
    if (!allowed.length) return;

    if (!allowed.includes(activeRegion)) {
      setActiveRegion(allowed[0]);
      setFilterState((p) => ({ ...p, commune: "" }));
    }
  }, [isCentral, effectiveMembership?.id, membershipScopes, activeRegion]);

  useEffect(() => {
    // Para DR (no central): el filtro región debe quedar amarrado a su región efectiva
    if (!isCentral && activeRegion && activeRegion !== "ALL") {
      setFilterState((prev) => {
        // si ya está correcto, no hace nada
        if (prev.region === activeRegion) return prev;
        // al cambiar región, resetea comuna para evitar cruces inválidos
        return { ...prev, region: activeRegion, commune: "" };
      });
    }
  }, [isCentral, activeRegion]);

  function doReset(){
    const cat=buildCatalogDemo();
    const y=Math.max(new Date().getFullYear(),MIN_ELECTION_YEAR);
    clearSession();
    setAuthToken(null);
    setApiUser(null);
    setMemberships([]);
    setActiveMembershipState(null);
    setLocalCatalog(cat);
    setCases(makeSeedCases(cat));
    setAuditLog(makeSeedAudit());
    setCurrentUser(null);setView("dashboard");setSelectedCase(null);
    setCrisisMode(false);setSimCases([]);setSimReport(null);
    setSimSurvey({claridad:0,respaldo:0,submitted:false});
    setLoginForm({ email: "", password: "" });
    setLoginErr("");
    setCtxErr("");
    setElectionConfig({name:`Elecciones Generales ${y}`,date:`${y}-11-15`,year:y});
  }

  function nowLocalInput() {
    return nowLocalDatetimeInput();
  }

  function startNewCase(){
    if (!currentUser) return;
    const fixedCommune = assignedCommuneEffective || "";
    const fixedLocal = assignedLocal?.nombre ?? "";
    setNewCase({
      region: currentUser.region || (activeRegion === "ALL" ? DEFAULT_REGION : activeRegion),
      commune: fixedCommune,
      local: fixedLocal,
      origin: {
        actor: currentUser.name,
        channel: "Teams",
        detectedAt: nowLocalInput()
      },
      summary: "",
      detail: "",
      evidence: [],
      id: "",
      status: "Nuevo",
      criticality: "MEDIA"
    } as CaseItem);
    setEvalForm({continuidad:0,integridad:0,seguridad:0,exposicion:0,capacidadLocal:0});
    setBypassForm({active:false,motivo:"",cause:"",confirmed:false});
    setStep(1);setView("new_case");
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
    setAuditLog(prev=>{let log=prev;for(const c of simCases)log=appendEvent(log,"CASE_CREATED","SIM","SIMULACION",c.id,`[SIM] ${c.summary}`);return log;});
    notify("Incidentes de simulación cargados","warning");
  }

  function exportCSV(){
    if (!currentUser) return;
    const rows=[[ "ID","Región","Comuna","Local","Criticidad","Estado",UI_TEXT.labels.bypassColumn,UI_TEXT.labels.flaggedColumn,"SnapshotID","Creado","Completitud"]];
    cases.forEach(c=>rows.push([c.id,c.region,c.commune,c.local||"—",c.criticality,c.status,c.bypass?"SÍ":"No",c.bypassFlagged?UI_TEXT.states.flaggedShort:"—",c.localSnapshot?.idLocal||"—",fmtDate(c.createdAt),(c.completeness ?? 0)+"%"]));
    const csv=rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(",")).join("\n");
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
  function importJSONSelected(e: React.ChangeEvent<HTMLInputElement>){
    if (!currentUser) return;
    const file=e.target.files?.[0]??null;
    e.target.value="";
    if (!file) return;
    const MAX_BYTES=5*1024*1024; // 5 MB
    if (file.size>MAX_BYTES){
      alert(`Import JSON bloqueado: ${(file.size/(1024*1024)).toFixed(2)} MB excede el máximo de ${(MAX_BYTES/(1024*1024)).toFixed(0)} MB.`);
      return;
    }
    const reader=new FileReader();
    reader.onerror=()=>{alert("Import JSON falló: no se pudo leer el archivo.");};
    reader.onload=()=>{
      try {
        const text=typeof reader.result==="string"?reader.result:"";
        const parsed=JSON.parse(text) as unknown;
        if (!parsed||typeof parsed!=="object"||Array.isArray(parsed)){
          alert("Import JSON bloqueado: estructura inválida (se esperaba objeto raíz).");
          return;
        }
        const root=parsed as Record<string, unknown>;
        const metadata=root["metadata"];
        const casesIn=root["cases"];
        if (!metadata||typeof metadata!=="object"||Array.isArray(metadata)){
          alert("Import JSON bloqueado: 'metadata' no es un objeto válido.");
          return;
        }
        const meta=metadata as Record<string, unknown>;
        if (meta.schemaVersion!==1) importFail("Import fail-closed: metadata.schemaVersion debe ser 1.");
        if (!Array.isArray(casesIn)){
          alert("Import JSON bloqueado: 'cases' no es un array.");
          return;
        }
        if (casesIn.length>MAX_CASES){
          alert(`Import JSON bloqueado: 'cases' excede el máximo de ${MAX_CASES}.`);
          return;
        }
        const totalSize=JSON.stringify(casesIn).length;
        if (totalSize>MAX_TOTAL_PAYLOAD_BYTES) importFail(`Import fail-closed: tamaño total de payload excede máximo (${MAX_TOTAL_PAYLOAD_BYTES} bytes).`);
        const seen=new Set<string>();
        for (let i=0;i<casesIn.length;i++){
          const c=casesIn[i] as Record<string, unknown>;
          const id=assertIdStable(c?.id);
          if (seen.has(id)) importFail(`Import fail-closed: case.id duplicado "${id}".`);
          seen.add(id);
          assertStringMax(`cases[${i}].region`,c?.region,MAX_SHORT,false);
          assertStringMax(`cases[${i}].commune`,c?.commune,MAX_SHORT,false);
          assertStringMax(`cases[${i}].summary`,c?.summary,MAX_LONG,false);
          assertStringMax(`cases[${i}].local`,c?.local,MAX_MED,true);
          assertStringMax(`cases[${i}].detail`,c?.detail,MAX_LONG,true);
          assertStringMax(`cases[${i}].assignedTo`,c?.assignedTo,MAX_MED,true);
          assertStringMax(`cases[${i}].closingMotivo`,c?.closingMotivo,MAX_LONG,true);
          assertStringMax(`cases[${i}].bypassMotivo`,c?.bypassMotivo,MAX_LONG,true);
          assertStringMax(`cases[${i}].bypassActor`,c?.bypassActor,MAX_MED,true);
          assertStringMax(`cases[${i}].createdBy`,c?.createdBy,MAX_MED,true);
          if (c?.evidence!==undefined&&c?.evidence!==null){
            if (!Array.isArray(c.evidence)) importFail(`Import fail-closed: cases[${i}].evidence debe ser arreglo.`);
            if ((c.evidence as unknown[]).length>MAX_EVIDENCE_ITEMS) importFail(`Import fail-closed: cases[${i}].evidence excede máximo (${MAX_EVIDENCE_ITEMS}).`);
            for (let j=0;j<(c.evidence as unknown[]).length;j++){
              assertStringMax(`cases[${i}].evidence[${j}]`,(c.evidence as unknown[])[j],MAX_LONG,false);
            }
          }
          const orig=c?.origin as Record<string, unknown>|undefined;
          if (orig){
            assertStringMax(`cases[${i}].origin.actor`,orig.actor,MAX_MED,true);
            assertStringMax(`cases[${i}].origin.channel`,orig.channel,MAX_MED,true);
            assertStringMax(`cases[${i}].origin.detectedAt`,orig.detectedAt,MAX_SHORT,true);
            assertIsoSoft(`cases[${i}].origin.detectedAt`,orig.detectedAt,true);
          }
          const snap=c?.localSnapshot as Record<string, unknown>|undefined;
          if (snap){
            assertStringMax(`cases[${i}].localSnapshot.idLocal`,snap.idLocal,MAX_ID,true);
            assertStringMax(`cases[${i}].localSnapshot.nombre`,snap.nombre,MAX_LONG,true);
            assertStringMax(`cases[${i}].localSnapshot.region`,snap.region,MAX_SHORT,true);
            assertStringMax(`cases[${i}].localSnapshot.commune`,snap.commune,MAX_SHORT,true);
            assertStringMax(`cases[${i}].localSnapshot.snapshotAt`,snap.snapshotAt,MAX_SHORT,true);
            assertIsoSoft(`cases[${i}].localSnapshot.snapshotAt`,snap.snapshotAt,true);
          }
          const tl=assertArrayMax(`cases[${i}].timeline`,c?.timeline,MAX_TIMELINE,true);
          if (tl){ for (let j=0;j<tl.length;j++){ assertCaseEvent(`cases[${i}].timeline[${j}]`,tl[j]); assertIsoSoft(`cases[${i}].timeline[${j}].at`,(tl[j] as Record<string, unknown>).at,false); } }
          const acts=assertArrayMax(`cases[${i}].actions`,c?.actions,MAX_UNKNOWN_ARRAY,true);
          if (acts){ for (let j=0;j<acts.length;j++) assertUnknownItemKind(`cases[${i}].actions[${j}]`,acts[j]); }
          const decs=assertArrayMax(`cases[${i}].decisions`,c?.decisions,MAX_UNKNOWN_ARRAY,true);
          if (decs){ for (let j=0;j<decs.length;j++) assertUnknownItemKind(`cases[${i}].decisions[${j}]`,decs[j]); }
          const eh=assertArrayMax(`cases[${i}].evaluationHistory`,c?.evaluationHistory,MAX_UNKNOWN_ARRAY,true);
          if (eh){ for (let j=0;j<eh.length;j++) assertUnknownItemKind(`cases[${i}].evaluationHistory[${j}]`,eh[j]); }
          const insArr=assertArrayMax(`cases[${i}].instructions`,(c as Record<string, unknown>)?.instructions,MAX_TIMELINE,true);
          if (insArr){
            for (let j=0;j<insArr.length;j++){
              const ins=insArr[j] as Record<string, unknown>;
              assertStringMax(`cases[${i}].instructions[${j}].id`,ins?.id,MAX_ID,true);
              assertStringMax(`cases[${i}].instructions[${j}].caseId`,ins?.caseId,MAX_ID,true);
              assertStringMax(`cases[${i}].instructions[${j}].scope`,ins?.scope,MAX_SHORT,false);
              assertStringMax(`cases[${i}].instructions[${j}].audience`,ins?.audience,MAX_SHORT,false);
              assertStringMax(`cases[${i}].instructions[${j}].summary`,ins?.summary,MAX_LONG,false);
              assertStringMax(`cases[${i}].instructions[${j}].details`,ins?.details,MAX_LONG,true);
              assertStringMax(`cases[${i}].instructions[${j}].createdAt`,ins?.createdAt,MAX_SHORT,false);
              assertIsoSoft(`cases[${i}].instructions[${j}].createdAt`,ins?.createdAt,false);
              assertStringMax(`cases[${i}].instructions[${j}].createdBy`,ins?.createdBy,MAX_MED,false);
              assertStringMax(`cases[${i}].instructions[${j}].status`,ins?.status,MAX_SHORT,false);
              if (ins?.ackRequired!==true) importFail(`Import fail-closed: cases[${i}].instructions[${j}].ackRequired debe ser true.`);
              const acks=assertArrayMax(`cases[${i}].instructions[${j}].acks`,ins?.acks,MAX_TIMELINE,false);
              if (!acks) importFail(`Import fail-closed: cases[${i}].instructions[${j}].acks debe ser arreglo.`);
              for (let k=0;k<acks.length;k++){
                const ack=acks[k] as Record<string, unknown>;
                assertStringMax(`cases[${i}].instructions[${j}].acks[${k}].userId`,ack?.userId,MAX_MED,false);
                assertStringMax(`cases[${i}].instructions[${j}].acks[${k}].role`,ack?.role,MAX_SHORT,false);
                assertStringMax(`cases[${i}].instructions[${j}].acks[${k}].at`,ack?.at,MAX_SHORT,false);
                assertIsoSoft(`cases[${i}].instructions[${j}].acks[${k}].at`,ack?.at,false);
              }
              const ev=assertArrayMax(`cases[${i}].instructions[${j}].evidence`,ins?.evidence,MAX_EVIDENCE_ITEMS,true);
              if (ev){ for (let k=0;k<ev.length;k++){ assertStringMax(`cases[${i}].instructions[${j}].evidence[${k}]`,ev[k],MAX_LONG,false); } }
            }
          }
          assertIsoSoft(`cases[${i}].reportedAt`,c?.reportedAt,true);
          assertIsoSoft(`cases[${i}].firstActionAt`,c?.firstActionAt,true);
          assertIsoSoft(`cases[${i}].escalatedAt`,c?.escalatedAt,true);
          assertIsoSoft(`cases[${i}].mitigatedAt`,c?.mitigatedAt,true);
          assertIsoSoft(`cases[${i}].resolvedAt`,c?.resolvedAt,true);
          assertIsoSoft(`cases[${i}].closedAt`,c?.closedAt,true);
          assertIsoSoft(`cases[${i}].createdAt`,c?.createdAt,true);
          assertIsoSoft(`cases[${i}].updatedAt`,c?.updatedAt,true);
        }
        const hasExisting=Array.isArray(cases)&&cases.length>0;
        if (hasExisting){
          const ok=confirm("Vas a reemplazar los casos actuales por el contenido del JSON. ¿Continuar?");
          if (!ok){alert("Import cancelado: no se realizaron cambios.");return;}
          const typed=prompt("Escribe IMPORTAR para confirmar el reemplazo total:");
          if ((typed??"").trim()!=="IMPORTAR"){alert("Import cancelado: no se realizaron cambios.");return;}
        }
        const migrated=migrateLegacyInstructionsInCases(casesIn as CaseItem[]);
        setCases(migrated);
        setAuditLog(prev=>appendEvent(prev,"IMPORT_DONE",currentUser.id,currentUser.role,null,"Import JSON"));
        notify("JSON importado");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Import JSON bloqueado: JSON inválido (no se pudo interpretar).");
      }
    };
    reader.readAsText(file);
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

  // ─── GATE A: LOGIN ───────────────────────────────────────────────────────
  if (!authToken) {
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
            <label style={S.lbl}>Email</label>
            <input
              style={S.inp}
              value={loginForm.email}
              onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && !authBusy && doLogin()}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={S.lbl}>Contraseña</label>
            <div style={{ display: "flex", alignItems: "stretch", gap: 6 }}>
              <input
                style={{ ...S.inp, flex: 1, minWidth: 0 }}
                type={showPassword ? "text" : "password"}
                value={loginForm.password}
                onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && !authBusy && doLogin()}
              />
              <button
                type="button"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                style={{
                  ...S.inp,
                  width: 44,
                  minWidth: 44,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
                onClick={() => setShowPassword(prev => !prev)}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {(loginErr || ctxErr) && (
            <div style={{ color: themeColor("danger"), fontSize: "11px", marginBottom: 8 }}>
              {loginErr || ctxErr}
            </div>
          )}

          <button
            style={{ ...S.btn("primary"), width: "100%", padding: "8px", opacity: authBusy ? 0.7 : 1 }}
            disabled={authBusy}
            onClick={doLogin}
          >
            {authBusy ? "Ingresando..." : "Ingresar"}
          </button>
        </div>
      </div>
    );
  }

  // ─── GATE B: SELECTOR DE CONTEXTO ────────────────────────────────────────
  if (!activeMembership) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...S.card, width: 520 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>Seleccionar contexto</div>
          <div style={{ color: themeColor("muted"), fontSize: 11, marginBottom: 12 }}>
            Debes seleccionar un contexto antes de continuar.
          </div>

          {ctxErr && <div style={{ color: themeColor("danger"), fontSize: "11px", marginBottom: 8 }}>{ctxErr}</div>}

          {memberships.length === 0 ? (
            <div style={{ color: themeColor("mutedAlt"), fontSize: 11 }}>
              Cargando contextos...
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {memberships.map(m => {
                const scopeList = m.regionScopeMode === "LIST" && Array.isArray(m.regionScope) && m.regionScope.length
                  ? m.regionScope
                  : [];
                const regionLabels = scopeList.map(code => (CONFIG.regions as Record<string, { name?: string }>)[code]?.name ?? code).join(", ") || (m.regionScopeMode === "ALL" ? "Todas las regiones" : null);
                const regionText = regionLabels ? ` · ${regionLabels}` : "";
                return (
                  <button
                    key={m.id}
                    style={{ ...S.btn("dark"), justifyContent: "space-between", display: "flex", alignItems: "center" }}
                    onClick={() => {
                      setActiveMembership(m);
                      setActiveMembershipState(m);
                      setNewCase(null);
                      setAuditLog(prev =>
                        appendEvent(
                          prev,
                          "CONTEXT_SET",
                          "api",
                          "API",
                          null,
                          `Contexto ${m.contextType}/${m.contextId} (${m.role})`,
                        ),
                      );
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700 }}>
                      {m.contextType} / {m.contextId}{regionText}
                    </span>
                    <Badge style={{ ...S.badge(themeColor("blueDark")) }} size="xs">
                    {m.role}
                  </Badge>
                  </button>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: themeColor("muted"), fontSize: 10 }}>{apiUser?.email ?? ""}</span>
            <button
              style={{ ...S.btn("dark"), fontSize: "11px" }}
              onClick={() => {
                // FIX-002 (2026-03-27): limpiar uiMode de localStorage al cerrar sesión
                if (currentUser?.id) localStorage.removeItem(uiModeStorageKey(currentUser.id));
                clearSession();
                setAuthToken(null);
                setApiUser(null);
                setMemberships([]);
                setActiveMembershipState(null);
                setCurrentUser(null);
                setLoginErr("");
                setCtxErr("");
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // currentUser se rellena por useEffect desde apiUser + activeMembership
  if (!currentUser) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: 12 }}>Cargando sesión...</div>
      </div>
    );
  }

  const OpHome = ({ onNew: _onNew }: { onNew: () => void }) => {
    void _onNew;
    return (
      <div>
        <div style={{ ...S.card, marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
            Respuestas recibidas
          </div>
          <div style={{ color: themeColor("mutedAlt"), fontSize: 12 }}>
            Sin respuestas nuevas.
          </div>
        </div>
      </div>
    );
  };

  // ─── LAYOUT PRINCIPAL ─────────────────────────────────────────────────────
  return (
    showTerrainShell ? (
      <TerrainShell
        currentUser={currentUser}
        cases={visibleCases}
        selectedCaseId={selectedCase?.id ?? null}
        setSelectedCaseId={(id) => {
          const found = cases.find((x) => x.id === id) ?? null;
          setSelectedCase(found);
          setView("detail");
        }}
        onGoToDashboard={() => {
          setUiModeAndPersist("FULL");
          setView("dashboard");
          setSelectedCase(null);
        }}
        onLogout={() => {
          // FIX-002 (2026-03-27): limpiar uiMode de localStorage al cerrar sesión
          // Evita que Ctrl+F5 en nueva sesión restaure modo de sesión anterior
          if (currentUser?.id) localStorage.removeItem(uiModeStorageKey(currentUser.id));
          clearSession();
          setAuthToken(null);
          setApiUser(null);
          setMemberships([]);
          setActiveMembershipState(null);
          setCurrentUser(null);
          setLoginErr("");
          setCtxErr("");
        }}
        membershipsCount={memberships.length}
        onSwitchContext={() => {
          clearActiveMembership();
          setActiveMembershipState(null);
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
          {view === "new_case" ? (
            <NewCaseView hideBack />
          ) : view === "detail" && selectedCase ? (
            <CaseDetailView exportCaseTXT={exportCaseTXT} />
          ) : (
            <OpHome onNew={goNewCase} />
          )}
        </div>
      </TerrainShell>
    ) : (
    <div style={S.app}>
      <style>{`.tipWrap:hover .tip{display:block!important}input,select,textarea{color:var(--text-primary)!important}::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:#0f1117}::-webkit-scrollbar-thumb{background:#374151;border-radius:2px}`}</style>
      <div style={S.nav}>
        {/* Logo */}
        <span style={{fontWeight:800,color:"var(--primary)",fontSize:"15px",marginRight:2,letterSpacing:.5,flexShrink:0}}>SCCE</span>
        <span style={{color:"var(--text-muted)",fontSize:"10px",marginRight:10,flexShrink:0}}>v{APP_VERSION}</span>
        <div style={{width:1,height:20,background:"var(--border)",marginRight:8,flexShrink:0}} />
        {(["dashboard","cop","catalog","audit","reports","simulation","checklist","config"] as const).map(v=>(
          <button key={v} style={S.nBtn(view===v)} onClick={()=>setView(v)}>
            {v==="dashboard"?"Panel":v==="cop"?"🎯 Estado":v==="catalog"?"🗂 Catálogo":v==="audit"?"🔗 Auditoría":v==="reports"?"Reportes":v==="simulation"?"Simulación":v==="checklist"?"Verificación":"Configuración"}
          </button>
        ))}
        <button style={{background:"var(--primary)",color:"#fff",border:"none",padding:"6px 14px",borderRadius:"6px",cursor:"pointer",fontSize:"12px",fontWeight:700,boxShadow:"0 2px 8px rgba(59,130,246,0.35)"}} onClick={startNewCase}>+ Incidente</button>
        <div style={{marginLeft:"auto",display:"flex",gap:4,alignItems:"center",flexShrink:0}}>
          <div data-actions-menu style={{position:"relative",display:"flex",alignItems:"center"}}>
            <button type="button" onClick={()=>setActionsOpen(v=>!v)} style={{...S.nBtn(actionsOpen),fontSize:"12px"}} aria-label="Herramientas del sistema" aria-expanded={actionsOpen}>
              Herramientas ▾
            </button>
            {actionsOpen&&(
              <div style={{position:"absolute",right:0,top:"calc(100% + 8px)",minWidth:252,background:"var(--bg-surface)",border:"1px solid var(--border)",borderRadius:10,boxShadow:"0 8px 30px rgba(0,0,0,0.18)",padding:6,zIndex:9999}} role="menu">
                <div style={{fontSize:10,color:"var(--text-muted)",padding:"4px 10px 6px",fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase" as const}}>Sistema</div>
                <button type="button" role="menuitem" onClick={onExportState} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:7,border:"0",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:8}}>
                  <span>📤</span><span>Guardar estado del sistema</span>
                </button>
                <button type="button" role="menuitem" onClick={()=>importFileRef.current?.click()} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:7,border:"0",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:8}}>
                  <span>📥</span><span>Cargar estado desde archivo</span>
                </button>
                <button type="button" role="menuitem" onClick={()=>{setView("trust");setActionsOpen(false);}} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:7,border:"0",background:"transparent",cursor:"pointer",fontSize:12,fontWeight:600,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:8}}>
                  <span>🔐</span><span>Firma y verificación</span>
                </button>
                <div style={{height:1,background:"var(--border)",margin:"4px 0"}} />
                <div style={{fontSize:10,color:"var(--text-muted)",padding:"4px 10px 6px",fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase" as const}}>Exportar / Importar</div>
                <button type="button" role="menuitem" onClick={()=>goToSection("reports","reports-export")} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:7,border:"0",background:"transparent",cursor:"pointer",color:"var(--text-primary)"}}>
                  <div style={{fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:8}}><span>📦</span><span>Exportar datos (CSV/JSON)</span></div>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginTop:1,paddingLeft:22}}>Reportes → Exportar</div>
                </button>
                <button type="button" role="menuitem" onClick={()=>goToSection("reports","reports-import")} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:7,border:"0",background:"transparent",cursor:"pointer",color:"var(--text-primary)"}}>
                  <div style={{fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:8}}><span>📥</span><span>Importar datos (JSON)</span></div>
                  <div style={{fontSize:10,color:"var(--text-muted)",marginTop:1,paddingLeft:22}}>Reportes → Importar</div>
                </button>
                <div style={{height:1,background:"var(--border)",margin:"4px 0"}} />
                <button type="button" role="menuitem" onClick={()=>goToSection("config","config-reset")} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:7,border:"0",background:"transparent",cursor:"pointer",color:"var(--danger)",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>
                  <span>🧨</span><span>Reiniciar sistema (demo)</span>
                </button>
              </div>
            )}
          </div>
          <div style={{position:"relative",display:"inline-flex"}} className="tipWrap">
            <button type="button" onClick={()=>setHelpOpen(true)}
              style={{
                background:"transparent", border:"1px solid var(--border)",
                borderRadius:"6px", padding:"4px 9px", cursor:"pointer",
                fontSize:"13px", fontWeight:700, color:"var(--text-secondary)",
              }}
              aria-label="Abrir ayuda">
              ?
            </button>
            <div className="tip" style={{display:"none",position:"absolute",top:"calc(100% + 8px)",right:0,background:"#1e293b",color:"#f1f5f9",fontSize:"11px",fontWeight:500,padding:"6px 12px",borderRadius:"6px",whiteSpace:"nowrap",zIndex:99999,boxShadow:"0 4px 16px rgba(0,0,0,0.25)",pointerEvents:"none"}}>
              Ayuda del módulo actual
            </div>
          </div>
          {divergencias.length > 0 && (
          <Badge
            style={{ ...S.badge(themeColor("warning")) }}
            size="xs"
            onClick={() => setView("catalog")}
          >
            ⚡ {divergencias.length}
          </Badge>
        )}
          <div style={{ display: "flex", gap: 2, alignItems: "center", background:"var(--bg-surface-2)", borderRadius:6, padding:"2px", border:"1px solid var(--border)" }}>
            <button type="button" style={{...S.nBtn(uiMode === "OP"), padding:"3px 8px", fontSize:"11px"}} onClick={() => setUiModeAndPersist("OP")} title="Vista operativa (terreno)">Terreno</button>
            <button type="button" style={{...S.nBtn(uiMode === "FULL"), padding:"3px 8px", fontSize:"11px"}} onClick={() => setUiModeAndPersist("FULL")} title="Vista completa (central)">Central</button>
          </div>
          <span style={{fontSize:"10px",color:"var(--text-muted)",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{electionConfig.name}</span>
          {/* FASE 2: banner modo operacional */}
          {operationMode !== "NORMAL" && (
            <Badge
              style={{
                ...S.badge(operationMode === "CONTINGENCIA" ? themeColor("warning") : themeColor("danger")),
                fontWeight: 800,
                cursor: canDo("recepcionar", currentUser) ? "pointer" : "default",
              }}
              size="xs"
              onClick={() => {
                if (!canDo("recepcionar", currentUser)) return;
                const next = operationMode === "CONTINGENCIA" ? "NORMAL" : "CONTINGENCIA";
                setOperationMode(next);
              }}
              title={operationMode === "CONTINGENCIA" ? "Modo contingencia activo (SLA 50%) — click para normalizar" : "Modo degradado activo (SLA suspendido)"}
            >
              {operationMode === "CONTINGENCIA" ? "⚠️ CONTINGENCIA" : "🔴 DEGRADADO"}
            </Badge>
          )}
          {activeMembership && (
            <Badge style={{ ...S.badge(themeColor("legacyGreenDark")) }} size="xs">
              {activeMembership.contextType}/{activeMembership.contextId}
            </Badge>
          )}
          <button
            type="button"
            style={S.nBtn(false)}
            onClick={() => {
              clearActiveMembership();
              setActiveMembershipState(null);
              setNewCase(null);
              setSelectedCase(null);
              setView("dashboard");
            }}
            title="Cambiar contexto"
          >
            Cambiar contexto
          </button>
          <Badge style={S.badge(themeColor("mutedDarker"))} size="sm">
            {currentUser.name}
          </Badge>
          <Badge style={{ ...S.badge(themeColor("blueDark")) }} size="xs">
            {ROLE_LABELS[currentUser.role]}
          </Badge>
          <button
            type="button"
            data-tooltip={darkMode ? "Modo claro" : "Modo oscuro"}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "5px 8px",
              cursor: "pointer",
              fontSize: "15px",
              lineHeight: 1,
              color: "var(--text-secondary)",
            }}
            onClick={() => setDarkMode(d => !d)}
            aria-label={darkMode ? "Modo claro" : "Modo oscuro"}
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button
            style={{ ...S.btn("dark"), fontSize: "11px" }}
            onClick={() => {
              // FIX-002 (2026-03-27): limpiar uiMode de localStorage al cerrar sesión
              if (currentUser?.id) localStorage.removeItem(uiModeStorageKey(currentUser.id));
              clearSession();
              setAuthToken(null);
              setApiUser(null);
              setMemberships([]);
              setActiveMembershipState(null);
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

      <div style={{maxWidth:1200,margin:"0 auto",padding:"12px 16px"}}>
        {view==="dashboard"&&<DashboardView/>}
        {view==="cop"&&<CopView/>}
        {view==="new_case"&&<NewCaseView/>}
        {view==="detail"&&<CaseDetailView exportCaseTXT={exportCaseTXT}/>}
        {view==="catalog"&&<CatalogView/>}
        {view==="audit"&&<AuditView
          auditLog={auditLog}
          setAuditLog={setAuditLog}
          chainResult={chainResult}
          currentUser={currentUser}
          notify={notify}
        />}
        {view==="reports"&&<ReportsView
          onExportCSV={exportCSV}
          onExportJSON={exportJSON}
          onExportAuditCSV={exportAuditCSV}
          onImportJSONClick={importJSONClick}
          importJSONInputSlot={<input ref={importJsonInputRef} type="file" accept="application/json,.json" style={{display:"none"}} onChange={importJSONSelected}/>}
          importFileSlot={<input ref={importFileRef} type="file" accept="application/json" style={{display:"none"}} onChange={(e)=>{const f=e.target.files?.[0];e.currentTarget.value="";if(f)void onImportStateFile(f);}}/>}
        />}
        {view==="simulation"&&<SimulationView
          simCases={simCases}
          simReport={simReport}
          simSurvey={simSurvey}
          setSimSurvey={setSimSurvey}
          onRunSimulation={runSimulation}
          onLoadSimCases={loadSimCases}
        />}
        {view==="checklist"&&<ChecklistView/>}
        {view==="config"&&<ConfigView
          electionConfig={electionConfig}
          setElectionConfig={setElectionConfig}
          localCatalog={localCatalog}
          currentUser={currentUser}
          setAuditLog={setAuditLog}
          notify={notify}
          chainResult={chainResult}
          divergencias={divergencias}
          onReset={doReset}
        />}
        {view==="trust"&&<TrustView
          currentUser={currentUser}
          setAuditLog={setAuditLog}
          notify={notify}
          onBack={() => setView("dashboard")}
        />}
      </div>
      <HelpDrawer open={helpOpen} onClose={()=>setHelpOpen(false)} content={helpByView[view]??helpByView.dashboard} />
    </div>
  ) );
}
