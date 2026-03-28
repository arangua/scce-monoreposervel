-- =============================================================================
-- FASE 2 — Modo operacional + SLA breach tracking
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 1: Enum OperationMode
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OperationMode') THEN
    CREATE TYPE "OperationMode" AS ENUM (
      'NORMAL',       -- Jornada electoral estándar
      'CONTINGENCIA', -- Incidente de alta criticidad activo (SLA reducido 50%)
      'DEGRADADO'     -- Pérdida parcial de comunicaciones (SLA suspendido)
    );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PASO 2: Tabla SystemConfig (clave/valor para configuración global)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SystemConfig" (
  "key"       TEXT NOT NULL PRIMARY KEY,
  "value"     TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedBy" TEXT
);

-- Insertar modo operacional por defecto
INSERT INTO "SystemConfig" ("key", "value", "updatedAt")
VALUES ('operationMode', 'NORMAL', NOW())
ON CONFLICT ("key") DO NOTHING;

-- -----------------------------------------------------------------------------
-- PASO 3: Agregar slaBreachAt a Case (timestamp cuando se supera el SLA)
-- -----------------------------------------------------------------------------
ALTER TABLE "Case"
  ADD COLUMN IF NOT EXISTS "slaBreachAt" TIMESTAMP(3);

-- Índice para queries de dashboard (casos con SLA vencido)
CREATE INDEX IF NOT EXISTS "Case_slaBreachAt_idx"
  ON "Case" ("slaBreachAt")
  WHERE "slaBreachAt" IS NOT NULL;

-- =============================================================================
-- NOTAS:
-- - SystemConfig es una tabla clave/valor simple, extensible para futuras
--   configuraciones sin nuevas migraciones.
-- - slaBreachAt se setea cuando el backend detecta que el caso superó su SLA.
--   NULL = SLA no vencido (o caso ya cerrado antes de vencer).
-- =============================================================================
