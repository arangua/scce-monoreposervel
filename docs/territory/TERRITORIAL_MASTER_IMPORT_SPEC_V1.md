# Especificación de importación del maestro territorial v1

**Formato de carga/importación del maestro territorial.** Sin tocar BD productiva ni migraciones. Transforma el diseño de `CHILE_TERRITORIAL_MASTER_V1.md` en una carga ejecutable con validaciones explícitas.

**Fecha:** 2026-03-08  
**Estado:** Borrador. Base para scripts de importación y seed.  
**Referencia:** [CHILE_TERRITORIAL_MASTER_V1.md](./CHILE_TERRITORIAL_MASTER_V1.md)

---

## 1. Formato fuente

El maestro se puede recibir en **un solo formato estándar** para evitar variantes no documentadas.

| Formato | Uso | Regla |
|---------|-----|--------|
| **CSV** | Archivo plano, un registro por línea. Codificación UTF-8. Separador: coma (`,`). Cabecera obligatoria en la primera línea con los nombres de columna exactos. | Formato **recomendado** para edición manual, exportación desde hojas de cálculo y pipelines simples. |
| **JSON** | Array de objetos; un objeto por comuna. | Alternativa para integración con APIs o herramientas que consuman JSON. |

**Regla cerrada:**

- **Un registro por comuna.** No se admiten múltiples filas/objetos por comuna (ej. una fila por “comuna + local”); el archivo maestro contiene solo territorio: regiones, provincias y comunas. En formato “plano por comuna”, cada fila incluye región y provincia de esa comuna.
- El proceso de importación debe aceptar **al menos CSV**; JSON es opcional pero debe respetar la misma estructura de campos.

**Ejemplo cabecera CSV:**

```text
regionCode,regionName,provinceCode,provinceName,communeCode,communeName,isActive,source,updatedAt
```

**Ejemplo objeto JSON (un elemento del array):**

```json
{
  "regionCode": "05",
  "regionName": "Valparaíso",
  "provinceCode": "051",
  "provinceName": "Valparaíso",
  "communeCode": "05101",
  "communeName": "Valparaíso",
  "isActive": true,
  "source": "INE",
  "updatedAt": "2024-01-15T00:00:00.000Z"
}
```

---

## 2. Columnas obligatorias

Todas las columnas (CSV) o propiedades (JSON) siguientes son **obligatorias** por registro. Valores vacíos o ausentes en cualquier campo obligatorio invalidan la fila y deben registrarse en el reporte de validación.

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| **regionCode** | string | Sí | Código de la región (fuente oficial; sin mezcla con códigos internos en el mismo archivo). |
| **regionName** | string | Sí | Nombre de la región. |
| **provinceCode** | string | Sí | Código de la provincia. |
| **provinceName** | string | Sí | Nombre de la provincia. |
| **communeCode** | string | Sí | Código de la comuna (identificador único en el archivo). |
| **communeName** | string | Sí | Nombre de la comuna. |
| **isActive** | boolean | Sí | `true` o `false` (CSV: "true"/"false" o 1/0; JSON: boolean). |
| **source** | string | Sí | Identificador de la fuente (ej. "INE", "CUT-2018"). |
| **updatedAt** | string (datetime) | Sí | Fecha de última actualización (ISO 8601 recomendado, ej. `YYYY-MM-DD` o `YYYY-MM-DDTHH:mm:ss.sssZ`). |

**Orden recomendado en CSV:** el indicado en la tabla (y en la cabecera de ejemplo) para mantener coherencia entre generaciones del archivo.

---

## 3. Validaciones

El proceso de importación debe ejecutar **todas** las validaciones siguientes. Cualquier fallo debe quedar registrado en el reporte de validación; según política del proceso se puede rechazar la carga completa o marcar filas inválidas y continuar solo con las válidas (recomendación: rechazar carga si hay errores de integridad jerárquica o duplicados).

| ID | Validación | Descripción |
|----|------------|-------------|
| V1 | **Sin duplicados de communeCode** | En todo el archivo no puede haber dos registros con el mismo `communeCode`. |
| V2 | **Comuna con provincia válida** | Para cada comuna, debe existir en el archivo al menos una región que contenga una provincia con el mismo `provinceCode` (y esa provincia debe tener el mismo `regionCode` que la comuna). Equivalente: el par (regionCode, provinceCode) de la comuna debe aparecer como contexto de alguna provincia en el archivo (en formato plano, cada fila ya trae región y provincia; validar que provinceCode sea no vacío y que coincida con regionCode). |
| V3 | **Provincia con región válida** | Toda provincia referenciada debe tener un `regionCode` no vacío y consistente: en formato plano, cada fila lleva regionCode y provinceCode; validar que para cada par (regionCode, provinceCode) único, regionCode sea no vacío. |
| V4 | **Total esperado: 346 comunas** | Tras aplicar filtros (ej. solo activos) o sin ellos según regla de negocio: el número total de registros de comuna válidos debe ser **346** (Chile). Si el archivo tiene más o menos, el reporte debe indicarlo; la decisión de aceptar o rechazar la carga queda documentada (ej. “solo carga si total = 346”). |
| V5 | **Tipos y obligatoriedad** | Todos los campos obligatorios presentes y con tipo correcto (string, boolean, datetime); `isActive` interpretable como booleano; `updatedAt` interpretable como fecha. |
| V6 | **Sin mezcla de fuentes en códigos** | Si se define “solo códigos INE” (o solo CUT), todos los códigos deben seguir el mismo criterio; el campo `source` debe ser consistente (un único valor o valores permitidos documentados). |

