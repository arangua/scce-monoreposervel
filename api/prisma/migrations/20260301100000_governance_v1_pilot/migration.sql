-- SCCE v1 Governance Pilot — Baseline schema (Hito 1)
-- Backfill seguro para datos existentes. No elimina campos legados (summary, criticality).

-- CreateEnums
CREATE TYPE "CriticalityLevel" AS ENUM ('LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'LEVEL_4');
CREATE TYPE "CaseStatus" AS ENUM ('NEW', 'ACKED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "EventType" AS ENUM ('CASE_CREATED', 'COMMENT_ADDED', 'INSTRUCTION_CREATED', 'CASE_CLOSED', 'ACK', 'RESOLVE', 'CHANGE_CRITICALITY');

-- Case: add new columns with safe defaults for backfill
ALTER TABLE "Case" ADD COLUMN "title" TEXT DEFAULT 'Sin título';
ALTER TABLE "Case" ADD COLUMN "description" TEXT;
ALTER TABLE "Case" ADD COLUMN "createdByUserId" TEXT DEFAULT 'system';
ALTER TABLE "Case" ADD COLUMN "criticalityLevel" "CriticalityLevel" DEFAULT 'LEVEL_2';

-- Backfill 1) title from summary (existing rows)
UPDATE "Case" SET "title" = COALESCE("summary", 'Sin título') WHERE "title" = 'Sin título' OR "title" IS NULL;
ALTER TABLE "Case" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "Case" ALTER COLUMN "title" DROP DEFAULT;

-- Backfill 2) createdByUserId from first CASE_CREATED event per case (placeholder 'system' if none)
UPDATE "Case" c
SET "createdByUserId" = (
  SELECT e."actorId"
  FROM "Event" e
  WHERE e."caseId" = c.id AND e."eventType" = 'CASE_CREATED'
  ORDER BY e."createdAt" ASC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM "Event" e WHERE e."caseId" = c.id AND e."eventType" = 'CASE_CREATED'
);
-- Rows without CASE_CREATED keep 'system' (comentario: casos extremos/legacy)
ALTER TABLE "Case" ALTER COLUMN "createdByUserId" SET NOT NULL;
ALTER TABLE "Case" ALTER COLUMN "createdByUserId" DROP DEFAULT;

-- Backfill 3) criticalityLevel from legacy criticality string (MEDIA->LEVEL_2, ALTA->LEVEL_3, BAJA->LEVEL_1, CRITICA/CRÍTICA->LEVEL_4; desconocido->LEVEL_2)
UPDATE "Case"
SET "criticalityLevel" = CASE
  WHEN UPPER(TRIM("criticality")) IN ('CRITICA', 'CRÍTICA') THEN 'LEVEL_4'::"CriticalityLevel"
  WHEN UPPER(TRIM("criticality")) = 'ALTA' THEN 'LEVEL_3'::"CriticalityLevel"
  WHEN UPPER(TRIM("criticality")) = 'BAJA' THEN 'LEVEL_1'::"CriticalityLevel"
  WHEN UPPER(TRIM("criticality")) = 'MEDIA' THEN 'LEVEL_2'::"CriticalityLevel"
  ELSE 'LEVEL_2'::"CriticalityLevel"
END;
ALTER TABLE "Case" ALTER COLUMN "criticalityLevel" SET NOT NULL;
ALTER TABLE "Case" ALTER COLUMN "criticalityLevel" DROP DEFAULT;

-- Backfill 4) status: migrate to CaseStatus (OPEN->NEW, CLOSED->CLOSED, otros->NEW)
ALTER TABLE "Case" ADD COLUMN "statusNew" "CaseStatus" NOT NULL DEFAULT 'NEW';
UPDATE "Case"
SET "statusNew" = CASE
  WHEN "status" = 'CLOSED' THEN 'CLOSED'::"CaseStatus"
  WHEN "status" = 'OPEN' THEN 'NEW'::"CaseStatus"
  ELSE 'NEW'::"CaseStatus"
END;
ALTER TABLE "Case" DROP COLUMN "status";
ALTER TABLE "Case" RENAME COLUMN "statusNew" TO "status";

-- Event: eventType TEXT → EventType enum (patrón seguro: columna nueva + mapeo + reemplazo)
-- Evita fallo si existen valores históricos no incluidos en el enum.
ALTER TABLE "Event" ADD COLUMN "eventTypeNew" "EventType" NOT NULL DEFAULT 'COMMENT_ADDED';
UPDATE "Event"
SET "eventTypeNew" = CASE
  WHEN "eventType" = 'CASE_CREATED' THEN 'CASE_CREATED'::"EventType"
  WHEN "eventType" = 'COMMENT_ADDED' THEN 'COMMENT_ADDED'::"EventType"
  WHEN "eventType" = 'INSTRUCTION_CREATED' THEN 'INSTRUCTION_CREATED'::"EventType"
  WHEN "eventType" = 'CASE_CLOSED' THEN 'CASE_CLOSED'::"EventType"
  WHEN "eventType" = 'ACK' THEN 'ACK'::"EventType"
  WHEN "eventType" = 'RESOLVE' THEN 'RESOLVE'::"EventType"
  WHEN "eventType" = 'CHANGE_CRITICALITY' THEN 'CHANGE_CRITICALITY'::"EventType"
  WHEN "eventType" IN ('CLOSE', 'CLOSED') THEN 'CASE_CLOSED'::"EventType"
  WHEN "eventType" = 'COMMENT' THEN 'COMMENT_ADDED'::"EventType"
  ELSE 'COMMENT_ADDED'::"EventType"
END;
ALTER TABLE "Event" DROP COLUMN "eventType";
ALTER TABLE "Event" RENAME COLUMN "eventTypeNew" TO "eventType";
