/**
 * Adaptador de compatibilidad: convierte datos territoriales reales (región → provincia → comuna)
 * a la forma que NewCaseForm espera hoy: regionCode → { name, communes: { communeCode → { name } } }.
 * Todas las comunas de una región se aplanan en un solo objeto (sin nivel provincia en la salida).
 */

import type { TerritoryRegion, TerritoryCommune } from "./territoryApi";

export type RegionsMapCompatible = Record<
  string,
  { name: string; communes: Record<string, { name: string }> }
>;

/**
 * Construye un regionsMap compatible con NewCaseForm a partir de regiones y comunas.
 * Cada región queda con su nombre y un objeto plano de todas sus comunas (código → nombre).
 *
 * @param regions - Lista de regiones (código CUT + nombre).
 * @param communes - Lista de comunas (de una o varias regiones); se agrupan por regionCode.
 */
export function territoryToRegionsMap(
  regions: TerritoryRegion[],
  communes: TerritoryCommune[]
): RegionsMapCompatible {
  const map: RegionsMapCompatible = {};

  for (const r of regions) {
    map[r.code] = { name: r.name, communes: {} };
  }

  for (const c of communes) {
    const region = map[c.regionCode];
    if (region) {
      region.communes[c.code] = { name: c.name };
    }
  }

  return map;
}
