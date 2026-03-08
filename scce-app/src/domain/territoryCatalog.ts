// src/domain/territoryCatalog.ts
// Mapeo CUT → código interno de comuna solo para lógica de catálogo/locales (por región).
// Un solo criterio compartido entre validación de caso y formulario nuevo.

/** CUT comuna → código interno solo para lógica de catálogo/locales (por región). Extensible. */
export const CUT_TO_INTERNAL_COMMUNE_BY_REGION: Record<string, Record<string, string>> = {
  TRP: { "1101": "IQQ", "1107": "ALH", "1401": "PCA", "1402": "CAM", "1403": "COL", "1404": "HUA", "1405": "PIC" },
};

export function getInternalCommuneForCatalog(regionInternal: string, communeForm: string): string {
  if (!communeForm) return communeForm;
  const mapped = CUT_TO_INTERNAL_COMMUNE_BY_REGION[regionInternal]?.[communeForm];
  return mapped ?? communeForm;
}

/** Forma del mapa región → { name, communes: { código → { name } } } usada en vistas y export. */
export type RegionsMapForDisplay = Record<string, { name?: string; communes?: Record<string, { name?: string }> }>;

/**
 * Resuelve el nombre amigable de comuna para mostrar en UI/export.
 * Acepta comuna en código interno (IQQ) o CUT (1101): intenta búsqueda directa y,
 * si falla, convierte CUT → interno y vuelve a buscar.
 */
export function getCommuneDisplayName(
  regionsMap: RegionsMapForDisplay,
  regionInternal: string,
  communeValue: string
): string {
  const directName = regionsMap[regionInternal]?.communes?.[communeValue]?.name;
  if (directName) return directName;

  const internalCommune = getInternalCommuneForCatalog(regionInternal, communeValue);
  const mappedName = regionsMap[regionInternal]?.communes?.[internalCommune]?.name;
  if (mappedName) return mappedName;

  return communeValue || "—";
}
