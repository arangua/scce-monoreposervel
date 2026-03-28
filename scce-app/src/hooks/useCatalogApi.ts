/**
 * hooks/useCatalogApi.ts
 * Operaciones del catálogo de locales contra la API backend.
 *
 * Patrón idéntico a useCases.ts:
 *  - Llama a la API si hay token + membership activo
 *  - Si no hay sesión (demo offline), retorna null y el llamador
 *    mantiene el comportamiento anterior (localStorage)
 *
 * Endpoints consumidos:
 *  GET  /catalog              → lista locales del contexto
 *  POST /catalog/import       → importa lote (reemplaza por modo)
 *  PATCH /catalog/:id/deactivate
 *  PATCH /catalog/:id/reactivate
 *  PATCH /catalog/:id/toggle-eleccion
 */
import { apiRequest } from "../domain/apiClient";
import { getToken, getActiveMembership } from "../domain/authSession";
import type { LocalCatalog, LocalCatalogEntry } from "../domain/types";

// ── Tipo que devuelve la API (campos de VotingLocal en Prisma) ────────────────
type ApiVotingLocal = {
  id: string;
  regionCode: string;
  communeCode: string;
  nombre: string;
  direccion: string | null;
  mesas: number | null;
  activoGlobal: boolean;
  activoEnEleccionActual: boolean;
  origenSeed: boolean;
  fechaCreacion: string;
  fechaDesactivacion: string | null;
};

// ── Helper: headers de contexto ───────────────────────────────────────────────
function ctxHeaders(): Record<string, string> {
  const m = getActiveMembership();
  if (!m) return {};
  const h: Record<string, string> = {};
  if (m.id)          h["x-scce-membership-id"]  = m.id;
  if (m.contextType) h["x-scce-context-type"]   = m.contextType;
  if (m.contextId)   h["x-scce-context-id"]     = m.contextId;
  return h;
}

// ── Mapeo API → LocalCatalogEntry ─────────────────────────────────────────────
function toEntry(l: ApiVotingLocal): LocalCatalogEntry {
  return {
    idLocal:                l.id,
    nombre:                 l.nombre,
    region:                 l.regionCode,
    commune:                l.communeCode,
    activoGlobal:           l.activoGlobal,
    activoEnEleccionActual: l.activoEnEleccionActual,
    fechaCreacion:          l.fechaCreacion,
    fechaDesactivacion:     l.fechaDesactivacion ?? null,
    origenSeed:             l.origenSeed,
  };
}

// ── fetchCatalogFromApi ───────────────────────────────────────────────────────
/**
 * Descarga todos los locales del contexto activo desde la API.
 * Retorna null si no hay sesión o si la llamada falla.
 */
export async function fetchCatalogFromApi(): Promise<LocalCatalog | null> {
  const token = getToken();
  if (!token || !getActiveMembership()) return null;

  const res = await apiRequest<ApiVotingLocal[]>("/catalog", {
    token,
    headers: ctxHeaders(),
  });

  if (!res.ok) {
    console.warn("[SCCE][catalog] fetchCatalogFromApi error:", res.error);
    return null;
  }

  return res.data.map(toEntry);
}

// ── importCatalogToApi ────────────────────────────────────────────────────────
/**
 * Envía un lote de locales a la API para persistirlos.
 * Reemplaza los del modo indicado (eleccion | simulacion).
 * Retorna { importados } o null si falla.
 */
export async function importCatalogToApi(
  items: Array<{
    regionCode: string;
    communeCode: string;
    nombre: string;
    direccion?: string;
    mesas?: number;
  }>,
  modo: "eleccion" | "simulacion"
): Promise<{ importados: number } | null> {
  const token = getToken();
  if (!token || !getActiveMembership()) return null;

  const res = await apiRequest<{ importados: number; modo: string }>("/catalog/import", {
    token,
    method: "POST",
    body: { modo, items },
    headers: ctxHeaders(),
  });

  if (!res.ok) {
    console.warn("[SCCE][catalog] importCatalogToApi error:", res.error);
    return null;
  }

  return { importados: res.data.importados };
}

// ── deactivateLocalApi ────────────────────────────────────────────────────────
export async function deactivateLocalApi(id: string): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  const res = await apiRequest(`/catalog/${id}/deactivate`, {
    token, method: "PATCH", headers: ctxHeaders(),
  });
  return res.ok;
}

// ── reactivateLocalApi ────────────────────────────────────────────────────────
export async function reactivateLocalApi(id: string): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  const res = await apiRequest(`/catalog/${id}/reactivate`, {
    token, method: "PATCH", headers: ctxHeaders(),
  });
  return res.ok;
}

// ── toggleEleccionApi ─────────────────────────────────────────────────────────
export async function toggleEleccionApi(id: string): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  const res = await apiRequest(`/catalog/${id}/toggle-eleccion`, {
    token, method: "PATCH", headers: ctxHeaders(),
  });
  return res.ok;
}
