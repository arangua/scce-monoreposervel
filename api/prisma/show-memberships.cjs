/**
 * show-memberships.cjs
 * Muestra todos los memberships en la BD (solo lectura, no modifica nada).
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.membership.findMany({
  orderBy: [{ contextType: 'asc' }, { contextId: 'asc' }, { regionCode: 'asc' }]
}).then((r) => {
  console.log(`\nTotal memberships en BD: ${r.length}`);
  console.log(JSON.stringify(r, null, 2));
  return p.$disconnect();
}).catch((e) => {
  console.error(e);
  return p.$disconnect();
});

// ──────────────────────────────────────────────────────────────────────────────
// Para limpiar datos de simulación, usa:
//   node prisma/reset-sim.cjs
// ──────────────────────────────────────────────────────────────────────────────
