/**
 * reset-operacion.cjs
 * Limpieza quirurgica: borra SOLO los casos y eventos de OPERACION/GLOBAL.
 * NO toca: memberships, usuarios, datos de SIMULACION/SIM_1, ni regiones.
 *
 * Uso desde la carpeta api:
 *   node -r dotenv/config prisma/reset-operacion.cjs
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const casesCount = await p.case.count({
    where: { contextType: 'OPERACION', contextId: 'GLOBAL' }
  });
  const eventsCount = await p.event.count({
    where: { contextType: 'OPERACION', contextId: 'GLOBAL' }
  });

  console.log('\n--- Auditoria previa ---');
  console.log('  Casos    OPERACION/GLOBAL: ' + casesCount);
  console.log('  Eventos  OPERACION/GLOBAL: ' + eventsCount);

  if (casesCount === 0 && eventsCount === 0) {
    console.log('\nContexto OPERACION/GLOBAL ya esta vacio. Nada que borrar.');
    return;
  }

  const deletedEvents = await p.event.deleteMany({
    where: { contextType: 'OPERACION', contextId: 'GLOBAL' }
  });

  const deletedCases = await p.case.deleteMany({
    where: { contextType: 'OPERACION', contextId: 'GLOBAL' }
  });

  console.log('\n--- Resultado ---');
  console.log('  Eventos borrados: ' + deletedEvents.count);
  console.log('  Casos borrados:   ' + deletedCases.count);
  console.log('\nLimpieza completada. OPERACION/GLOBAL esta vacio.');
  console.log('Memberships, usuarios y datos de SIMULACION: intactos.\n');
}

main()
  .catch(function(e) {
    console.error('Error durante la limpieza:', e.message);
    process.exit(1);
  })
  .finally(function() { return p.$disconnect(); });
