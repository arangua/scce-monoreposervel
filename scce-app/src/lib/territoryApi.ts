/**
 * Cliente mínimo de lectura territorial (regiones, provincias, comunas).
 * Consume GET /territory/* sin tocar aún NewCaseForm.
 */

import { API_BASE_URL } from "../config/runtime";

export type TerritoryRegion = { code: string; name: string };
export type TerritoryProvince = { code: string; name: string; regionCode: string };
export type TerritoryCommune = { code: string; name: string; provinceCode: string; regionCode: string };

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Territory API: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function getRegions(): Promise<TerritoryRegion[]> {
  return getJson<TerritoryRegion[]>("/territory/regions");
}

export function getProvinces(regionCode: string): Promise<TerritoryProvince[]> {
  return getJson<TerritoryProvince[]>(`/territory/regions/${encodeURIComponent(regionCode)}/provinces`);
}

export function getCommunes(provinceCode: string): Promise<TerritoryCommune[]> {
  return getJson<TerritoryCommune[]>(`/territory/provinces/${encodeURIComponent(provinceCode)}/communes`);
}