**Resumen ejecutivo:**

- **No duplicados** de `communeCode`.
- **Toda comuna** con provincia válida (y en formato plano, con región válida).
- **Toda provincia** con región válida.
- **Total:** 346 comunas (configurable como regla estricta o informativa).
- **Tipos y obligatoriedad** correctos; **sin mezcla** de códigos oficiales con internos en el mismo archivo.

---

## 4. Reglas de carga

Orden y criterios con los que el proceso debe tratar los datos **antes** de escribir en BD (o generar seed). No se toca la BD productiva ni migraciones en esta especificación; solo se define cómo debe comportarse el pipeline de importación.

| Regla | Descripción |
|-------|-------------|
| **Orden lógico de carga** | 1) **Primero regiones** (extraer pares únicos `regionCode`, `regionName` y cargar/insertar región). 2) **Luego provincias** (extraer ternas únicas `regionCode`, `provinceCode`, `provinceName`; validar que `regionCode` exista en el paso anterior; cargar provincia). 3) **Por último comunas** (por cada fila, validar que `provinceCode` exista en el contexto de `regionCode`; cargar comuna). |
| **Sin mezclar códigos** | El archivo de entrada debe contener **solo** códigos oficiales (ej. INE) **o** solo códigos internos con mapeo documentado. No mezclar en el mismo archivo códigos de ambas fuentes sin regla. |
| **Idempotencia (recomendado)** | El proceso de carga debería ser idempotente respecto al maestro: volver a ejecutar con el mismo archivo válido no debe duplicar regiones, provincias ni comunas (upsert por código o equivalente). |
| **Trazabilidad** | Conservar en los registros cargados (o en log) el valor de `source` y `updatedAt` del archivo para auditoría. |

**Nota:** Si el modelo de datos es “solo tabla de comunas” (vista plana), el orden de carga puede traducirse en: validar primero que existan 16 regiones únicas y 56 provincias únicas implícitas en el archivo, y luego insertar/actualizar las 346 comunas con sus FKs o códigos de región/provincia.

---

## 5. Salida esperada

Lo que debe producir el proceso de importación cuando se ejecute sobre un archivo fuente válido.

| Salida | Descripción |
|--------|-------------|
| **Archivo maestro limpio listo para seed/import** | Un artefacto (CSV o JSON) que cumple todas las validaciones de este documento y contiene exactamente los registros que se cargarán en BD o seed. Opcionalmente: versión “normalizada” (encoding UTF-8, fechas en ISO 8601, booleanos normalizados, orden de columnas fijo). Este archivo es la **fuente de verdad** para el paso siguiente (script de seed o importación a BD). |
| **Reporte de validación** | Un reporte (texto, JSON o HTML) que incluya al menos: (1) Total de filas procesadas. (2) Total de filas válidas e inválidas. (3) Listado de errores por validación (V1–V6) con identificador de fila/communeCode cuando aplique. (4) Indicación de si el total de comunas válidas es 346. (5) Resultado final: **APROBADO** (archivo listo para carga) o **RECHAZADO** (no se genera archivo maestro limpio o no se recomienda cargar). |

**Flujo resumido:**

1. Entrada: archivo CSV (o JSON) en bruto.
2. Validaciones V1–V6; generación del reporte de validación.
3. Si resultado = APROBADO → generación del **archivo maestro limpio** (y opcionalmente estadísticas: X regiones, Y provincias, 346 comunas).
4. El archivo maestro limpio es el **único** insumo para el script de seed/import a BD (no usar el archivo en bruto para escribir en BD).

---

## Resumen

| Tema | Decisión |
|------|----------|
| **Formato fuente** | CSV (recomendado) o JSON; un registro por comuna; UTF-8; cabecera obligatoria en CSV. |
| **Columnas obligatorias** | regionCode, regionName, provinceCode, provinceName, communeCode, communeName, isActive, source, updatedAt. |
| **Validaciones** | No duplicados communeCode; comuna → provincia válida; provincia → región válida; total 346 comunas; tipos y obligatoriedad; sin mezcla de códigos. |
| **Reglas de carga** | Orden: regiones → provincias → comunas; sin mezclar códigos oficiales con internos; idempotencia y trazabilidad recomendadas. |
| **Salida** | Archivo maestro limpio listo para seed/import + reporte de validación (APROBADO/RECHAZADO y detalle de errores). |

Esta especificación deja definida la importación del maestro territorial de forma ejecutable y segura, sin tocar BD productiva ni migraciones, y evita romper consistencia de códigos, relación región/provincia/comuna y futura relación con catálogos de locales.
