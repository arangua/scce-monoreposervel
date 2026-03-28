-- case_event_alignment (reescrita — autocontenida e idempotente)
-- Crea EventType y CaseStatus si no existen, convierte columnas,
-- y garantiza FK Event→Case.

-- ─────────────────────────────────────────────
-- 1. Crear enum CaseStatus (si no existe)
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CaseStatus') THEN
    CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'CLOSED');
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 2. Crear enum EventType completo (si no existe)
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EventType') THEN
    CREATE TYPE "EventType" AS ENUM (
      'CASE_CREATED',
      'COMMENT_ADDED',
      'INSTRUCTION_CREATED',
      'CASE_CLOSED',
      'ACK',
      'RESOLVE',
      'CHANGE_CRITICALITY',
      'OPERATIONAL_VALIDATION',
      'ASSIGNMENT_CHANGED',
      'ACTION_ADDED',
      'DECISION_ADDED'
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3. Convertir Case.status TEXT → CaseStatus
--    (solo si aún es TEXT)
-- ─────────────────────────────────────────────
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'Case' AND column_name = 'status';

  IF col_type = 'text' THEN
    -- Backfill: normalizar valores antes del cast
    UPDATE "Case" SET "status" = 'OPEN'   WHERE lower("status") NOT IN ('open','closed');
    UPDATE "Case" SET "status" = 'OPEN'   WHERE "status" = 'open';
    UPDATE "Case" SET "status" = 'CLOSED' WHERE "status" = 'closed';

    ALTER TABLE "Case"
      ALTER COLUMN "status" TYPE "CaseStatus"
      USING "status"::"CaseStatus";
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 4. Convertir Event.eventType TEXT → EventType
--    (solo si aún es TEXT)
-- ─────────────────────────────────────────────
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'Event' AND column_name = 'eventType';

  IF col_type = 'text' THEN
    ALTER TABLE "Event"
      ALTER COLUMN "eventType" TYPE "EventType"
      USING "eventType"::"EventType";
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 5. FK Event.caseId → Case.id (si no existe)
-- ─────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Event_caseId_fkey'
      AND table_name = 'Event'
  ) THEN
    ALTER TABLE "Event"
      ADD CONSTRAINT "Event_caseId_fkey"
      FOREIGN KEY ("caseId") REFERENCES "Case"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
