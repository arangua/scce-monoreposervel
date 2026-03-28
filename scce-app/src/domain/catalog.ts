/**
 * catalog.ts
 * Catálogo territorial SCCE.
 *
 * ARQUITECTURA DE DOS CAPAS:
 *
 * Capa 1 — División Político-Administrativa (permanente):
 *   Fuente: chile_dpa.ts → 16 regiones, 56 provincias, 346 comunas oficiales.
 *   No cambia salvo reforma legal. No depende de ninguna elección.
 *
 * Capa 2 — Locales de votación (variable por elección):
 *   Se carga desde Excel antes de cada proceso electoral.
 *   Dos catálogos independientes:
 *     - catalogoEleccion: locales habilitados para la elección activa
 *     - catalogoSimulacion: locales históricos para el modo simulación
 *   Mientras no se cargue un Excel, el sistema usa locales de ejemplo
 *   derivados de la DPA para no bloquear el desarrollo.
 */

import type { CommuneCode, LocalCatalog, LocalCatalogEntry, RegionCode } from "./types";
import { CHILE_DPA } from "./chile_dpa";

// ── Re-exportar DPA para compatibilidad con código existente ──────────────────
export { CHILE_DPA };

// ── CONFIG_REGIONS: estructura compatible con el código existente ─────────────
// Mapea la DPA oficial al formato que usan los componentes de UI actuales.
// Los locales se dejan vacíos — se cargan desde Excel.

type RegionConfig = {
  name: string;
  communes: Record<string, { name: string; locals: string[] }>;
  contacts?: { JE: string; FUERZA: string };
};

export const CONFIG_REGIONS: Record<string, RegionConfig> = Object.fromEntries(
  CHILE_DPA.map(region => [
    region.codigo,
    {
      name: region.nombre,
      communes: Object.fromEntries(
        region.provincias.flatMap(prov =>
          prov.comunas.map(comuna => [
            comuna.codigo,
            {
              name: comuna.nombre,
              locals: [],  // Se carga desde Excel — ver CatalogView
            }
          ])
        )
      ),
      contacts: {
        JE: `Junta Electoral ${region.nombre}`,
        FUERZA: `FF.AA. Zona ${region.nombre}`,
      },
    }
  ])
);

// ── Generador de IDs de local ─────────────────────────────────────────────────
let _localSeq = 0;

export function newLocalId(): string {
  return `LOC-${String(++_localSeq).padStart(4, "0")}`;
}

// ── buildCatalogSeed ──────────────────────────────────────────────────────────
// Genera un catálogo base vacío (sin locales).
// Los locales reales se cargan desde Excel vía importarLocalesDesdeExcel().
// Para desarrollo/demo, usa buildCatalogDemo() que incluye locales ficticios.

export function buildCatalogSeed(): LocalCatalog {
  // Catálogo vacío — sin locales de votación
  // Usar buildCatalogDemo() para desarrollo o importarLocalesDesdeExcel() para producción
  return [];
}

/**
 * Catálogo de demostración para desarrollo.
 * Incluye locales ficticios para Tarapacá (región donde opera SERVEL Tarapacá).
 * En producción debe reemplazarse con el Excel oficial de SERVEL.
 */
