-- AddForeignKey Event → Case (integridad referencial en BD)
-- Si existen Event con caseId huérfano, esta migración fallará; corregir datos antes de aplicar.
ALTER TABLE "Event" ADD CONSTRAINT "Event_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
