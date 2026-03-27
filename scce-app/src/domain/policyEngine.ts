/**
 * policyEngine.ts
 * Motor de políticas RBAC para SCCE.
 * Extraído de App.tsx — R-1 refactor 2026-03-27.
 * Funciones puras, sin estado, sin efectos secundarios.
 */

// ─── Usuarios seed (modo demo / simulación) ───────────────────────────────────
export const USERS = [
  { id: "u1", name: "PESE Local",                  username: "pese1",         password: "demo", role: "PESE",               region: "TRP", commune: "IQQ" },
  { id: "u2", name: "Delegado Junta Electoral",     username: "delegado1",     password: "demo", role: "DELEGADO_JE",        region: "TRP", commune: "IQQ" },
  { id: "u3", name: "Funcionario DR Eventual",      username: "dr_eventual",   password: "demo", role: "DR_EVENTUAL",        region: "TRP" },
  { id: "u4", name: "Funcionario Registro SCCE",    username: "registro",      password: "demo", role: "REGISTRO_SCCE",      region: "TRP" },
  { id: "u5", name: "Funcionario Jefe Operaciones", username: "jefe_ops",      password: "demo", role: "JEFE_OPS",           region: "TRP" },
  { id: "u6", name: "Funcionario Encargado Gasto",  username: "gasto",         password: "demo", role: "ENCARGADO_GASTO",    region: "TRP" },
  { id: "u7", name: "Director Regional",            username: "director",      password: "demo", role: "DIRECTOR_REGIONAL",  region: "TRP" },
  { id: "u8", name: "Usuario Nivel Central",        username: "nivel_central", password: "demo", role: "NIVEL_CENTRAL",      region: null },
] as const;

// ─── Etiquetas de rol ─────────────────────────────────────────────────────────
export const ROLE_LABELS = {
  PESE:               "PESE",
  DELEGADO_JE:        "Delegado JE",
  DR_EVENTUAL:        "DR Eventual",
  REGISTRO_SCCE:      "Registro SCCE",
  JEFE_OPS:           "Jefe Ops",
  ENCARGADO_GASTO:    "Encargado Gasto",
  DIRECTOR_REGIONAL:  "Director Regional",
  NIVEL_CENTRAL:      "Nivel Central",
  ADMIN_PILOTO:       "Admin Piloto",
  DR:                 "DR",
  EQUIPO_REGIONAL:    "Equipo Regional",
  NIVEL_CENTRAL_SIM:  "Nivel Central Sim",
} as const;

// ─── Políticas por rol ────────────────────────────────────────────────────────
export const POLICIES = {
  PESE:              { create: true,  update: false, assign: false, close: false, bypass: false, viewAll: false, comment: true,  instruct: false, recepcionar: false, export: false, validateBypass: false, manageCatalog: false },
  DELEGADO_JE:       { create: true,  update: false, assign: false, close: false, bypass: false, viewAll: false, comment: true,  instruct: false, recepcionar: false, export: false, validateBypass: false, manageCatalog: false },
  DR_EVENTUAL:       { create: true,  update: true,  assign: false, close: false, bypass: false, viewAll: false, comment: true,  instruct: false, recepcionar: false, export: false, validateBypass: false, manageCatalog: false },
  REGISTRO_SCCE:     { create: true,  update: true,  assign: true,  close: false, bypass: true,  viewAll: true,  comment: true,  instruct: false, recepcionar: true,  export: true,  validateBypass: false, manageCatalog: false },
  JEFE_OPS:          { create: false, update: true,  assign: true,  close: false, bypass: false, viewAll: true,  comment: true,  instruct: false, recepcionar: false, export: true,  validateBypass: false, manageCatalog: false },
  ENCARGADO_GASTO:   { create: false, update: false, assign: false, close: false, bypass: false, viewAll: true,  comment: true,  instruct: false, recepcionar: false, export: false, validateBypass: false, manageCatalog: false },
  DIRECTOR_REGIONAL: { create: true,  update: true,  assign: true,  close: true,  bypass: true,  viewAll: true,  comment: true,  instruct: false, recepcionar: true,  export: true,  validateBypass: true,  manageCatalog: false },
  NIVEL_CENTRAL:     { create: false, update: false, assign: false, close: false, bypass: false, viewAll: true,  comment: true,  instruct: true,  recepcionar: false, export: true,  validateBypass: false, manageCatalog: true  },
  ADMIN_PILOTO:      { create: true,  update: true,  assign: true,  close: true,  bypass: true,  viewAll: true,  comment: true,  instruct: false, recepcionar: true,  export: true,  validateBypass: true,  manageCatalog: false },
  DR:                { create: true,  update: true,  assign: true,  close: false, bypass: true,  viewAll: true,  comment: true,  instruct: false, recepcionar: true,  export: true,  validateBypass: false, manageCatalog: false },
  EQUIPO_REGIONAL:   { create: true,  update: true,  assign: false, close: false, bypass: false, viewAll: true,  comment: true,  instruct: false, recepcionar: false, export: true,  validateBypass: false, manageCatalog: false },
  NIVEL_CENTRAL_SIM: { create: false, update: false, assign: false, close: false, bypass: false, viewAll: true,  comment: true,  instruct: true,  recepcionar: false, export: true,  validateBypass: false, manageCatalog: true  },
} as const;

export type Role = keyof typeof POLICIES;
export type PolicyAction = keyof (typeof POLICIES)[Role];

export type PolicyUser = {
  id: string;
  name: string;
  role: Role;
  region?: string | null;
  username?: string;
  password?: string;
  commune?: string;
  assignedLocalId?: string | null;
};

export type PolicyCase = {
  region?: string | null;
  [key: string]: unknown;
};

// ─── Funciones ────────────────────────────────────────────────────────────────

/**
 * Detecta si el userId corresponde a un usuario de Nivel Central
 * en la lista de usuarios seed.
 */
export function isNivelCentral(userId: string): boolean {
  const u = USERS.find((x) => x.id === userId);
  return (u as { role?: string } | undefined)?.role === "NIVEL_CENTRAL";
}

/**
 * Verifica si un usuario puede ejecutar una acción sobre un caso.
 * Respeta restricciones de región para roles no-centrales.
 */
export function canDo(
  action: PolicyAction,
  user: PolicyUser | null,
  caseObj?: PolicyCase | null
): boolean {
  if (!user) return false;
  const p = POLICIES[user.role];
  if (!p || !(p as Record<string, boolean>)[action]) return false;
  if (caseObj && user.role !== "NIVEL_CENTRAL") {
    if (caseObj.region && user.region && caseObj.region !== user.region) return false;
  }
  return true;
}
