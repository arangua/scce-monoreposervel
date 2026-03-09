#!/usr/bin/env node
/**
 * Inventario de casos: clasificación REAL / PRUEBA_EN_REAL / SIMULACION
 * sin borrar ni modificar nada.
 *
 * Regla: primero identificar, después decidir qué limpiar, recién al final ejecutar limpieza.
 *
 * Uso: node scripts/inventory-cases-by-origin.cjs
 *      (desde api/ o con cwd api; usa .env → DATABASE_URL)
 *
 * Salida: tabla en consola + inventory-cases-by-origin.json en api/scripts/
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

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

function main() {
  return prisma.case
    .findMany({
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        contextType: true,
        contextId: true,
        title: true,
        summary: true,
        status: true,
        regionCode: true,
        communeCode: true,
        localCode: true,
        createdAt: true,
      },
    })
    .then((cases) => {
      const withCategory = cases.map((c) => ({
        ...c,
        category: classify(c),
      }));

      const byCategory = {
        REAL: withCategory.filter((x) => x.category === "REAL"),
        PRUEBA_EN_REAL: withCategory.filter((x) => x.category === "PRUEBA_EN_REAL"),
        SIMULACION: withCategory.filter((x) => x.category === "SIMULACION"),
      };

      const total = cases.length;
      const nReal = byCategory.REAL.length;
      const nPrueba = byCategory.PRUEBA_EN_REAL.length;
      const nSim = byCategory.SIMULACION.length;

      console.log("\n--- Inventario de casos (REAL / PRUEBA_EN_REAL / SIMULACION) ---\n");
      console.log("Regla: primero identificar; después decidir qué limpiar; recién al final ejecutar limpieza.\n");
      console.log("Resumen:");
      console.log("  REAL (operación, no prueba):     " + nReal);
      console.log("  PRUEBA_EN_REAL (operación, E2E/test/demo): " + nPrueba);
      console.log("  SIMULACION (contextType SIMULACION): " + nSim);
      console.log("  TOTAL:                           " + total);
      console.log("");

      if (nReal > 0) {
        console.log("--- REAL (" + nReal + ") ---");
        byCategory.REAL.forEach((c) => {
          console.log("  " + c.id + " | " + (c.summary || c.title || "").slice(0, 50) + " | " + c.status + " | " + c.createdAt.toISOString().slice(0, 10));
        });
        console.log("");
      }

      if (nPrueba > 0) {
        console.log("--- PRUEBA_EN_REAL (" + nPrueba + ") ---");
        byCategory.PRUEBA_EN_REAL.forEach((c) => {
          console.log("  " + c.id + " | " + (c.summary || c.title || "").slice(0, 50) + " | " + c.status + " | ctx=" + c.contextId);
        });
        console.log("");
      }

      if (nSim > 0) {
        console.log("--- SIMULACION (" + nSim + ") ---");
        byCategory.SIMULACION.forEach((c) => {
          console.log("  " + c.id + " | " + (c.summary || c.title || "").slice(0, 50) + " | " + c.status);
        });
        console.log("");
      }

      const outPath = path.join(__dirname, "inventory-cases-by-origin.json");
      fs.writeFileSync(
        outPath,
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            summary: { REAL: nReal, PRUEBA_EN_REAL: nPrueba, SIMULACION: nSim, total: total },
            byCategory,
          },
          null,
          2
        ),
        "utf8"
      );
      console.log("Inventario escrito en: " + outPath + "\n");
    });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
