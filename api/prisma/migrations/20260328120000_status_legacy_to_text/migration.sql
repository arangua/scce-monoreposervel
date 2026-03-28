-- statusLegacy quedó como tipo enum (OPEN/CLOSED) al renombrar la columna antigua.
-- Prisma la modela como String → P2032 al leer. Convertir a TEXT explícitamente.
ALTER TABLE "Case"
  ALTER COLUMN "statusLegacy" TYPE TEXT
  USING "statusLegacy"::text;