export function buildCatalogDemo(): LocalCatalog {
  const now = new Date().toISOString();
  const localesDemo: Array<{
    idLocal: string;
    nombre: string;
    region: string;
    commune: string;
  }> = [
    // Iquique
    { idLocal: "01101-001", nombre: "Liceo Arturo Pérez Canto", region: "01", commune: "01101" },
    { idLocal: "01101-002", nombre: "Escuela Alemania", region: "01", commune: "01101" },
    { idLocal: "01101-003", nombre: "Colegio Baquedano", region: "01", commune: "01101" },
    { idLocal: "01101-004", nombre: "Escuela España", region: "01", commune: "01101" },
    // Alto Hospicio
    { idLocal: "01107-001", nombre: "Liceo Altiplano", region: "01", commune: "01107" },
    { idLocal: "01107-002", nombre: "Escuela Pudeto", region: "01", commune: "01107" },
    { idLocal: "01107-003", nombre: "Escuela Los Arenales", region: "01", commune: "01107" },
    // Pozo Almonte
    { idLocal: "01401-001", nombre: "Escuela Arturo Prat", region: "01", commune: "01401" },
    { idLocal: "01401-002", nombre: "Liceo Tarapacá", region: "01", commune: "01401" },
    // Camiña
    { idLocal: "01402-001", nombre: "Escuela Camiña", region: "01", commune: "01402" },
    // Colchane
    { idLocal: "01403-001", nombre: "Escuela Colchane", region: "01", commune: "01403" },
    // Huara
    { idLocal: "01404-001", nombre: "Escuela Huara", region: "01", commune: "01404" },
    // Pica
    { idLocal: "01405-001", nombre: "Escuela Pica", region: "01", commune: "01405" },
  ];

  return localesDemo.map(l => ({
    idLocal: l.idLocal,
    nombre: l.nombre,
    region: l.region,
    commune: l.commune,
    activoGlobal: true,
    activoEnEleccionActual: true,
    fechaCreacion: now,
    fechaDesactivacion: null,
    origenSeed: true,
  }));
}

// ── importarLocalesDesdeExcel ─────────────────────────────────────────────────
/**
 * Convierte filas de Excel al formato LocalCatalog del SCCE.
 *
 * Columnas esperadas en el Excel (nombres flexibles, se detectan por similitud):
 *   - Región o Código Región (ej: "01", "Tarapacá")
 *   - Comuna o Código Comuna (ej: "01101", "Iquique")
 *   - Nombre local o Local de votación
 *   - ID Local (opcional — se genera si no existe)
 *   - Dirección (opcional)
 *   - Mesas (opcional)
 *
 * Ejemplo de fila:
 *   { "Código Región": "01", "Código Comuna": "01101",
 *     "Nombre Local": "Liceo Arturo Pérez Canto", "ID": "01101-001" }
 */
export type ExcelRow = Record<string, string | number | null | undefined>;

export type ImportarLocalesResult = {
  catalog: LocalCatalog;
  errores: string[];
  advertencias: string[];
  totalImportados: number;
  totalDescartados: number;
};

