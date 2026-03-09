#!/usr/bin/env node
/**
 * Archivo seguro: mueve los casos PRUEBA_EN_REAL a contexto SIMULACION/archivo-prueba.
 * No borra nada. No toca casos REAL.
 *
 * Uso:
 *   node scripts/archive-prueba-en-real.cjs           → dry-run (solo muestra qué se haría)
 *   node scripts/archive-prueba-en-real.cjs --execute → aplica cambios y escribe backup
 *
 * Requiere: api/.env con DATABASE_URL
 *
 * Regla aplicada solo a PRUEBA_EN_REAL (misma clasificación que inventory-cases-by-origin.cjs):
 *   - Case: contextType = SIMULACION, contextId = "archivo-prueba"
 *   - Case: summary = "[ARCHIVADO-PRUEBA] " + summary (si no tiene ya el prefijo)
 *   - Event (todos los del caso): contextType = SIMULACION, contextId = "archivo-prueba"
 *
 * Se escribe api/scripts/archive-prueba-backup-<timestamp>.json con valores anteriores
 * para poder revertir si algo quedó mal clasificado.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const EXECUTE = process.argv.includes("--execute");
const ARCHIVE_CONTEXT_TYPE = "SIMULACION";
const ARCHIVE_CONTEXT_ID = "archivo-prueba";
const SUMMARY_PREFIX = "[ARCHIVADO-PRUEBA] ";

// Misma lógica que inventory-cases-by-origin.cjs
const TEST_PATTERNS = [
  /\bE2E\b/i,
  /\[SIM\]/i,
  /simulación\s+car loaded|incidentes de simulación/i,
  /\btest\b/i,
  /\bprueba\b/i,
  /\bdemo\b/i,
  /E2E\s+Camino\s+[ABC]/i,
  /E2E\s+full\s+flow/i,
  /E2E\s+Case\s+Flow/i,
  /E2E\s+region\s+scope/i,
  /E2E\s+validación/i,
  /LOC-E2E/i,
];
const TEST_CONTEXT_IDS = ["e2e-region-scope", "e2e-region-isolation", "e2e-"];

function classify(c) {
  const summary = (c.summary || "").trim();
  const title = (c.title || "").trim();
  const contextId = (c.contextId || "").trim();

  if (c.contextType === "SIMULACION") {
    return "SIMULACION";
  }
  const looksLikeTest =
    TEST_PATTERNS.some((re) => re.test(summary) || re.test(title)) ||
    TEST_CONTEXT_IDS.some((prefix) => contextId.toLowerCase().startsWith(prefix));
  if (c.contextType === "OPERACION" && looksLikeTest) {
    return "PRUEBA_EN_REAL";
  }
  if (c.contextType === "OPERACION") {
    return "REAL";
  }
  return "REAL";
}

async function main() {
  const cases = await prisma.case.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      contextType: true,
      contextId: true,
      title: true,
      summary: true,
      status: true,
    },
  });

  const toArchive = cases.filter((c) => classify(c) === "PRUEBA_EN_REAL");

  if (toArchive.length === 0) {
    console.log("No hay casos PRUEBA_EN_REAL que archivar.");
    return;
  }

  console.log("\n--- Archivo seguro: PRUEBA_EN_REAL → " + ARCHIVE_CONTEXT_TYPE + "/" + ARCHIVE_CONTEXT_ID + " ---\n");
  console.log("Casos a mover: " + toArchive.length);
  console.log("REAL no se tocan.\n");

  if (!EXECUTE) {
    console.log("Modo dry-run. Para aplicar cambios ejecuta:");
    console.log("  node scripts/archive-prueba-en-real.cjs --execute\n");
    toArchive.forEach((c, i) => {
      console.log("  " + (i + 1) + ". " + c.id + " | " + (c.summary || "").slice(0, 45) + " | " + c.contextType + "/" + c.contextId);
    });
    return;
  }

  const backup = {
    executedAt: new Date().toISOString(),
    archiveContext: { contextType: ARCHIVE_CONTEXT_TYPE, contextId: ARCHIVE_CONTEXT_ID },
    cases: [],
  };

  for (const c of toArchive) {
    const oldCase = await prisma.case.findUnique({
      where: { id: c.id },
      select: { contextType: true, contextId: true, summary: true, title: true },
    });
    const events = await prisma.event.findMany({
      where: { caseId: c.id },
      select: { id: true, contextType: true, contextId: true },
    });

    backup.cases.push({
      caseId: c.id,
      oldCase: oldCase,
      eventIds: events.map((e) => e.id),
      oldEvents: events.map((e) => ({ id: e.id, contextType: e.contextType, contextId: e.contextId })),
    });

    const newSummary =
      (oldCase.summary || "").startsWith(SUMMARY_PREFIX) ? oldCase.summary : SUMMARY_PREFIX + (oldCase.summary || "").trim();

    await prisma.$transaction([
      prisma.case.update({
        where: { id: c.id },
        data: {
          contextType: ARCHIVE_CONTEXT_TYPE,
          contextId: ARCHIVE_CONTEXT_ID,
          summary: newSummary,
          updatedAt: new Date(),
        },
      }),
      prisma.event.updateMany({
        where: { caseId: c.id },
        data: { contextType: ARCHIVE_CONTEXT_TYPE, contextId: ARCHIVE_CONTEXT_ID },
      }),
    ]);
    console.log("  Archivado: " + c.id + " | " + (oldCase.summary || "").slice(0, 40));
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupPath = path.join(__dirname, "archive-prueba-backup-" + timestamp + ".json");
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  console.log("\nBackup de valores anteriores: " + backupPath);
  console.log("Casos archivados: " + toArchive.length + ". REAL no modificados.\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
