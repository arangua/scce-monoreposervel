-- add_decision_added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EventType' AND e.enumlabel = 'DECISION_ADDED'
  ) THEN
    ALTER TYPE "EventType" ADD VALUE 'DECISION_ADDED';
  END IF;
END $$;
