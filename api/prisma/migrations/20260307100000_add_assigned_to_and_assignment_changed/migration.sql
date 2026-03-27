-- add_assigned_to_and_assignment_changed
-- Agrega campo assignedTo a Case y eventType ASSIGNMENT_CHANGED al enum.
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "assignedTo" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EventType' AND e.enumlabel = 'ASSIGNMENT_CHANGED'
  ) THEN
    ALTER TYPE "EventType" ADD VALUE 'ASSIGNMENT_CHANGED';
  END IF;
END $$;
