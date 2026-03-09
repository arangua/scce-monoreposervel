#!/usr/bin/env node
/**
 * Chequeo previo a migración Event → Case FK.
 * Ejecutar antes de: npx prisma migrate dev (o migrate deploy)
 *
 * Si hay eventos huérfanos (caseId sin Case), la migración fallará.
 * Uso: node scripts/check-event-orphans.cjs
 * Exit 0 = sin huérfanos, safe to migrate
 * Exit 1 = hay huérfanos, revisar plan de corrección en migrations/.../README.md
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS orphan_events
    FROM "Event" e
    LEFT JOIN "Case" c ON c.id = e."caseId"
    WHERE c.id IS NULL
  `;
  const count = result[0]?.orphan_events ?? 0;

  if (count === 0) {
    console.log("✓ Sin eventos huérfanos. Safe to migrate.");
    process.exit(0);
  }

  console.error(`✗ Hay ${count} evento(s) huérfano(s). Corregir antes de migrar.`);
  console.error("  Ver plan en: api/prisma/migrations/20260302100000_event_case_fk/README.md");
  process.exit(1);
}

main()
  .finally(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
