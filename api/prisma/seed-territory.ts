/**
 * Seed/import del maestro territorial (regiones, provincias, comunas).
 * Lee data/territory/chile_communes_master_v1.csv, valida V1–V6 y hace upsert idempotente.
 * No toca catálogos, casos, permisos ni frontend.
 * Especificación: docs/territory/TERRITORIAL_MASTER_IMPORT_SPEC_V1.md
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXPECTED_COMMUNES = 346;
const REQUIRED_COLUMNS = [
  "regionCode",
  "regionName",
  "provinceCode",
  "provinceName",
  "communeCode",
  "communeName",
  "isActive",
  "source",
  "updatedAt",
];

// Ruta al CSV desde api/prisma/
const MASTER_CSV_PATH = path.join(__dirname, "..", "..", "data", "territory", "chile_communes_master_v1.csv");

interface CsvRow {
  regionCode: string;
  regionName: string;
  provinceCode: string;
  provinceName: string;
  communeCode: string;
  communeName: string;
  isActive: string;
  source: string;
  updatedAt: string;
}

function parseCsv(raw: string): { header: string[]; rows: CsvRow[] } {
  const lines = raw.replace(/\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error("CSV sin cabecera o datos");
  const header = lines[0].split(",").map((c) => c.trim());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    header.forEach((name, j) => {
      row[name] = values[j] ?? "";
    });
    rows.push(row as unknown as CsvRow);
  }
  return { header, rows };
}

interface ValidationReport {
  ok: boolean;
  v1: { ok: boolean; errors: { communeCode?: string; message: string }[] };
  v2: { ok: boolean; errors: { message: string }[] };
  v3: { ok: boolean; errors: { message: string }[] };
  v4: { ok: boolean; errors: { message: string }[] };
  v5: { ok: boolean; errors: { message: string }[] };
  v6: { ok: boolean; errors: { message: string }[] };
}

function validateTerritoryMaster(header: string[], rows: CsvRow[]): ValidationReport {
  const report: ValidationReport = {
    ok: true,
    v1: { ok: true, errors: [] },
    v2: { ok: true, errors: [] },
    v3: { ok: true, errors: [] },
    v4: { ok: true, errors: [] },
    v5: { ok: true, errors: [] },
    v6: { ok: true, errors: [] },
  };

  const missingCols = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missingCols.length > 0) {
    report.v5.ok = false;
    report.v5.errors.push({ message: `Columnas obligatorias ausentes: ${missingCols.join(", ")}` });
  }

  const communeCodes = new Map<string, number>();
  const sources = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2;

    for (const col of REQUIRED_COLUMNS) {
      const v = (row[col as keyof CsvRow] ?? "").toString().trim();
      if (v === "") {
        report.v5.ok = false;
        report.v5.errors.push({ message: `Fila ${lineNum}: campo obligatorio vacío: ${col}` });
      }
    }
    const isActive = (row.isActive ?? "").toString().toLowerCase();
    if (!["true", "false", "1", "0"].includes(isActive)) {
      report.v5.ok = false;
      report.v5.errors.push({ message: `Fila ${lineNum}: isActive no booleano` });
    }
    const updatedAt = (row.updatedAt ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/i.test(updatedAt)) {
      report.v5.ok = false;
      report.v5.errors.push({ message: `Fila ${lineNum}: updatedAt no es fecha ISO válida` });
    }

    const provinceCode = (row.provinceCode ?? "").trim();
    if (!provinceCode) {
      report.v2.ok = false;
      report.v2.errors.push({ message: `Fila ${lineNum}: provinceCode vacío` });
    }
    const regionCode = (row.regionCode ?? "").trim();
    if (!regionCode) {
      report.v3.ok = false;
      report.v3.errors.push({ message: `Fila ${lineNum}: regionCode vacío` });
    }

    const communeCode = (row.communeCode ?? "").trim();
    if (communeCode) {
      if (communeCodes.has(communeCode)) {
        report.v1.ok = false;
        report.v1.errors.push({
          communeCode,
          message: `Duplicado (fila ${lineNum}, primera en ${communeCodes.get(communeCode)})`,
        });
      } else {
        communeCodes.set(communeCode, lineNum);
      }
    }
    const source = (row.source ?? "").trim();
    if (source) sources.add(source);
  }

  if (rows.length !== EXPECTED_COMMUNES) {
    report.v4.ok = false;
    report.v4.errors.push({
      message: `Total filas: ${rows.length}, esperado: ${EXPECTED_COMMUNES}`,
    });
  }
  if (sources.size > 1) {
    report.v6.ok = false;
    report.v6.errors.push({
      message: `Múltiples valores en source: ${[...sources].join(", ")}`,
    });
  }

  report.ok =
    report.v1.ok &&
    report.v2.ok &&
    report.v3.ok &&
    report.v4.ok &&
    report.v5.ok &&
    report.v6.ok;
  return report;
}

function assertValid(report: ValidationReport): void {
  if (report.ok) return;
  const messages: string[] = [];
  if (!report.v1.ok) report.v1.errors.forEach((e) => messages.push(`V1: ${e.message}`));
  if (!report.v2.ok) report.v2.errors.forEach((e) => messages.push(`V2: ${e.message}`));
  if (!report.v3.ok) report.v3.errors.forEach((e) => messages.push(`V3: ${e.message}`));
  if (!report.v4.ok) report.v4.errors.forEach((e) => messages.push(`V4: ${e.message}`));
  if (!report.v5.ok) report.v5.errors.slice(0, 5).forEach((e) => messages.push(`V5: ${e.message}`));
  if (!report.v6.ok) report.v6.errors.forEach((e) => messages.push(`V6: ${e.message}`));
  throw new Error(`Validación maestro territorial RECHAZADA:\n${messages.join("\n")}`);
}

async function main() {
  if (!fs.existsSync(MASTER_CSV_PATH)) {
    throw new Error(`No se encuentra el archivo maestro: ${MASTER_CSV_PATH}`);
  }
  const raw = fs.readFileSync(MASTER_CSV_PATH, "utf8");
  const { header, rows } = parseCsv(raw);
  const report = validateTerritoryMaster(header, rows);
  assertValid(report);

  // 1) Regiones (upsert por id = regionCode)
  const regionByCode = new Map<string, { code: string; name: string }>();
  for (const row of rows) {
    const code = (row.regionCode ?? "").trim();
    const name = (row.regionName ?? "").trim();
    if (code && !regionByCode.has(code)) {
      regionByCode.set(code, { code, name });
    }
  }
  for (const { code, name } of regionByCode.values()) {
    await prisma.region.upsert({
      where: { id: code },
      update: { name },
      create: { id: code, name },
    });
  }
  console.log(`Regiones: ${regionByCode.size} upserted`);

  // 2) Provincias (upsert por id = provinceCode, regionId = regionCode)
  const provinceByCode = new Map<string, { code: string; regionCode: string; name: string }>();
  for (const row of rows) {
    const code = (row.provinceCode ?? "").trim();
    const regionCode = (row.regionCode ?? "").trim();
    const name = (row.provinceName ?? "").trim();
    if (code && regionCode && !provinceByCode.has(code)) {
      provinceByCode.set(code, { code, regionCode, name });
    }
  }
  for (const { code, regionCode, name } of provinceByCode.values()) {
    await prisma.province.upsert({
      where: { id: code },
      update: { regionId: regionCode, name },
      create: { id: code, regionId: regionCode, name },
    });
  }
  console.log(`Provincias: ${provinceByCode.size} upserted`);

  // 3) Comunas (upsert por id = communeCode, provinceId = provinceCode)
  const isActive = (v: string) => ["true", "1"].includes((v ?? "").toString().toLowerCase());
  for (const row of rows) {
    const id = (row.communeCode ?? "").trim();
    const provinceId = (row.provinceCode ?? "").trim();
    const name = (row.communeName ?? "").trim();
    const source = (row.source ?? "").trim();
    const updatedAt = new Date((row.updatedAt ?? "").trim());
    if (!id || !provinceId) continue;
    await prisma.commune.upsert({
      where: { id },
      update: {
        provinceId,
        name,
        isActive: isActive(row.isActive),
        source,
        updatedAt,
      },
      create: {
        id,
        provinceId,
        name,
        isActive: isActive(row.isActive),
        source,
        updatedAt,
      },
    });
  }
  console.log(`Comunas: ${rows.length} upserted`);

  console.log("✅ Seed territorio OK — 16 regiones, 56 provincias, 346 comunas");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
