-- event_case_fk
-- Agrega FK entre Event y Case (si no existe ya desde init).
-- Aplicada condicionalmente.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Event_caseId_fkey'
  ) THEN
    ALTER TABLE "Event"
      ADD CONSTRAINT "Event_caseId_fkey"
      FOREIGN KEY ("caseId") REFERENCES "Case"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
