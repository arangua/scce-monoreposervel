// src/domain/caseValidation.ts
import { findActiveLocal } from "./catalog";
import type { CommuneCode, LocalCatalog, RegionCode } from "./types";

function hasTextCode(v: string) {
  return v.length > 0;
}

function isRegionCode(v: string): v is RegionCode {
  return hasTextCode(v);
}

function isCommuneCode(v: string): v is CommuneCode {
  return hasTextCode(v);
}

export function validateCaseSchema(
  c: { summary?: string; commune?: string; region?: string; local?: string; origin?: { detectedAt?: string } },
  catalog: LocalCatalog = []
): string[] {
  const e: string[] = [];
  if (!c.summary?.trim()) e.push("Resumen obligatorio.");
  if (!c.commune) e.push("Comuna obligatoria.");
  if (!c.region) e.push("Región obligatoria.");
  if (!c.local?.trim()) e.push("Local de votación obligatorio.");
  if (!c.origin?.detectedAt) e.push("Hora de detección obligatoria.");
  if (c.local?.trim() && catalog.length > 0) {
    const region = c.region ?? "";
    const commune = c.commune ?? "";
    if (
      isRegionCode(region) &&
      isCommuneCode(commune) &&
      !findActiveLocal(catalog, region, commune, c.local)
    ) {
      e.push(`Local "${c.local}" no está activo en el catálogo.`);
    }
  }
  return e;
}
