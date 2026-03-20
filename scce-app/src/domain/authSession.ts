// scce-app/src/domain/authSession.ts
const K_TOKEN = "scce.token";
const K_ACTIVE_MEMBERSHIP = "scce.activeMembership";

export type ApiUser = {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
};

export type Membership = {
  id: string;
  userId: string;
  contextType: "OPERACION" | "SIMULACION";
  contextId: string; // ej "GLOBAL" o id simulación
  regionCode?: string;
  role: "ADMIN_PILOTO" | "DR" | "EQUIPO_REGIONAL" | "NIVEL_CENTRAL_SIM";
  regionScopeMode?: "ALL" | "LIST";
  regionScope?: string[];
  createdAt: string;
};

export function getToken(): string | null {
  return sessionStorage.getItem(K_TOKEN);
}
export function setToken(token: string) {
  sessionStorage.setItem(K_TOKEN, token);
}
export function clearToken() {
  sessionStorage.removeItem(K_TOKEN);
}

export function setActiveMembership(m: Membership) {
  sessionStorage.setItem(K_ACTIVE_MEMBERSHIP, JSON.stringify(m));
}
export function clearActiveMembership() {
  sessionStorage.removeItem(K_ACTIVE_MEMBERSHIP);
}

export function clearSession() {
  clearToken();
  clearActiveMembership();
}

/**
 * Criterio "nivel central" para UI (selector Todas las regiones, sin filtro por región).
 * Centralidad depende del MEMBERSHIP activo, no del user global.
 */
export function isCentralFromContext(
  m?: {
    contextType?: "OPERACION" | "SIMULACION" | null;
    contextId?: string | null;
    regionCode?: string | null;
    regionScopeMode?: "ALL" | "LIST";
    role?: string | null;
  } | null,
  _userRole?: string | null
): boolean {
  void _userRole;
  if (!m) return false;

  if (m.contextType === "OPERACION") {
    if (m.regionScopeMode === "LIST") return false;
    if (m.regionCode === "ADM") return true;
    if (m.role === "ADM" || m.role === "ADMIN" || m.role === "ADMIN_PILOTO") return true;
    return false;
  }

  if (m.contextType === "SIMULACION") {
    if (m.regionScopeMode === "LIST") return false;
    if (m.regionScopeMode === "ALL") return true;
    if (m.regionCode === "ADM") return true;
    if (
      m.role === "ADM" ||
      m.role === "ADMIN" ||
      m.role === "ADMIN_PILOTO" ||
      m.role === "NIVEL_CENTRAL_SIM"
    ) {
      return true;
    }
    return false;
  }

  if (m.regionScopeMode === "LIST") return false;
  if (m.regionCode === "ADM") return true;
  if (m.role === "ADM" || m.role === "ADMIN" || m.role === "ADMIN_PILOTO") return true;

  return false;
}

