-- operational_validation_event
-- Agrega eventType OPERATIONAL_VALIDATION al enum EventType si no existe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EventType' AND e.enumlabel = 'OPERATIONAL_VALIDATION'
  ) THEN
    ALTER TYPE "EventType" ADD VALUE 'OPERATIONAL_VALIDATION';
  END IF;
END $$;