export function importarLocalesDesdeExcel(
  filas: ExcelRow[],
  modo: "eleccion" | "simulacion" = "eleccion"
): ImportarLocalesResult {
  const errores: string[] = [];
  const advertencias: string[] = [];
  const catalog: LocalCatalog = [];
  const now = new Date().toISOString();
  let totalDescartados = 0;

  // Construir índice de comunas válidas para validación rápida
  const comunasValidas = new Set<string>();
  const comunasPorNombre = new Map<string, string>(); // nombre → código
  CHILE_DPA.forEach(r => {
    r.provincias.forEach(p => {
      p.comunas.forEach(c => {
        comunasValidas.add(c.codigo);
        comunasPorNombre.set(c.nombre.toLowerCase(), c.codigo);
      });
    });
  });

  const regionesPorNombre = new Map<string, string>();
  CHILE_DPA.forEach(r => {
    regionesPorNombre.set(r.nombre.toLowerCase(), r.codigo);
    regionesPorNombre.set(r.ordinal.toLowerCase(), r.codigo);
  });

  // Detectar nombres de columnas (flexible)
  const normalize = (s: string) => s.toLowerCase().replace(/[_\s-]/g, "");
  const detectCol = (row: ExcelRow, candidates: string[]): string | undefined =>
    Object.keys(row).find(k => candidates.some(c => normalize(k).includes(normalize(c))));

  if (filas.length === 0) {
    errores.push("El archivo Excel está vacío o no tiene filas de datos.");
    return { catalog, errores, advertencias, totalImportados: 0, totalDescartados: 0 };
  }

  const sampleRow = filas[0];
  const colRegion   = detectCol(sampleRow, ["codigoregion", "region", "codregion", "reg"]);
  const colComuna   = detectCol(sampleRow, ["codigocomuna", "comuna", "codcomuna", "com"]);
  const colNombre   = detectCol(sampleRow, ["nombrelocal", "local", "nombre", "establecimiento"]);
  const colId       = detectCol(sampleRow, ["idlocal", "id", "codigo", "codlocal"]);

  if (!colNombre) {
    errores.push("No se encontró columna de nombre del local. Se esperaba: 'Nombre local', 'Local', 'Establecimiento'.");
    return { catalog, errores, advertencias, totalImportados: 0, totalDescartados: filas.length };
  }
  if (!colComuna) {
    errores.push("No se encontró columna de comuna. Se esperaba: 'Comuna', 'Código Comuna', 'CodComuna'.");
    return { catalog, errores, advertencias, totalImportados: 0, totalDescartados: filas.length };
  }

  let seq = 1;
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const numFila = i + 2; // +2 por encabezado + base 1

    const nombreRaw = String(fila[colNombre!] ?? "").trim();
    const comunaRaw = String(fila[colComuna!] ?? "").trim();
    const regionRaw = colRegion ? String(fila[colRegion] ?? "").trim() : "";
    const idRaw     = colId ? String(fila[colId] ?? "").trim() : "";

    if (!nombreRaw) {
      advertencias.push(`Fila ${numFila}: sin nombre de local, se omite.`);
      totalDescartados++;
      continue;
    }
    if (!comunaRaw) {
      advertencias.push(`Fila ${numFila}: "${nombreRaw}" — sin código de comuna, se omite.`);
      totalDescartados++;
      continue;
    }

    // Resolver código de comuna
    let codigoComuna = comunaRaw;
    if (!comunasValidas.has(comunaRaw)) {
      // Intentar por nombre
      const porNombre = comunasPorNombre.get(comunaRaw.toLowerCase());
      if (porNombre) {
        codigoComuna = porNombre;
      } else {
        advertencias.push(`Fila ${numFila}: "${nombreRaw}" — comuna "${comunaRaw}" no reconocida en la DPA oficial.`);
        totalDescartados++;
        continue;
      }
    }

    // Derivar región del código de comuna (primeros 2 dígitos)
    const codigoRegion = codigoComuna.slice(0, 2);

    // ID del local
    const idLocal = idRaw || `${codigoComuna}-${String(seq).padStart(3, "0")}`;
    seq++;

    catalog.push({
      idLocal,
      nombre: nombreRaw,
      region: codigoRegion,
      commune: codigoComuna,
      activoGlobal: true,
      activoEnEleccionActual: modo === "eleccion",
      fechaCreacion: now,
      fechaDesactivacion: null,
      origenSeed: false,
    });
  }

  return {
    catalog,
    errores,
    advertencias,
    totalImportados: catalog.length,
    totalDescartados,
  };
}

// ── Helpers de catálogo ───────────────────────────────────────────────────────

export function getActiveLocals(
  catalog: LocalCatalog,
  region: RegionCode,
  commune: CommuneCode
): LocalCatalog {
  return catalog.filter(
    (l: LocalCatalogEntry) =>
      l.region === region &&
      l.commune === commune &&
      l.activoGlobal &&
      l.activoEnEleccionActual
  );
}

export function catalogSelfCheck(catalog: LocalCatalog): string[] {
  const v: string[] = [];
  catalog.forEach((l: LocalCatalogEntry) => {
    if (!l.activoGlobal && l.activoEnEleccionActual)
      v.push(`[INV-1] "${l.nombre}" (${l.idLocal}): desactivado globalmente pero activo en elección.`);
    if (l.fechaDesactivacion && l.activoGlobal)
      v.push(`[INV-2] "${l.nombre}" (${l.idLocal}): tiene fechaDesactivacion pero activoGlobal=true.`);
  });
  return v;
}

export function findActiveLocal(
  catalog: LocalCatalog,
  region: RegionCode,
  commune: CommuneCode,
  nombre: string
): LocalCatalogEntry | null {
  return (
    catalog.find(
      (l: LocalCatalogEntry) =>
        l.region === region &&
        l.commune === commune &&
        l.nombre === nombre &&
        l.activoGlobal &&
        l.activoEnEleccionActual
    ) || null
  );
}
