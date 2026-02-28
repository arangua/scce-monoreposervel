-- 1) Agregar columna (nullable al inicio)
ALTER TABLE "Membership" ADD COLUMN "regionCode" TEXT;

-- 2) Backfill para filas existentes (seed actual)
-- TRP = Tarapacá por defecto para admin.
UPDATE "Membership"
SET "regionCode" = 'TRP'
WHERE "regionCode" IS NULL;

-- 3) Volverla obligatoria
ALTER TABLE "Membership" ALTER COLUMN "regionCode" SET NOT NULL;

-- 4) Índice único para evitar duplicados del mismo usuario en mismo contexto y región
CREATE UNIQUE INDEX "Membership_user_context_region_unique"
ON "Membership" ("userId","contextType","contextId","regionCode");

-- 5) Índice útil para filtros por región
CREATE INDEX "Membership_regionCode_idx" ON "Membership" ("regionCode");
