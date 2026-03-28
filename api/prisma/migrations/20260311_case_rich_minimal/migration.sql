-- case_rich_minimal
-- Añade campos enriquecidos al modelo Case:
-- title, description, createdByUserId, criticalityLevel, detail,
-- evaluation, completeness, actions, decisions, instructions.

-- 1. Crear enum CriticalityLevel
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CriticalityLevel') THEN
    CREATE TYPE "CriticalityLevel" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4');
  END IF;
END $$;

-- 2. Añadir columnas nuevas a Case
ALTER TABLE "Case"
  ADD COLUMN IF NOT EXISTS "title"            TEXT,
  ADD COLUMN IF NOT EXISTS "description"      TEXT,
  ADD COLUMN IF NOT EXISTS "createdByUserId"  TEXT,
  ADD COLUMN IF NOT EXISTS "criticalityLevel" TEXT,
  ADD COLUMN IF NOT EXISTS "detail"           TEXT,
  ADD COLUMN IF NOT EXISTS "evaluation"       JSONB,
  ADD COLUMN IF NOT EXISTS "completeness"     INTEGER,
  ADD COLUMN IF NOT EXISTS "actions"          JSONB,
  ADD COLUMN IF NOT EXISTS "decisions"        JSONB,
  ADD COLUMN IF NOT EXISTS "instructions"     JSONB;

-- 3. Backfill: title = summary para registros existentes
UPDATE "Case"
SET "title" = "summary"
WHERE "title" IS NULL;

-- 4. Backfill: criticalityLevel desde criticality
UPDATE "Case"
SET "criticalityLevel" = 'LEVEL_2'
WHERE "criticalityLevel" IS NULL;

-- 5. Backfill: createdByUserId con placeholder
UPDATE "Case"
SET "createdByUserId" = 'system'
WHERE "createdByUserId" IS NULL;

-- 6. Convertir criticalityLevel a enum
ALTER TABLE "Case"
  ALTER COLUMN "criticalityLevel" TYPE "CriticalityLevel"
  USING "criticalityLevel"::"CriticalityLevel";

-- 7. Hacer NOT NULL las columnas obligatorias
ALTER TABLE "Case"
  ALTER COLUMN "title"            SET NOT NULL,
  ALTER COLUMN "createdByUserId"  SET NOT NULL,
  ALTER COLUMN "criticalityLevel" SET NOT NULL;
