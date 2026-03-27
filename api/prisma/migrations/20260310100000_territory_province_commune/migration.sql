-- territory_province_commune
-- Crea tablas Province y Commune para territorio electoral.

CREATE TABLE IF NOT EXISTS "Province" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Commune" (
    "id" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Commune_pkey" PRIMARY KEY ("id")
);

-- FK Province → Region
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Province_regionId_fkey'
  ) THEN
    ALTER TABLE "Province"
      ADD CONSTRAINT "Province_regionId_fkey"
      FOREIGN KEY ("regionId") REFERENCES "Region"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- FK Commune → Province
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'Commune_provinceId_fkey'
  ) THEN
    ALTER TABLE "Commune"
      ADD CONSTRAINT "Commune_provinceId_fkey"
      FOREIGN KEY ("provinceId") REFERENCES "Province"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Province_regionId_idx" ON "Province"("regionId");
CREATE INDEX IF NOT EXISTS "Commune_provinceId_idx" ON "Commune"("provinceId");
