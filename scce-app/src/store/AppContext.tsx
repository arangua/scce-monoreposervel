/**
 * SCCE — Store global de estado de la aplicación
 * R-2 Refactor — 2026-03-27
 *
 * Centraliza todo el estado que antes vivía disperso en App.tsx (35+ useState).
 * Expone un único Context + hook useAppStore para acceso desde cualquier componente.
 *
 * CAPAS:
 *   AuthState  — token, apiUser, memberships, activeMembership, currentUser (legacy)
 *   AppState   — casos, auditLog, catálogo, vista activa, filtros, UI, simulación, etc.
 *
 * REGLA: ningún componente importa useState para estado compartido.
 *        Todo acceso es a través de useAppStore().
 */

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
  type MutableRefObject,
} from "react";

import type {
  CaseItem,
  AuditLogEntry,
  LocalCatalog,
  CaseStatus,
  Criticality,
  ElectionConfig,
} from "../domain/types";
import {
  getToken,
  getActiveMembership,
  type ApiUser,
  type Membership,
} from "../domain/authSession";
import { type OperationMode } from "../domain/caseSla";
import { type PolicyUser } from "../domain/policyEngine";
import { type ViewKey } from "../helpContent";
import { buildCatalogSeed, buildCatalogDemo } from "../domain/catalog";
import { makeSeedCases, makeSeedAudit } from "../domain/seed";
import { fetchCatalogFromApi } from "../hooks/useCatalogApi";

// ─── Tipos auxiliares ────────────────────────────────────────────────────────

export type User = PolicyUser;

export type SimReport = {
  total: number;
  critica?: number;
  alta?: number;
  avgScore?: number;
  byStatus?: Partial<Record<CaseStatus, number>>;
  byCriticality?: Partial<Record<Criticality, number>>;
} | null;

export type BypassCause = "" | "system_down" | "risk_imminent" | "critical_level_3" | "other";
export type BypassFormState = {
  active: boolean;
  motivo: string;
  cause: BypassCause;
  confirmed: boolean;
};
export type Notification = { msg: string; type: string } | null;
export type UiMode = "OP" | "FULL";

export type FilterState = {
  criticality: string;
  status: string;
  commune: string;
  search: string;
  region: string;
};

export type MembershipScope = {
  regionScopeMode: "ALL" | "LIST";
  regionScope: string[];
  regionCode?: string | null;
};

const MIN_ELECTION_YEAR = 2026;

// ── Persistencia de catálogo en localStorage ───────────────────────────
// La clave incluye el membershipId para aislar catálogos por DR.
// Mientras no hay backend, esto garantiza que cada equipo regional
// conserva su propio catálogo entre sesiones del mismo navegador.

const CATALOG_KEY_PREFIX = "SCCE_CATALOG_V1_";

function catalogKey(membershipId: string | null | undefined): string {
  return CATALOG_KEY_PREFIX + (membershipId ?? "DEMO");
}

function saveCatalog(catalog: LocalCatalog, membershipId: string | null | undefined): void {
  try {
    localStorage.setItem(catalogKey(membershipId), JSON.stringify(catalog));
  } catch {
    // localStorage lleno o no disponible — ignorar silenciosamente
  }
}

