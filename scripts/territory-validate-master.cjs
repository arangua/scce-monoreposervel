/**
 * Valida el maestro territorial CSV contra las reglas V1–V6.
 * Especificación: docs/territory/TERRITORIAL_MASTER_IMPORT_SPEC_V1.md
 * Sin tocar BD ni migraciones.
 */

const fs = require('fs');
const path = require('path');

const MASTER_PATH = path.join(__dirname, '..', 'data', 'territory', 'chile_communes_master_v1.csv');
const EXPECTED_COMMUNES = 346;
const REQUIRED_COLUMNS = [
  'regionCode', 'regionName', 'provinceCode', 'provinceName',
  'communeCode', 'communeName', 'isActive', 'source', 'updatedAt',
];

function parseCsv (raw) {
  const lines = raw.replace(/\uFEFF/, '').split(/\r?\n/).map((l) => l.trim());
  const header = lines[0];
  if (!header) return { header: [], rows: [], rawLines: lines };
  const colNames = header.split(',').map((c) => c.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const values = lines[i].split(',').map((v) => v.trim());
    const row = {};
    colNames.forEach((name, j) => { row[name] = values[j] ?? ''; });
    rows.push({ lineNumber: i + 1, ...row });
  }
  return { header: colNames, rows, rawLines: lines };
}

function runValidations (header, rows) {
  const report = {
    processed: rows.length,
    valid: 0,
    invalid: 0,
    v1: { ok: true, errors: [] },
    v2: { ok: true, errors: [] },
    v3: { ok: true, errors: [] },
    v4: { ok: true, errors: [] },
    v5: { ok: true, errors: [] },
    v6: { ok: true, errors: [] },
    invalidRows: [],
  };

  // V5 (parcial): cabecera con columnas obligatorias
  const missingCols = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missingCols.length > 0) {
    report.v5.ok = false;
    report.v5.errors.push({ type: 'header', message: `Columnas obligatorias ausentes: ${missingCols.join(', ')}` });
  }

  // Por fila: V5 (campos y tipos), V2, V3
  const communeCodes = new Map();
  const sources = new Set();

  for (const row of rows) {
    const errs = [];

    // V5: obligatoriedad y tipos
    for (const col of REQUIRED_COLUMNS) {
      const v = (row[col] ?? '').toString().trim();
      if (v === '') {
        errs.push({ rule: 'V5', message: `Campo obligatorio vacío: ${col}` });
        break;
      }
    }
    if (errs.length === 0) {
      const isActive = (row.isActive ?? '').toString().toLowerCase();
      if (!['true', 'false', '1', '0'].includes(isActive)) {
        errs.push({ rule: 'V5', message: `isActive no es booleano: ${row.isActive}` });
      }
      const updatedAt = (row.updatedAt ?? '').trim();
      const dateMatch = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/i.test(updatedAt);
      if (!updatedAt || !dateMatch) {
        errs.push({ rule: 'V5', message: `updatedAt no es fecha ISO válida: ${row.updatedAt}` });
      }
    }

    // V2: provincia válida (no vacía; en formato plano la fila ya trae región y provincia)
    const provinceCode = (row.provinceCode ?? '').trim();
    if (!provinceCode) errs.push({ rule: 'V2', message: 'provinceCode vacío' });

    // V3: región válida (no vacía)
    const regionCode = (row.regionCode ?? '').trim();
    if (!regionCode) errs.push({ rule: 'V3', message: 'regionCode vacío' });

    if (errs.length > 0) {
      report.invalidRows.push({ row: row.lineNumber, communeCode: row.communeCode, errors: errs });
      report.v5.ok = false;
      report.v2.ok = false;
      report.v3.ok = false;
      errs.filter((e) => e.rule === 'V5').forEach((e) => report.v5.errors.push({ row: row.lineNumber, communeCode: row.communeCode, message: e.message }));
      errs.filter((e) => e.rule === 'V2').forEach((e) => report.v2.errors.push({ row: row.lineNumber, communeCode: row.communeCode, message: e.message }));
      errs.filter((e) => e.rule === 'V3').forEach((e) => report.v3.errors.push({ row: row.lineNumber, communeCode: row.communeCode, message: e.message }));
      report.invalid++;
    } else {
      report.valid++;
    }

    // V1: duplicados de communeCode
    const communeCode = (row.communeCode ?? '').trim();
    if (communeCode) {
      if (communeCodes.has(communeCode)) {
        report.v1.ok = false;
        report.v1.errors.push({
          communeCode,
          row: row.lineNumber,
          message: `communeCode duplicado (primera aparición fila ${communeCodes.get(communeCode)})`,
        });
      } else {
        communeCodes.set(communeCode, row.lineNumber);
      }
    }

    // V6: consistencia de source
    const source = (row.source ?? '').trim();
    if (source) sources.add(source);
  }

  // V4: total 346
  if (report.processed !== EXPECTED_COMMUNES) {
    report.v4.ok = false;
    report.v4.errors.push({ message: `Total de filas: ${report.processed}, esperado: ${EXPECTED_COMMUNES}` });
  }

  // V6: un solo valor de source (o valores permitidos)
  if (sources.size > 1) {
    report.v6.ok = false;
    report.v6.errors.push({ message: `Múltiples valores en source: ${[...sources].join(', ')}` });
  }

  return report;
}

function printReport (report) {
  const lines = [];
  lines.push('--- Reporte de validación del maestro territorial ---');
  lines.push('');
  lines.push(`Filas procesadas: ${report.processed}`);
  lines.push(`Filas válidas:    ${report.valid}`);
  lines.push(`Filas inválidas:  ${report.invalid}`);
  lines.push('');

  const vLabels = { v1: 'V1 Sin duplicados communeCode', v2: 'V2 Comuna con provincia válida', v3: 'V3 Provincia con región válida', v4: 'V4 Total 346 comunas', v5: 'V5 Tipos y obligatoriedad', v6: 'V6 Consistencia de source' };
  for (const [key, label] of Object.entries(vLabels)) {
    const r = report[key];
    const status = r.ok ? 'OK' : 'ERROR';
    lines.push(`[${status}] ${label}`);
    if (!r.ok && r.errors && r.errors.length > 0) {
      r.errors.slice(0, 20).forEach((e) => {
        const detail = e.row != null ? `fila ${e.row}` : e.communeCode != null ? `communeCode ${e.communeCode}` : '';
        lines.push(`    - ${e.message || e} ${detail}`);
      });
      if (r.errors.length > 20) lines.push(`    ... y ${r.errors.length - 20} más`);
    }
    lines.push('');
  }

  const allOk = report.v1.ok && report.v2.ok && report.v3.ok && report.v4.ok && report.v5.ok && report.v6.ok;
  const result = allOk ? 'APROBADO' : 'RECHAZADO';
  lines.push('--- Resultado final ---');
  lines.push(result);
  lines.push('');
  return lines.join('\n');
}

function main () {
  if (!fs.existsSync(MASTER_PATH)) {
    console.error('No se encuentra el archivo:', MASTER_PATH);
    process.exit(1);
  }
  const raw = fs.readFileSync(MASTER_PATH, 'utf8');
  const { header, rows } = parseCsv(raw);
  const report = runValidations(header, rows);
  const reportText = printReport(report);
  console.log(reportText);

  const allOk = report.v1.ok && report.v2.ok && report.v3.ok && report.v4.ok && report.v5.ok && report.v6.ok;
  process.exit(allOk ? 0 : 1);
}

main();
