-- add_action_added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'EventType' AND e.enumlabel = 'ACTION_ADDED'
  ) THEN
    ALTER TYPE "EventType" ADD VALUE 'ACTION_ADDED';
  END IF;
END $$;
