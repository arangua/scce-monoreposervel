-- Normalizar casos con regionCode NULL o vacío (1 caso histórico)
UPDATE "Case"
SET "regionCode" = 'TRP'
WHERE "regionCode" IS NULL OR btrim("regionCode") = '';

-- Compuerta: regionCode obligatorio y no vacío
ALTER TABLE "Case"
  ADD CONSTRAINT "Case_regionCode_not_blank" CHECK (btrim("regionCode") <> '');
