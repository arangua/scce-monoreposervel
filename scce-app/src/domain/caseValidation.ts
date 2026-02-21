// src/domain/caseValidation.ts
import type { CommuneCode, LocalCatalog, RegionCode } from "./types";
import { findActiveLocal } from "./catalog";

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
    if (!findActiveLocal(catalog, (c.region ?? "") as RegionCode, (c.commune ?? "") as CommuneCode, c.local ?? ""))
      e.push(`Local "${c.local}" no está activo en el catálogo.`);
  }
  return e;
}
