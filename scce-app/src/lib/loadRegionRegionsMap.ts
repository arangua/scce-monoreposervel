/**
 * Helper: dado un regionCode CUT, carga todas sus provincias y todas sus comunas
 * y devuelve un regionsMap compatible con NewCaseForm (solo esa región con comunas pobladas).
 */

import { getRegions, getProvinces, getCommunes } from "./territoryApi";
import { territoryToRegionsMap, type RegionsMapCompatible } from "./territoryToRegionsMap";

/**
 * Carga región + provincias + comunas de esa región y devuelve el regionsMap compatible.
 * Todas las regiones tendrán nombre (desde getRegions); solo la región indicada tendrá comunas.
 *
 * @param regionCode - Código CUT de la región (ej. "01", "13").
 */
export async function loadRegionRegionsMap(regionCode: string): Promise<RegionsMapCompatible> {
  const [regions, provinces] = await Promise.all([
    getRegions(),
    getProvinces(regionCode),
  ]);

  const communePromises = provinces.map((p) => getCommunes(p.code));
  const communeArrays = await Promise.all(communePromises);
  const allCommunes = communeArrays.flat();

  return territoryToRegionsMap(regions, allCommunes);
}