function loadCatalog(membershipId: string | null | undefined): LocalCatalog | null {
  try {
    const raw = localStorage.getItem(catalogKey(membershipId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalCatalog;
    // Validación mínima: debe ser un array
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function defaultElectionConfig(): ElectionConfig {
  const year = Math.max(new Date().getFullYear(), MIN_ELECTION_YEAR);
  return { name: `Elecciones Generales ${year}`, date: `${year}-11-15`, year };
}

// ─── Shape del store ─────────────────────────────────────────────────────────

export interface AppStore {
  // ── Auth ──────────────────────────────────────────────────────────────────
  authToken: string | null;
  setAuthToken: Dispatch<SetStateAction<string | null>>;

  apiUser: ApiUser | null;
  setApiUser: Dispatch<SetStateAction<ApiUser | null>>;

  memberships: Membership[];
  setMemberships: Dispatch<SetStateAction<Membership[]>>;

  activeMembership: Membership | null;
  setActiveMembershipState: Dispatch<SetStateAction<Membership | null>>;

  /** Usuario del policy engine (legacy, coexiste con apiUser). */
  currentUser: User | null;
  setCurrentUser: Dispatch<SetStateAction<User | null>>;

  membershipScopes: Record<string, MembershipScope>;
  setMembershipScopes: Dispatch<SetStateAction<Record<string, MembershipScope>>>;

  justBecameCentralRef: MutableRefObject<boolean>;

  // ── Casos y auditoría ─────────────────────────────────────────────────────
  cases: CaseItem[];
  setCases: Dispatch<SetStateAction<CaseItem[]>>;

  auditLog: AuditLogEntry[];
  setAuditLog: Dispatch<SetStateAction<AuditLogEntry[]>>;

  selectedCase: CaseItem | null;
  setSelectedCase: Dispatch<SetStateAction<CaseItem | null>>;

  // ── Catálogo ──────────────────────────────────────────────────────────────
  localCatalog: LocalCatalog;
  setLocalCatalog: Dispatch<SetStateAction<LocalCatalog>>;

  // ── Configuración electoral ───────────────────────────────────────────────
  electionConfig: ElectionConfig;
  setElectionConfig: Dispatch<SetStateAction<ElectionConfig>>;

  // ── Región activa ─────────────────────────────────────────────────────────
  activeRegion: string;
  setActiveRegion: Dispatch<SetStateAction<string>>;

  // ── Navegación ────────────────────────────────────────────────────────────
  view: ViewKey;
  setView: Dispatch<SetStateAction<ViewKey>>;

  // ── UI ────────────────────────────────────────────────────────────────────
  uiMode: UiMode;
  setUiMode: Dispatch<SetStateAction<UiMode>>;

  crisisMode: boolean;
  setCrisisMode: Dispatch<SetStateAction<boolean>>;

  filterState: FilterState;
  setFilterState: Dispatch<SetStateAction<FilterState>>;

  notification: Notification;
  setNotification: Dispatch<SetStateAction<Notification>>;

  helpOpen: boolean;
  setHelpOpen: Dispatch<SetStateAction<boolean>>;

  actionsOpen: boolean;
  setActionsOpen: Dispatch<SetStateAction<boolean>>;

  busyAction: Record<string, boolean>;
  setBusyAction: Dispatch<SetStateAction<Record<string, boolean>>>;

  // ── Formulario nuevo caso ─────────────────────────────────────────────────
  newCase: CaseItem | null;
  setNewCase: Dispatch<SetStateAction<CaseItem | null>>;

  evalForm: {
    continuidad: number;
    integridad: number;
    seguridad: number;
    exposicion: number;
    capacidadLocal: number;
  };
  setEvalForm: Dispatch<
    SetStateAction<{
      continuidad: number;
      integridad: number;
      seguridad: number;
      exposicion: number;
      capacidadLocal: number;
    }>
  >;

  bypassForm: BypassFormState;
  setBypassForm: Dispatch<SetStateAction<BypassFormState>>;

  step: number;
  setStep: Dispatch<SetStateAction<number>>;

  // ── Autenticación UI ──────────────────────────────────────────────────────
  loginForm: { email: string; password: string };
  setLoginForm: Dispatch<SetStateAction<{ email: string; password: string }>>;

  showPassword: boolean;
  setShowPassword: Dispatch<SetStateAction<boolean>>;

  loginErr: string;
  setLoginErr: Dispatch<SetStateAction<string>>;

  ctxErr: string;
  setCtxErr: Dispatch<SetStateAction<string>>;

  authBusy: boolean;
  setAuthBusy: Dispatch<SetStateAction<boolean>>;

  // ── Tema visual
  darkMode: boolean;
  setDarkMode: Dispatch<SetStateAction<boolean>>;

  // ── Modo operacional (FASE 2)
  operationMode: OperationMode;
  setOperationMode: Dispatch<SetStateAction<OperationMode>>;

  // ── Simulación ────────────────────────────────────────────────────────────
  simCases: CaseItem[];
  setSimCases: Dispatch<SetStateAction<CaseItem[]>>;

  simReport: SimReport;
  setSimReport: Dispatch<SetStateAction<SimReport>>;

  simSurvey: { claridad: number; respaldo: number; submitted: boolean };
  setSimSurvey: Dispatch<
    SetStateAction<{ claridad: number; respaldo: number; submitted: boolean }>
  >;

  // ── Refs para inputs de archivo ───────────────────────────────────────────
  importJsonInputRef: MutableRefObject<HTMLInputElement | null>;
  importFileRef: MutableRefObject<HTMLInputElement | null>;
}

// ─── Contexto ────────────────────────────────────────────────────────────────

const AppContext = createContext<AppStore | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  // Auth
  const [authToken, setAuthToken] = useState<string | null>(() => getToken());
  const [apiUser, setApiUser] = useState<ApiUser | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeMembership, setActiveMembershipState] = useState<Membership | null>(
    () => getActiveMembership()
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [membershipScopes, setMembershipScopes] = useState<Record<string, MembershipScope>>({});
  const justBecameCentralRef = useRef(false);

  // Casos y auditoría
  // FIX-001 (2026-03-27): Si hay token activo en sesión, inicializar vacío.
  // Los casos reales se cargan desde la API en App.tsx (useEffect [authToken, activeMembership]).
  // El seed solo aplica en modo demo (sin token), para que la demo funcione offline.
  const [cases, setCases] = useState<CaseItem[]>(() => {
    if (getToken()) return [];
    const cat = buildCatalogDemo();
    return makeSeedCases(cat);
  });
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => makeSeedAudit());
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);

  // Catálogo — carga desde localStorage si existe, si no usa demo
  // La clave DEMO se usa hasta que el usuario se autentica (ver useEffect más abajo)
  const activeMembershipId = getActiveMembership()?.id ?? null;
  const [localCatalog, setLocalCatalog] = useState<LocalCatalog>(() => {
    const saved = loadCatalog(activeMembershipId);
    if (saved && saved.length > 0) return saved;
    return buildCatalogDemo();
  });

  // Configuración electoral
  const [electionConfig, setElectionConfig] = useState<ElectionConfig>(defaultElectionConfig);

  // Región activa — código CUT oficial Tarapacá
  const [activeRegion, setActiveRegion] = useState("01");

  // Navegación
  const [view, setView] = useState<ViewKey>("dashboard");

  // UI
  const [uiMode, setUiMode] = useState<UiMode>("FULL");
  const [crisisMode, setCrisisMode] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({
    criticality: "",
    status: "",
    commune: "",
    search: "",
    region: "",
  });
  const [notification, setNotification] = useState<Notification>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<Record<string, boolean>>({});

  // Formulario nuevo caso
  const [newCase, setNewCase] = useState<CaseItem | null>(null);
  const [evalForm, setEvalForm] = useState({
    continuidad: 0,
    integridad: 0,
    seguridad: 0,
    exposicion: 0,
    capacidadLocal: 0,
  });
  const [bypassForm, setBypassForm] = useState<BypassFormState>({
    active: false,
    motivo: "",
    cause: "",
    confirmed: false,
  });
  const [step, setStep] = useState(1);

  // Autenticación UI
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loginErr, setLoginErr] = useState("");
  const [ctxErr, setCtxErr] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  // ── Persistencia de catálogo: API primero, localStorage como fallback ────────
  //
  // Cuando el membership cambia (login), intenta cargar desde la API.
  // Si no hay sesión activa o la API falla, cae a localStorage (piloto offline).
  // El localStorage sigue actualizándose como cache local.
  useEffect(() => {
    if (!activeMembership?.id) return;

    async function cargarCatalogo() {
      // 1. Intentar API
      const apiCatalog = await fetchCatalogFromApi();
      if (apiCatalog !== null) {
        // API respondió — usar como fuente de verdad
        setLocalCatalog(apiCatalog);
        // Actualizar localStorage como cache
        saveCatalog(apiCatalog, activeMembership?.id);
        return;
      }
      // 2. Fallback: localStorage
      const saved = loadCatalog(activeMembership?.id);
      if (saved && saved.length > 0) {
        setLocalCatalog(saved);
      }
      // 3. Si no hay nada guardado, mantener el demo actual
    }

    void cargarCatalogo();
  }, [activeMembership?.id]);

  // Cache local: guarda en localStorage cada vez que el catálogo cambia
  // (cubre tanto el caso online como offline)
  useEffect(() => {
    saveCatalog(localCatalog, activeMembership?.id ?? activeMembershipId);
  }, [localCatalog, activeMembership]);

  // Tema visual (persiste en localStorage)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("SCCE_DARK_MODE") === "true";
  });

  // Modo operacional (FASE 2)
  const [operationMode, setOperationMode] = useState<OperationMode>("NORMAL");

  // Simulación
  const [simCases, setSimCases] = useState<CaseItem[]>([]);
  const [simReport, setSimReport] = useState<SimReport>(null);
  const [simSurvey, setSimSurvey] = useState({ claridad: 0, respaldo: 0, submitted: false });

  // Refs para inputs de archivo
  const importJsonInputRef = useRef<HTMLInputElement | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const store: AppStore = {
    // Auth
    authToken, setAuthToken,
    apiUser, setApiUser,
    memberships, setMemberships,
    activeMembership, setActiveMembershipState,
    currentUser, setCurrentUser,
    membershipScopes, setMembershipScopes,
    justBecameCentralRef,
    // Casos
    cases, setCases,
    auditLog, setAuditLog,
    selectedCase, setSelectedCase,
    // Catálogo
    localCatalog, setLocalCatalog,
    // Config electoral
    electionConfig, setElectionConfig,
    // Región
    activeRegion, setActiveRegion,
    // Navegación
    view, setView,
    // UI
    uiMode, setUiMode,
    crisisMode, setCrisisMode,
    filterState, setFilterState,
    notification, setNotification,
    helpOpen, setHelpOpen,
    actionsOpen, setActionsOpen,
    busyAction, setBusyAction,
    // Nuevo caso
    newCase, setNewCase,
    evalForm, setEvalForm,
    bypassForm, setBypassForm,
    step, setStep,
    // Auth UI
    loginForm, setLoginForm,
    showPassword, setShowPassword,
    loginErr, setLoginErr,
    ctxErr, setCtxErr,
    authBusy, setAuthBusy,
    // Tema visual
    darkMode, setDarkMode,
    // Modo operacional
    operationMode, setOperationMode,
    // Simulación
    simCases, setSimCases,
    simReport, setSimReport,
    simSurvey, setSimSurvey,
    // Refs
    importJsonInputRef,
    importFileRef,
  };

  return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}

// ─── Hook de acceso ──────────────────────────────────────────────────────────

export function useAppStore(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useAppStore debe usarse dentro de <AppProvider>");
  }
  return ctx;
}
