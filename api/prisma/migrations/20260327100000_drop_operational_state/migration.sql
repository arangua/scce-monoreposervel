-- drop_operational_state
-- Elimina columna huérfana Case.operationalState que no existe en schema.prisma.
-- Esta columna fue creada en una versión anterior del sistema (SPA monolítica v1.x)
-- y quedó sin correspondencia tras la migración al monorepo NestJS/Prisma.

ALTER TABLE "Case" DROP COLUMN IF EXISTS "operationalState";
