-- Migración: tabla VotingLocal
-- Catálogo de locales de votación por contexto (elección o simulación) y región
-- Fecha: 2026-03-28

CREATE TABLE "VotingLocal" (
    "id"                      TEXT NOT NULL,
    "contextType"             "ContextType" NOT NULL,
    "contextId"               TEXT NOT NULL,
    "regionCode"              TEXT NOT NULL,
    "communeCode"             TEXT NOT NULL,
    "nombre"                  TEXT NOT NULL,
    "direccion"               TEXT,
    "mesas"                   INTEGER,
    "activoGlobal"            BOOLEAN NOT NULL DEFAULT true,
    "activoEnEleccionActual"  BOOLEAN NOT NULL DEFAULT true,
    "origenSeed"              BOOLEAN NOT NULL DEFAULT false,
    "fechaCreacion"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaDesactivacion"      TIMESTAMP(3),
    "createdBy"               TEXT NOT NULL DEFAULT '',
    "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VotingLocal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VotingLocal_contextType_contextId_idx"
    ON "VotingLocal"("contextType", "contextId");

CREATE INDEX "VotingLocal_regionCode_communeCode_idx"
    ON "VotingLocal"("regionCode", "communeCode");

CREATE INDEX "VotingLocal_activoGlobal_activoEnEleccionActual_idx"
    ON "VotingLocal"("activoGlobal", "activoEnEleccionActual");
