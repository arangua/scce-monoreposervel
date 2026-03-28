-- add_case_status_enum
-- Convierte Case.status de TEXT a enum CaseStatus
-- y Event.eventType de TEXT a enum EventType.

-- 1. Crear enum CaseStatus
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CaseStatus') THEN
    CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'CLOSED');
  END IF;
END $$;

-- 2. Crear enum EventType (completo)
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

-- 3. Convertir Case.status a enum (con cast seguro)
ALTER TABLE "Case"
  ALTER COLUMN "status" TYPE "CaseStatus"
  USING "status"::"CaseStatus";

-- 4. Convertir Event.eventType a enum (con cast seguro)
ALTER TABLE "Event"
  ALTER COLUMN "eventType" TYPE "EventType"
  USING "eventType"::"EventType";
