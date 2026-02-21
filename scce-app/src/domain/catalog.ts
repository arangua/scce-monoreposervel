// src/domain/catalog.ts
import type { CommuneCode, LocalCatalog, LocalCatalogEntry, RegionCode } from "./types";

export function findActiveLocal(
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
