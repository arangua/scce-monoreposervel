-- =============================================================================
-- FASE 0 — Corrección brecha arquitectural: estados ricos del caso
-- =============================================================================
-- Problema: CaseStatus solo tenía OPEN/CLOSED.
-- El flujo real (7 estados UI + 8 etapas decisionales) vivía solo en memoria
-- del navegador. Si el usuario recargaba, los estados intermedios se perdían.
-- Esta migración persiste el estado completo en BD.
--
-- Estrategia de migración segura:
--   1. Crear nuevo enum CaseStatusV2 con los 7 estados ricos
--   2. Agregar columna temporal richStatus
--   3. Backfill: OPEN → NEW, CLOSED → CLOSED (los 3 casos actuales en SIM_1)
--   4. Reemplazar columna status con richStatus
--   5. Renombrar enum
--   6. Agregar columna decisionStage (las 8 etapas del flujo C2)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 1: Crear nuevo enum con los 7 estados ricos
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CaseStatusRich') THEN
    CREATE TYPE "CaseStatusRich" AS ENUM (
      'NEW',           -- "Nuevo"
      'RECEIVED',      -- "Recepcionado por DR"
      'IN_MANAGEMENT', -- "En gestión"
      'ESCALATED',     -- "Escalado"
      'MITIGATED',     -- "Mitigado"
      'RESOLVED',      -- "Resuelto"
      'CLOSED'         -- "Cerrado"
    );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PASO 2: Agregar columna temporal con el nuevo tipo
-- -----------------------------------------------------------------------------
ALTER TABLE "Case"
  ADD COLUMN IF NOT EXISTS "statusRich" "CaseStatusRich";

-- -----------------------------------------------------------------------------
-- PASO 3: Backfill — mapear OPEN→NEW, CLOSED→CLOSED
-- Seguro: los 3 casos existentes en SIM_1 son OPEN, se convierten a NEW.
-- -----------------------------------------------------------------------------
UPDATE "Case"
  SET "statusRich" = CASE
    WHEN "status" = 'OPEN'   THEN 'NEW'::"CaseStatusRich"
    WHEN "status" = 'CLOSED' THEN 'CLOSED'::"CaseStatusRich"
    ELSE 'NEW'::"CaseStatusRich"
  END
WHERE "statusRich" IS NULL;

-- Hacer NOT NULL después del backfill
ALTER TABLE "Case"
  ALTER COLUMN "statusRich" SET NOT NULL,
  ALTER COLUMN "statusRich" SET DEFAULT 'NEW'::"CaseStatusRich";

-- -----------------------------------------------------------------------------
-- PASO 4: Reemplazar columna status antigua
-- Renombrar status → statusLegacy (preservar por si hay rollback)
-- Renombrar statusRich → status
-- -----------------------------------------------------------------------------
ALTER TABLE "Case" RENAME COLUMN "status" TO "statusLegacy";
ALTER TABLE "Case" RENAME COLUMN "statusRich" TO "status";

-- -----------------------------------------------------------------------------
-- PASO 5: Agregar columna decisionStage — las 8 etapas del flujo C2
-- Default: DETECTED (toda nueva entrada empieza en la etapa 1)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DecisionStage') THEN
    CREATE TYPE "DecisionStage" AS ENUM (
      'DETECTED',    -- Etapa 1: ¿Qué ocurrió?
      'VALIDATED',   -- Etapa 2: ¿Qué sabemos realmente?
      'ORIENTED',    -- Etapa 3: ¿Qué significa?
      'CLASSIFIED',  -- Etapa 4: ¿Cuál es la criticidad?
      'DECIDED',     -- Etapa 5: ¿Se resuelve o escala?
      'EXECUTING',   -- Etapa 6: ¿Quién hace qué?
      'VERIFIED',    -- Etapa 7: ¿Funcionó?
      'CLOSED'       -- Etapa 8: Cerrar o reescalar
    );
  END IF;
END $$;

ALTER TABLE "Case"
  ADD COLUMN IF NOT EXISTS "decisionStage" "DecisionStage"
  NOT NULL DEFAULT 'DETECTED'::"DecisionStage";

-- Backfill: casos que ya están CLOSED pasan a etapa CLOSED
UPDATE "Case"
  SET "decisionStage" = 'CLOSED'::"DecisionStage"
WHERE "status" = 'CLOSED'::"CaseStatusRich";

-- -----------------------------------------------------------------------------
-- PASO 6: Agregar EventType para transferencia de mando (preparación Fase 3)
-- -----------------------------------------------------------------------------
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'COMMAND_TRANSFER';
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'STAGE_ADVANCED';

-- -----------------------------------------------------------------------------
-- PASO 7: Índice sobre decisionStage para queries del panel C2
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "Case_decisionStage_idx"
  ON "Case" ("decisionStage");

CREATE INDEX IF NOT EXISTS "Case_status_contextType_idx"
  ON "Case" ("status", "contextType", "contextId");

-- =============================================================================
-- NOTAS DE ROLLBACK:
-- Para revertir: ALTER TABLE "Case" RENAME COLUMN "status" TO "statusRich";
--               ALTER TABLE "Case" RENAME COLUMN "statusLegacy" TO "status";
-- La columna statusLegacy se puede eliminar después de validar en producción.
-- =============================================================================
