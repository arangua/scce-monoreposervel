# Maestro territorial oficial SCCE — Chile v1

**Definición del maestro territorial base.** Sin carga de datos ni código. Fija la estructura, la fuente oficial y las reglas antes de cargar las 346 comunas y amarrar catálogos de locales.

**Fecha:** 2026-03-08  
**Estado:** Borrador. Base para carga territorial, catálogos y trazabilidad.

---

## 1. Estructura base

El territorio se organiza en tres niveles jerárquicos:

| Nivel | Descripción | Cantidad referencia (Chile) |
|-------|-------------|-----------------------------|
| **Región** | Unidad territorial de primer nivel (ej. Región de Valparaíso). | 16 regiones |
| **Provincia** | Unidad intermedia; pertenece a una sola región. | 56 provincias |
| **Comuna** | Unidad mínima para fines electorales y de catálogo de locales; pertenece a una sola provincia. | 346 comunas |

**Jerarquía:** Región → Provincia → Comuna. No existen comunas “libres” (sin provincia) ni provincias “libres” (sin región).

---

## 2. Fuente oficial de referencia

Se fija **una fuente primaria única** para evitar inconsistencias y mezclas de criterios.

| Opción | Descripción | Decisión |
|--------|-------------|----------|
| **INE (Instituto Nacional de Estadísticas)** | Clasificaciones oficiales, API de codificación, nomenclaturas, portal de mapas. Alineado con Censos y estadísticas nacionales. | **Fuente primaria recomendada.** |
| **CUT / Subdere** | Códigos Únicos Territoriales (Decreto Exento N° 1.115, 2018). Publicación oficial en Subdere. Incluye 16 regiones (Ñuble). | Usar como **referencia legal** de códigos; puede coincidir o derivarse de la misma base que INE. |
| **BCN (Biblioteca del Congreso Nacional)** | División político-administrativa. | **Secundaria** para validación o nombres; no como fuente única de códigos sin regla. |

**Regla cerrada:**

- **Fuente primaria única:** INE (clasificaciones y códigos territoriales oficiales publicados por INE), con alineación explícita a CUT cuando corresponda.
- Si en el futuro se incorporan datos de BCN o Subdere, se hará mediante **mapeo documentado** desde la fuente primaria (ej. tabla de equivalencia INE → CUT) o como capa de validación, **sin mezclar códigos de dos fuentes** en el mismo campo sin regla escrita.

---

## 3. Campos mínimos por comuna

El maestro territorial debe permitir identificar sin ambigüedad cada comuna y su posición en la jerarquía. Campos mínimos:

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| **regionCode** | string | Sí | Código de la región (según fuente oficial). |
| **regionName** | string | Sí | Nombre de la región. |
| **provinceCode** | string | Sí | Código de la provincia (único dentro de la región o global según criterio de códigos). |
| **provinceName** | string | Sí | Nombre de la provincia. |
| **communeCode** | string | Sí | Código de la comuna (único dentro de la provincia o global según criterio). |
| **communeName** | string | Sí | Nombre de la comuna. |
| **isActive** | boolean | Sí | Si la comuna está vigente para uso en catálogos y operación (permite desactivar sin borrar). |
| **source** | string | Sí | Identificador de la fuente del registro (ej. "INE", "CUT-2018") para trazabilidad. |
| **updatedAt** | datetime | Sí | Fecha de última actualización del registro. |

**Observación:** Si el modelo incluye entidades Región y Provincia separadas, cada nivel tendrá sus propios campos (código, nombre, isActive, source, updatedAt); la comuna mantendría al menos provinceCode y regionCode (o FKs) para la jerarquía. La tabla anterior es el **mínimo por fila de comuna** para un maestro plano o para la vista “comuna con contexto regional y provincial”.

---

## 4. Reglas clave

| Regla | Descripción |
|-------|-------------|
| **Una comuna pertenece a una sola provincia** | No existen comunas en más de una provincia. La relación comuna → provincia es N:1. |
| **Una provincia pertenece a una sola región** | La relación provincia → región es N:1. |
| **No se permiten comunas “libres”** | Toda comuna debe tener provincia y región asignadas. No hay comunas sin provincia ni provincias sin región. |
| **Catálogo de locales cuelga de esta estructura** | Los locales (CatalogLocal u equivalente) se asocian a región y comuna (y opcionalmente provincia) usando los mismos códigos o IDs del maestro territorial. No se definen “locales” en territorios que no existan en el maestro. |
| **SIMULACIÓN y OPERACIÓN usan el mismo maestro base** | Salvo que en el futuro se defina una **copia controlada** del maestro (ej. para simulación con territorios históricos), tanto OPERACIÓN como SIMULACIÓN usan el mismo maestro territorial oficial. No se mantienen dos maestros no documentados en paralelo. |

---

## 5. Criterio de códigos

Se deja definido **un solo criterio** para evitar mezclas sin regla.

| Criterio | Descripción | Decisión |
|----------|-------------|----------|
| **Códigos oficiales existentes** | Usar los códigos publicados por la fuente primaria (INE / CUT), sin reasignar. | **Recomendado:** máxima interoperabilidad con datos externos, reportes y normativa. |
| **Códigos internos normalizados** | Definir códigos propios (ej. región 01..16) y mantener tabla de mapeo a códigos oficiales. | Válido si se documenta el mapeo y se usa de forma consistente; no mezclar con oficiales en el mismo campo sin regla. |

**Regla cerrada:**

- **Opción A (recomendada):** SCCE usa **códigos oficiales** de la fuente primaria (INE). regionCode, provinceCode, communeCode son los publicados por INE (o CUT si INE los adopta). No se crean códigos propios para el mismo concepto.
- **Opción B (alternativa):** Si se usan códigos internos, debe existir un **documento de mapeo** (código interno ↔ código oficial) y una única capa que exponga “código oficial” hacia integraciones y reportes. En ningún caso se mezclan en un mismo campo valores “parte oficial, parte interno” sin regla explícita.

**Resumen:** Definir en implementación si SCCE usa solo códigos oficiales (recomendado) o códigos internos con mapeo documentado; en ambos casos, sin mezcla sin regla.

---

## Resumen

| Tema | Decisión |
|------|----------|
| **Estructura** | Región → Provincia → Comuna (3 niveles; 16 regiones, 56 provincias, 346 comunas). |
| **Fuente primaria** | INE; CUT/Subdere como referencia legal; BCN secundaria. Sin mezcla de fuentes en códigos sin mapeo documentado. |
| **Campos mínimos comuna** | regionCode, regionName, provinceCode, provinceName, communeCode, communeName, isActive, source, updatedAt. |
| **Reglas** | Una comuna → una provincia; una provincia → una región; no comunas libres; catálogo de locales cuelga de este maestro; mismo maestro para OPERACIÓN y SIMULACIÓN salvo copia controlada definida. |
| **Códigos** | Preferible códigos oficiales (INE); si se usan internos, mapeo documentado y sin mezcla en un mismo campo. |

Este documento deja fijado el maestro territorial oficial que usará SCCE antes de cargar datos o tocar código, y es la base para cargar las 346 comunas, amarrar catálogos de locales y mantener trazabilidad territorial consistente.
