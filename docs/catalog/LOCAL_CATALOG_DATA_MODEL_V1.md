# Catálogo de locales — Modelo de datos v1

**Diseño de entidades mínimo.** Sin implementación en código. Traduce el modelo funcional (LOCAL_CATALOG_VERSIONING_V1.md) en estructura lista para implementación segura.

**Fecha:** 2026-03-08  
**Estado:** Borrador. No obliga a migraciones hasta que se decida implementar.

---

## Entidad: Catalog

Representa una versión del conjunto de locales (catálogo) con proceso, modo, tipo, fuente y vigencia.

| Atributo      | Tipo     | Obligatorio | Descripción |
|---------------|----------|-------------|-------------|
| id            | string   | Sí          | Identificador único del catálogo (ej. CUID/UUID). |
| name          | string   | Sí          | Nombre descriptivo (ej. "Definitivo 2026", "Histórico 2024", "Simulado base"). |
| processId     | string   | No*         | Id del proceso electoral al que pertenece. |
| processCode   | string   | No*         | Código del proceso (ej. año, "2026", "ELE-2026"). *Al menos uno de processId o processCode. |
| mode          | enum     | Sí          | OPERACION \| SIMULACION. Modo de uso para el que aplica este catálogo. |
| catalogType   | enum     | Sí          | PRELIMINAR \| DEFINITIVO \| SIMULATED_BASE \| HISTORICAL. Tipo de catálogo. |
| source        | enum     | Sí          | OFFICIAL \| SIMULATED \| HISTORICAL \| MANUAL. Origen del catálogo. |
| status        | enum     | Sí          | DRAFT \| PUBLISHED \| ARCHIVED. Estado en el ciclo de vida. |
| validFrom     | datetime | No          | Vigencia desde (inclusive). |
| validTo       | datetime | No          | Vigencia hasta (inclusive). |
| regionScope   | string[] | No          | Regiones a las que aplica; vacío = todas. Alcance regional opcional. |
| isActive      | boolean  | Sí          | Si está disponible para ser elegido como catálogo activo en su contexto. |
| createdAt     | datetime | Sí          | Fecha de creación. |
| updatedAt     | datetime | Sí          | Fecha de última actualización. |

**Dominios sugeridos (enums):**

- **mode:** `OPERACION` \| `SIMULACION`
- **catalogType:** `PRELIMINAR` \| `DEFINITIVO` \| `SIMULATED_BASE` \| `HISTORICAL`
- **source:** `OFFICIAL` \| `SIMULATED` \| `HISTORICAL` \| `MANUAL`
- **status:** `DRAFT` \| `PUBLISHED` \| `ARCHIVED`

---

## Entidad: CatalogLocal

Representa un local (o inmueble elegible) dentro de un catálogo. Un mismo espacio físico puede aparecer en varios catálogos con distintos `condition`.

| Atributo      | Tipo     | Obligatorio | Descripción |
|---------------|----------|-------------|-------------|
| id            | string   | Sí          | Identificador único del registro (ej. CUID/UUID). |
| catalogId     | string   | Sí          | FK a Catalog. Catálogo al que pertenece este local. |
| regionCode    | string   | Sí          | Código de región. |
| communeCode   | string   | Sí          | Código de comuna. |
| localCode     | string   | Sí          | Código del local dentro de la comuna (identificador estable del local). |
| localName     | string   | Sí          | Nombre del local. |
| address       | string   | No          | Dirección. |
| localCategory | string   | No          | Categoría/tipo de local (ej. colegio, sede, etc.). |
| condition     | enum     | Sí          | ELEGIBLE \| PRELIMINAR \| DEFINITIVO. Estado del local en este catálogo. |
| metadataJson  | json     | No          | Metadatos adicionales (flexible). |
| createdAt     | datetime | Sí          | Fecha de creación. |
| updatedAt     | datetime | Sí          | Fecha de última actualización. |

**Dominio condition:** `ELEGIBLE` \| `PRELIMINAR` \| `DEFINITIVO`

- **ELEGIBLE:** inmueble candidato (catálogo preliminar).
- **PRELIMINAR:** local propuesto en evaluación.
- **DEFINITIVO:** local confirmado vigente para la elección.

---

## Llaves y unicidad

### Catalog

- **PK:** `id`.

### CatalogLocal

- **PK:** `id`.
- **Unicidad dentro de un catálogo:** un mismo local lógico no puede repetirse en el mismo catálogo.

**Constraint de unicidad recomendado:**

- `UNIQUE (catalogId, regionCode, communeCode, localCode)`

Así, la combinación **catalogId + regionCode + communeCode + localCode** identifica de forma única un local dentro de un catálogo. Un mismo `regionCode + communeCode + localCode` puede existir en varios catálogos (distintos `catalogId`) con el mismo o distinto `condition`.

---

## Reglas mínimas de negocio

1. **Un caso no guarda el catálogo completo.**  
   El caso guarda referencia al local resuelto contra el catálogo activo en el momento de la operación (ej. `catalogId` + `catalogLocalId`, o snapshot del local con `catalogId` para trazabilidad). No se duplica el catálogo en el caso.

2. **OPERACION solo puede apuntar a catálogo oficial activo.**  
   En modo OPERACION, el catálogo activo debe ser aquel que cumpla: `mode = OPERACION`, `source = OFFICIAL`, `status` adecuado (ej. PUBLISHED), `isActive = true`, y corresponder al proceso electoral activo. No se usa en OPERACION un catálogo con `source = SIMULATED` ni `source = HISTORICAL`.

3. **SIMULACION puede apuntar a simulado, histórico o copia controlada.**  
   En modo SIMULACION, el catálogo activo puede ser: `source = SIMULATED` (base o copia), `source = HISTORICAL`, o una copia controlada de oficial marcada como tal. Nunca se usa en SIMULACION para modificar el catálogo oficial vigente de OPERACION.

4. **Nunca mezclar locales de dos catálogos activos en el mismo contexto.**  
   En un mismo contexto (una sesión, un proceso, un modo), solo hay **un** catálogo activo. Todas las resoluciones de local (crear caso, validar, listar opciones) se hacen contra ese único catálogo. No se combinan ni filtran locales de dos catálogos distintos en la misma operación.

---

## Relación con casos (referencia, no duplicación)

- Al crear o actualizar un caso que asocia un local, el sistema:
  - Resuelve el local contra el **catálogo activo** del contexto actual.
  - Guarda en el caso una **referencia** al local en ese catálogo (ej. `catalogId`, `catalogLocalId`, o identificador estable `regionCode + communeCode + localCode` + `catalogId` para trazabilidad).
- Opcional: snapshot mínimo del local en el caso (nombre, dirección) para lectura histórica, pero la fuente de verdad del conjunto de locales es el catálogo versionado.

---

## Resumen

| Elemento        | Definición |
|-----------------|------------|
| **Catalog**     | Entidad con id, name, processId/processCode, mode, catalogType, source, status, validFrom/To, regionScope, isActive, createdAt, updatedAt. |
| **CatalogLocal** | Entidad con id, catalogId, regionCode, communeCode, localCode, localName, address, localCategory, condition, metadataJson, createdAt, updatedAt. |
| **Unicidad local** | `(catalogId, regionCode, communeCode, localCode)` único. |
| **Reglas**      | Caso referencia local del catálogo activo; OPERACION → solo oficial activo; SIMULACION → simulado/histórico/copia; un solo catálogo activo por contexto. |

Este documento cierra el modelo mínimo de entidades y reglas para implementación futura sin tocar código ni forzar migraciones hasta que se decida el momento de implementar.
