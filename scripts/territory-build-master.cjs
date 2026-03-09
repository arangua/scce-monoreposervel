/**
 * Genera data/territory/chile_communes_master_v1.csv desde fuente CUT (bdcut-cl).
 * Especificación: docs/territory/TERRITORIAL_MASTER_IMPORT_SPEC_V1.md
 * Sin tocar BD ni migraciones.
 */

const fs = require('fs');
const path = require('path');

const BDCUT_CSV_URL = 'https://raw.githubusercontent.com/knxroot/bdcut-cl/master/BD/CSV_utf8/BDCUT_CL__CSV_UTF8.csv';
const OUT_PATH = path.join(__dirname, '..', 'data', 'territory', 'chile_communes_master_v1.csv');
const SOURCE_LABEL = 'CUT-2018';
const UPDATED_AT = '2018-09-06T00:00:00.000Z';

function escapeCsvField (value) {
  const s = String(value ?? '').trim();
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function padRegion (regionId) {
  const n = parseInt(regionId, 10);
  return n >= 1 && n <= 9 ? '0' + n : String(n);
}

async function fetchBdcut () {
  try {
    const res = await fetch(BDCUT_CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    console.error('No se pudo descargar bdcut-cl. Usar archivo local si existe.');
    throw e;
  }
}

function parseBdcutCsv (raw) {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('CSV sin datos');
  const header = lines[0].toLowerCase();
  if (!header.includes('comuna_id') || !header.includes('region_id')) throw new Error('Formato bdcut no reconocido');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim());
    if (parts.length >= 6) {
      rows.push({
        communeName: parts[0],
        communeCode: parts[1],
        provinceName: parts[2],
        provinceCode: parts[3],
        regionName: parts[4],
        regionCode: parts[5],
      });
    }
  }
  return rows;
}

function buildMasterCsv (rows) {
  const header = 'regionCode,regionName,provinceCode,provinceName,communeCode,communeName,isActive,source,updatedAt';
  const lines = [header];
  for (const r of rows) {
    const regionCode = padRegion(r.regionCode);
    lines.push([
      escapeCsvField(regionCode),
      escapeCsvField(r.regionName),
      escapeCsvField(r.provinceCode),
      escapeCsvField(r.provinceName),
      escapeCsvField(r.communeCode),
      escapeCsvField(r.communeName),
      'true',
      escapeCsvField(SOURCE_LABEL),
      escapeCsvField(UPDATED_AT),
    ].join(','));
  }
  return lines.join('\n');
}

async function main () {
  let raw;
  const localPath = path.join(__dirname, '..', 'data', 'territory', 'bdcut_source.csv');
  if (fs.existsSync(localPath)) {
    raw = fs.readFileSync(localPath, 'utf8');
  } else {
    raw = await fetchBdcut();
  }
  const rows = parseBdcutCsv(raw);
  const csv = buildMasterCsv(rows);
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, '\uFEFF' + csv, 'utf8'); // BOM para Excel
  console.log('Escrito:', OUT_PATH);
  console.log('Total comunas:', rows.length);
  if (rows.length !== 346) {
    console.warn('Advertencia: se esperaban 346 comunas. Ver validación.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
