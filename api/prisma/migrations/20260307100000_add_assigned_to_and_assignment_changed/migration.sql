-- Add assignedTo to Case (optional; required by business rule only at closure)
ALTER TABLE "Case" ADD COLUMN IF NOT EXISTS "assignedTo" TEXT;

-- Add ASSIGNMENT_CHANGED to EventType enum
ALTER TYPE "EventType" ADD VALUE IF NOT EXISTS 'ASSIGNMENT_CHANGED';
