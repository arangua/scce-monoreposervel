// src/domain/catalog.ts
// Extraído progresivamente de App.tsx (R-1/R-2 refactor).
import type { CommuneCode, LocalCatalog, LocalCatalogEntry, RegionCode } from "./types";

// ─── Catálogo de regiones/comunas/locales (CONFIG) ───────────────────────────
// Fuente de verdad del catálogo semilla SERVEL Chile.

export const CONFIG_REGIONS = {
  AYP:{name:"Arica y Parinacota",communes:{ARI:{name:"Arica",locals:["Liceo Arturo Prat Chácon"]},CAM:{name:"Camarones",locals:["Escuela Camarones"]},PUR:{name:"Putre",locals:["Escuela Putre"]},GEL:{name:"General Lagos",locals:["Escuela General Lagos"]}},contacts:{JE:"Junta Electoral AYP",FUERZA:"FF.AA. Zona Arica"}},
  TRP:{name:"Tarapacá",communes:{IQQ:{name:"Iquique",locals:["Liceo Arturo Pérez Canto","Escuela Alemania","Colegio Baquedano","Escuela España"]},ALH:{name:"Alto Hospicio",locals:["Liceo Altiplano","Escuela Pudeto","Escuela Los Arenales"]},PCA:{name:"Pozo Almonte",locals:["Escuela Arturo Prat","Liceo Tarapacá"]},CAM:{name:"Camiña",locals:["Escuela Camiña"]},COL:{name:"Colchane",locals:["Escuela Colchane"]},HUA:{name:"Huara",locals:["Escuela Huara"]},PIC:{name:"Pica",locals:["Escuela Pica"]}},contacts:{JE:"Junta Electoral Tarapacá",FUERZA:"FF.AA. Zona Tarapacá"}},
  ANT:{name:"Antofagasta",communes:{ANT:{name:"Antofagasta",locals:["Liceo Politécnico","Escuela República de Colombia"]},CAL:{name:"Calama",locals:["Liceo Industrial","Escuela El Cobre"]},SPA:{name:"San Pedro de Atacama",locals:["Escuela San Pedro"]}},contacts:{JE:"Junta Electoral Antofagasta",FUERZA:"FF.AA. Zona Antofagasta"}},
  ATA:{name:"Atacama",communes:{COP:{name:"Copiapó",locals:["Liceo de Hombres Copiapó"]},VAL:{name:"Vallenar",locals:["Escuela Vallenar"]}},contacts:{JE:"Junta Electoral Atacama",FUERZA:"FF.AA. Zona Atacama"}},
  COQ:{name:"Coquimbo",communes:{LSR:{name:"La Serena",locals:["Liceo Gregorio Cordovez"]},COQ:{name:"Coquimbo",locals:["Escuela Gabriela Mistral"]},OVA:{name:"Ovalle",locals:["Escuela Ovalle"]}},contacts:{JE:"Junta Electoral Coquimbo",FUERZA:"FF.AA. Zona Coquimbo"}},
  VAL:{name:"Valparaíso",communes:{VLP:{name:"Valparaíso",locals:["Liceo Eduardo de la Barra"]},VIN:{name:"Viña del Mar",locals:["Liceo Juanita Fernández"]},SAN:{name:"San Antonio",locals:["Escuela San Antonio"]},SAF:{name:"San Felipe",locals:["Escuela San Felipe"]}},contacts:{JE:"Junta Electoral Valparaíso",FUERZA:"FF.AA. Zona Valparaíso"}},
  OHI:{name:"O'Higgins",communes:{RAN:{name:"Rancagua",locals:["Liceo Oscar Castro"]},SFN:{name:"San Fernando",locals:["Escuela San Fernando"]}},contacts:{JE:"Junta Electoral O'Higgins",FUERZA:"FF.AA. Zona O'Higgins"}},
  MAU:{name:"Maule",communes:{TAL:{name:"Talca",locals:["Liceo Abate Molina"]},LIN:{name:"Linares",locals:["Escuela Linares"]}},contacts:{JE:"Junta Electoral Maule",FUERZA:"FF.AA. Zona Maule"}},
  NUB:{name:"Ñuble",communes:{CHI:{name:"Chillán",locals:["Liceo Marta Brunet"]}},contacts:{JE:"Junta Electoral Ñuble",FUERZA:"FF.AA. Zona Ñuble"}},
  BIO:{name:"Biobío",communes:{CON:{name:"Concepción",locals:["Liceo Enrique Molina Garmendia"]},TAL:{name:"Talcahuano",locals:["Escuela Talcahuano"]},LOS:{name:"Los Ángeles",locals:["Escuela Los Ángeles"]}},contacts:{JE:"Junta Electoral Biobío",FUERZA:"FF.AA. Zona Biobío"}},
  ARA:{name:"Araucanía",communes:{TEM:{name:"Temuco",locals:["Liceo Valentín Letelier"]},VLD:{name:"Villarrica",locals:["Escuela Villarrica"]}},contacts:{JE:"Junta Electoral Araucanía",FUERZA:"FF.AA. Zona Araucanía"}},
  LRI:{name:"Los Ríos",communes:{VAL:{name:"Valdivia",locals:["Liceo Diego Portales"]},LAG:{name:"La Unión",locals:["Escuela La Unión"]},LAJ:{name:"Lago Ranco",locals:["Escuela Lago Ranco"]}},contacts:{JE:"Junta Electoral Los Ríos",FUERZA:"FF.AA. Zona Los Ríos"}},
  LLA:{name:"Los Lagos",communes:{PMT:{name:"Puerto Montt",locals:["Liceo Francisco Ramírez"]},ANC:{name:"Ancud",locals:["Liceo Galvarino Riveros"]},CAC:{name:"Castro",locals:["Liceo Carlos Ibáñez del Campo"]}},contacts:{JE:"Junta Electoral Los Lagos",FUERZA:"FF.AA. Zona Los Lagos"}},
  AIS:{name:"Aysén",communes:{COY:{name:"Coyhaique",locals:["Liceo Lorenzo Arenas"]}},contacts:{JE:"Junta Electoral Aysén",FUERZA:"FF.AA. Zona Aysén"}},
  MAG:{name:"Magallanes",communes:{PUN:{name:"Punta Arenas",locals:["Liceo Sara Braun"]},NAT:{name:"Natales",locals:["Escuela Natales"]}},contacts:{JE:"Junta Electoral Magallanes",FUERZA:"FF.AA. Zona Magallanes"}},
  MET:{name:"Metropolitana",communes:{STG:{name:"Santiago",locals:["Liceo Aplicación","Instituto Nacional"]},PUI:{name:"Puente Alto",locals:["Escuela Puente Alto"]},MAL:{name:"Maipú",locals:["Escuela Maipú"]},LAS:{name:"Las Condes",locals:["Escuela Las Condes"]},NUN:{name:"Ñuñoa",locals:["Escuela Ñuñoa"]},SBE:{name:"San Bernardo",locals:["Escuela San Bernardo"]}},contacts:{JE:"Junta Electoral Metropolitana",FUERZA:"FF.AA. Zona Metropolitana"}},
};

// ─── Generador de IDs de local ────────────────────────────────────────────────
let _localSeq = 0;

export function newLocalId(): string {
  return `LOC-${String(++_localSeq).padStart(4, "0")}`;
}

// ─── buildCatalogSeed ─────────────────────────────────────────────────────────
// Genera el catálogo base a partir de CONFIG_REGIONS.
// NOTA: produce IDs secuenciales — llamar solo una vez por sesión.

export function buildCatalogSeed(): LocalCatalog {
  const now = new Date().toISOString();
  const entries: LocalCatalog = [];

  Object.entries(CONFIG_REGIONS).forEach(([rc, rd]) => {
    Object.entries(rd.communes).forEach(([cc, cd]) => {
      (cd.locals || []).forEach((nombre: string) => {
        entries.push({
          idLocal: newLocalId(),
          nombre,
          region: rc,
          commune: cc,
          activoGlobal: true,
          activoEnEleccionActual: true,
          fechaCreacion: now,
          fechaDesactivacion: null,
          origenSeed: true,
        });
      });
    });
  });

  return entries;
}

// ─── Helpers de catálogo ──────────────────────────────────────────────────────

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
