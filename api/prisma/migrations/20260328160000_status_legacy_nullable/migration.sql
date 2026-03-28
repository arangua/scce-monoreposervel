-- =============================================================================
-- Corrección: statusLegacy debe ser nullable en PostgreSQL
-- =============================================================================
-- La columna statusLegacy es solo un respaldo de rollback de la Fase 0.
-- Nunca debió ser NOT NULL. Esta migración alinea BD con schema.prisma (String?).
-- =============================================================================

ALTER TABLE "Case"
  ALTER COLUMN "statusLegacy" DROP NOT NULL;

-- Backfill por si quedaron NULLs bloqueados (no debería, pero por seguridad)
-- No es necesario porque la columna acepta NULL desde ahora.
