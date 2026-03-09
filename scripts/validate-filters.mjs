#!/usr/bin/env node
/**
 * SCCE – Validación semi-automática de coherencia de filtros
 * - Fuente: API GET /cases (sin filtros)
 * - Reproduce lógica de front: region + commune + local + criticality + status(normalizeStatus)
 *
 * Uso:
 *   node scripts/validate-filters.mjs --base http://localhost:3000 --token <JWT>
 *
 * Opcional:
 *   --out out/validate-filters
 *   --membership-id <id>  (envía x-scce-membership-id para reproducir vista DR)
 */

import fs from "node:fs";
import path from "node:path";

function arg(name, def = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return def;
  return process.argv[i + 1] ?? def;
}

const BASE = arg("--base", "http://localhost:3000");
const TOKEN = arg("--token", process.env.SCCE_TOKEN ?? null);
const OUT_DIR = arg("--out", "out/validate-filters");
const MEMBERSHIP_ID = arg("--membership-id", null);

if (!TOKEN) {
  console.error(
    "Falta token. Usa --token <JWT> o define SCCE_TOKEN en el entorno."
  );
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function normCriticality(v) {
  const s = safeStr(v).trim().toUpperCase();
  if (["CRITICA", "ALTA", "MEDIA", "BAJA"].includes(s)) return s;
  return s ? `UNKNOWN(${s})` : "MISSING";
}

/**
 * Normalización de estado según tu descripción:
 * DB/API guarda en inglés (y algunos tokens mixtos), UI muestra en español.
 * Ajusta aquí si tu App.tsx tiene reglas adicionales.
 */
function normalizeStatus(dbStatus) {
  const s = safeStr(dbStatus).trim().toUpperCase();
  if (!s) return "MISSING";

  const map = {
    DETECTED: "Nuevo",
    OPEN: "Nuevo",
    RECEPCIONADO: "Recepcionado por DR",
    IN_MANAGEMENT: "En gestión",
    ESCALATED: "Escalado",
    MITIGATED: "Mitigado",
    RESOLVED: "Resuelto",
    CLOSED: "Cerrado",
  };

  return map[s] ?? `UNKNOWN(${s})`;
}

/**
 * "Comuna efectiva" – aquí asumimos que tu front ya usa getCaseCommuneCode.
 * Como no podemos importar TS del front sin tooling, replicamos el criterio mínimo:
 * 1) case.communeCode si viene usable
 * 2) case.localSnapshot?.communeCode (si existe) como fallback
 */
function getCommuneEffective(c) {
  const col = safeStr(c?.communeCode).trim().toUpperCase();
  if (col) return col;

  const snap = c?.localSnapshot;
  const snapCommune =
    safeStr(snap?.communeCode ?? snap?.commune ?? snap?.commune_code)
      .trim()
      .toUpperCase();

  if (snapCommune) return `SNAP:${snapCommune}`;
  return "MISSING";
}

/**
 * Local efectivo – mismo enfoque: columna y fallback snapshot
 */
function getLocalEffective(c) {
  const col = safeStr(c?.localCode).trim().toUpperCase();
  if (col) return col;

  const snap = c?.localSnapshot;
  const snapLocal =
    safeStr(snap?.localCode ?? snap?.local ?? snap?.local_code)
      .trim()
      .toUpperCase();

  if (snapLocal) return `SNAP:${snapLocal}`;
  return "MISSING";
}

function getRegionEffective(c) {
  const col = safeStr(c?.regionCode).trim().toUpperCase();
  if (col) return col;

  const snap = c?.localSnapshot;
  const snapRegion =
    safeStr(snap?.regionCode ?? snap?.region ?? snap?.region_code)
      .trim()
      .toUpperCase();

  if (snapRegion) return `SNAP:${snapRegion}`;
  return "MISSING";
}

function countBy(items, keyFn) {
  const m = new Map();
  for (const it of items) {
    const k = keyFn(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function mapToObj(m) {
  const o = {};
  for (const [k, v] of m.entries()) o[k] = v;
  return o;
}

async function fetchJson(url, extraHeaders = {}) {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (MEMBERSHIP_ID) headers["x-scce-membership-id"] = MEMBERSHIP_ID;
  const r = await fetch(url, { headers });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} al GET ${url}\n${t}`);
  }
  return r.json();
}

function topIds(cases, n = 10) {
  return cases.slice(0, n).map((c) => c.id);
}

function printSmallTable(rows) {
  // tabla simple sin dependencias
  const cols = Object.keys(rows[0] ?? {});
  const widths = cols.map((c) =>
    Math.max(
      c.length,
      ...rows.map((r) => safeStr(r[c]).length)
    )
  );
  const line = (vals) =>
    vals
      .map((v, i) => safeStr(v).padEnd(widths[i], " "))
      .join(" | ");
  console.log(line(cols));
  console.log(widths.map((w) => "-".repeat(w)).join("-|-"));
  for (const r of rows) console.log(line(cols.map((c) => r[c])));
}

(async function main() {
  const cases = await fetchJson(`${BASE}/cases`);

  if (!Array.isArray(cases)) {
    throw new Error("Respuesta /cases no es un array. Revisa la API.");
  }

  // Enriquecemos con "efectivos" para auditar
  const enriched = cases.map((c) => {
    const regionEff = getRegionEffective(c);
    const communeEff = getCommuneEffective(c);
    const localEff = getLocalEffective(c);
    const criticalityEff = normCriticality(c?.criticality);
    const statusUi = normalizeStatus(c?.status);

    return {
      raw: c,
      id: c?.id,
      regionEff,
      communeEff,
      localEff,
      criticalityEff,
      statusUi,
      statusRaw: safeStr(c?.status).trim().toUpperCase() || "MISSING",
      criticalityRaw: safeStr(c?.criticality).trim().toUpperCase() || "MISSING",
    };
  });

  // 1) Resumen global de "perdidos" (campos faltantes o unknown)
  const missing = {
    region: enriched.filter((x) => x.regionEff === "MISSING"),
    commune: enriched.filter((x) => x.communeEff === "MISSING"),
    local: enriched.filter((x) => x.localEff === "MISSING"),
    criticality: enriched.filter((x) => x.criticalityEff.startsWith("UNKNOWN(") || x.criticalityEff === "MISSING"),
    status: enriched.filter((x) => x.statusUi.startsWith("UNKNOWN(") || x.statusUi === "MISSING"),
  };

  const globalRows = [
    { check: "MISSING region", count: missing.region.length, sampleIds: topIds(missing.region) },
    { check: "MISSING commune", count: missing.commune.length, sampleIds: topIds(missing.commune) },
    { check: "MISSING local", count: missing.local.length, sampleIds: topIds(missing.local) },
    { check: "UNKNOWN/MISSING criticality", count: missing.criticality.length, sampleIds: topIds(missing.criticality) },
    { check: "UNKNOWN/MISSING status", count: missing.status.length, sampleIds: topIds(missing.status) },
  ];

  console.log("\n=== RESUMEN GLOBAL ===");
  printSmallTable(globalRows);

  // 2) Auditoría por región: coherencia de distribución por comuna y cruce con criticidad/estado
  const byRegion = countBy(enriched, (x) => x.regionEff);

  const regionReports = [];
  const mismatches = [];

  for (const [regionCode] of byRegion.entries()) {
    const regionCases = enriched.filter((x) => x.regionEff === regionCode);

    // Distribución por comuna (lo que debería sumar el total, salvo comuna MISSING)
    const byCommune = countBy(regionCases, (x) => x.communeEff);
    const sumKnownCommunes = Array.from(byCommune.entries())
      .filter(([k]) => k !== "MISSING")
      .reduce((acc, [, v]) => acc + v, 0);

    const total = regionCases.length;
    const missingCommuneCount = byCommune.get("MISSING") ?? 0;

    // Esto detecta exactamente el síntoma: total != suma comunas conocidas + missing
    const sumAll = sumKnownCommunes + missingCommuneCount;
    const okCommunePartition = sumAll === total;

    // Cruce: comuna × criticidad × estado (para encontrar los casos "fantasma")
    const key3 = (x) => `${x.communeEff} | ${x.criticalityEff} | ${x.statusUi}`;
    const byCommuneCritStatus = countBy(regionCases, key3);

    regionReports.push({
      region: regionCode,
      total,
      communesDistinct: byCommune.size,
      missingCommune: missingCommuneCount,
      communePartitionOK: okCommunePartition ? "OK" : "FAIL",
    });

    if (!okCommunePartition) {
      mismatches.push({
        type: "COMMUNE_PARTITION_FAIL",
        region: regionCode,
        total,
        sumAll,
        missingCommuneCount,
        sampleIds: topIds(regionCases.filter((x) => x.communeEff === "MISSING")),
      });
    }

    // Detecta casos con "SNAP:" (indica inconsistencia: columna vacía y snapshot trae algo)
    const snapFallback = regionCases.filter((x) => x.communeEff.startsWith("SNAP:") || x.localEff.startsWith("SNAP:") || x.regionEff.startsWith("SNAP:"));
    if (snapFallback.length) {
      mismatches.push({
        type: "SNAP_FALLBACK_USED",
        region: regionCode,
        count: snapFallback.length,
        sample: snapFallback.slice(0, 10).map((x) => ({
          id: x.id,
          regionEff: x.regionEff,
          communeEff: x.communeEff,
          localEff: x.localEff,
          regionRaw: safeStr(x.raw?.regionCode),
          communeRaw: safeStr(x.raw?.communeCode),
          localRaw: safeStr(x.raw?.localCode),
        })),
      });
    }

    // Detecta estados/criticidades fuera del set esperado (UNKNOWN)
    const unknownStatus = regionCases.filter((x) => x.statusUi.startsWith("UNKNOWN("));
    if (unknownStatus.length) {
      mismatches.push({
        type: "UNKNOWN_STATUS",
        region: regionCode,
        count: unknownStatus.length,
        sample: unknownStatus.slice(0, 10).map((x) => ({ id: x.id, statusRaw: x.statusRaw, statusUi: x.statusUi })),
      });
    }
    const unknownCrit = regionCases.filter((x) => x.criticalityEff.startsWith("UNKNOWN("));
    if (unknownCrit.length) {
      mismatches.push({
        type: "UNKNOWN_CRITICALITY",
        region: regionCode,
        count: unknownCrit.length,
        sample: unknownCrit.slice(0, 10).map((x) => ({ id: x.id, criticalityRaw: x.criticalityRaw, criticalityEff: x.criticalityEff })),
      });
    }

    // Guardamos distribución (útil para comparar con lo que ves en UI)
    const dist = {
      region: regionCode,
      total,
      byCommune: mapToObj(byCommune),
      byCriticality: mapToObj(countBy(regionCases, (x) => x.criticalityEff)),
      byStatusUi: mapToObj(countBy(regionCases, (x) => x.statusUi)),
      byCommuneCritStatus: mapToObj(byCommuneCritStatus),
    };

    fs.writeFileSync(
      path.join(OUT_DIR, `dist_${regionCode.replace(/[^A-Z0-9:_-]/g, "_")}.json`),
      JSON.stringify(dist, null, 2),
      "utf-8"
    );
  }

  console.log("\n=== REPORTE POR REGIÓN ===");
  regionReports.sort((a, b) => safeStr(a.region).localeCompare(safeStr(b.region)));
  printSmallTable(regionReports);

  const out = {
    meta: { base: BASE, fetched: enriched.length, outDir: OUT_DIR, membershipId: MEMBERSHIP_ID ?? null, ts: new Date().toISOString() },
    globalRows,
    regionReports,
    mismatches,
  };

  const outFile = path.join(OUT_DIR, "mismatches.json");
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2), "utf-8");

  console.log(`\nListo. Detalle en: ${outFile}`);
  console.log("Si ves COMMUNE_PARTITION_FAIL, ese es el equivalente exacto a: total 3 → comunas 1+1.");
})().catch((e) => {
  console.error("\nERROR:", e?.message ?? e);
  process.exit(1);
});
