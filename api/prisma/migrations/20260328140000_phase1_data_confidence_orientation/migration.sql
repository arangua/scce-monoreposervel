-- =============================================================================
-- FASE 1 — Nivel de confianza del dato + Etapa Orientar
-- =============================================================================
-- Agrega dos campos al modelo Case:
--   dataConfidence: nivel de confianza de la información del caso
--   orientation:    análisis de significado (operacional, jurídico, reputacional)
--
-- Ambos son opcionales en BD pero obligatorios por lógica de negocio antes de
-- avanzar a etapa DECIDED (enforcement en backend, no en BD directamente).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 1: Enum DataConfidence
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DataConfidence') THEN
    CREATE TYPE "DataConfidence" AS ENUM (
      'VERIFIED',   -- Confirmado por ≥2 fuentes independientes
      'HIGH',       -- Una fuente confiable, sin contradicción conocida
      'MEDIUM',     -- Fuente única, no verificada
      'LOW',        -- Rumor, reporte indirecto, sin confirmación
      'UNKNOWN'     -- No se ha podido evaluar (default al crear)
    );
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- PASO 2: Agregar dataConfidence a Case (default UNKNOWN)
-- -----------------------------------------------------------------------------
ALTER TABLE "Case"
  ADD COLUMN IF NOT EXISTS "dataConfidence" "DataConfidence"
  NOT NULL DEFAULT 'UNKNOWN'::"DataConfidence";

-- -----------------------------------------------------------------------------
-- PASO 3: Agregar orientation a Case (JSON con 3 dimensiones)
-- Estructura esperada:
--   { operationalMeaning: string, legalRisk: string, reputationalRisk: string,
--     orientedBy: string, orientedAt: ISO string }
-- -----------------------------------------------------------------------------
ALTER TABLE "Case"
  ADD COLUMN IF NOT EXISTS "orientation" JSONB;

-- -----------------------------------------------------------------------------
-- PASO 4: Índice para queries del panel C2 (filtrar por confianza baja)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "Case_dataConfidence_idx"
  ON "Case" ("dataConfidence");

-- =============================================================================
-- NOTAS:
-- - dataConfidence=UNKNOWN es el estado inicial de todo caso nuevo.
-- - orientation=NULL significa que la etapa Orientar aún no fue completada.
-- - El backend bloquea avance a DECIDED si dataConfidence IN (LOW, UNKNOWN)
--   sin excepción documentada.
-- =============================================================================
