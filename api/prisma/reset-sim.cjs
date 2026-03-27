/**
 * reset-sim.cjs
 * Limpieza quirurgica: borra SOLO los casos y eventos de SIMULACION/SIM_1.
 * NO toca: memberships, usuarios, datos de OPERACION/GLOBAL, ni regiones.
 *
 * Uso:
 *   cd "C:\Users\arang\OneDrive\Escritorio\0001 SCCE_REVISION\api"
 *   node prisma/reset-sim.cjs
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // 1) Contar antes de borrar (transparencia total)
  const casesCount = await p.case.count({
    where: { contextType: 'SIMULACION', contextId: 'SIM_1' }
  });
  const eventsCount = await p.event.count({
    where: { contextType: 'SIMULACION', contextId: 'SIM_1' }
  });

  console.log('\n--- Auditoria previa ---');
  console.log(`  Casos    SIMULACION/SIM_1: ${casesCount}`);
  console.log(`  Eventos  SIMULACION/SIM_1: ${eventsCount}`);

  if (casesCount === 0 && eventsCount === 0) {
    console.log('\n✅ Nada que borrar. El contexto SIMULACION/SIM_1 ya esta limpio.');
    return;
  }

  // 2) Borrar eventos primero (FK a casos)
  const deletedEvents = await p.event.deleteMany({
    where: { contextType: 'SIMULACION', contextId: 'SIM_1' }
  });

  // 3) Borrar casos
  const deletedCases = await p.case.deleteMany({
    where: { contextType: 'SIMULACION', contextId: 'SIM_1' }
  });

  console.log('\n--- Resultado ---');
  console.log(`  Eventos borrados: ${deletedEvents.count}`);
  console.log(`  Casos borrados:   ${deletedCases.count}`);
  console.log('\n✅ Limpieza completada. SIMULACION/SIM_1 esta vacio.');
  console.log('   Memberships, usuarios y datos de OPERACION: intactos.\n');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la limpieza:', e.message);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
