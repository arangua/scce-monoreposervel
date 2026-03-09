# Reglas de resolución del catálogo activo — v1

**Comportamiento del sistema.** Sin implementación en código. Define cómo se determina el catálogo activo en cada contexto y conecta el modelo de datos con la operación real.

**Fecha:** 2026-03-08  
**Estado:** Borrador. Base para gobernanza, comunas e implementación técnica.

**Referencias:** LOCAL_CATALOG_VERSIONING_V1.md (funcional), LOCAL_CATALOG_DATA_MODEL_V1.md (entidades).

---

## 1. Cómo se elige el catálogo activo en OPERACIÓN

En **OPERACIÓN** el catálogo activo es **uno solo** y debe cumplir todas las condiciones siguientes:

| Criterio | Regla |
|----------|--------|
| **Modo** | `mode = OPERACION`. |
| **Fuente** | `source = OFFICIAL`. No se consideran SIMULATED ni HISTORICAL. |
| **Estado** | `status = PUBLISHED`. No se usan DRAFT ni ARCHIVED para operación normal. |
| **Activo** | `isActive = true`. |
| **Proceso activo** | El catálogo pertenece al **proceso electoral activo** de la aplicación (ej. `processCode` o `processId` igual al proceso configurado como “proceso en curso”). |
| **Región** | Si el contexto tiene **región activa** (ej. membership con scope LIST y una región), el catálogo debe incluir esa región: `regionScope` vacío (todas) o la región activa contenida en `regionScope`. Si el contexto es “todas las regiones” (scope ALL), se acepta catálogo con `regionScope` vacío o con cualquier conjunto. |

**Resumen:** En OPERACIÓN el catálogo activo = único catálogo que sea oficial, publicado, activo, del proceso activo y compatible con la región del contexto (membership/scope).

---

## 2. Cómo se elige el catálogo activo en SIMULACIÓN

En **SIMULACIÓN** el catálogo activo depende del **contexto de simulación seleccionado** (ej. membership SIMULACION, o parámetro “usar catálogo histórico X” / “catálogo simulado base”). Solo se consideran catálogos con:

- `mode = SIMULACION`
- `isActive = true`
- `status` tal que esté disponible para simulación (ej. PUBLISHED o ARCHIVED para históricos)

**Prioridad entre candidatos en SIMULACIÓN** (de mayor a menor prioridad):

1. **Catálogo explícitamente elegido** para el contexto (ej. “simular con elección 2024” → catálogo histórico con processCode 2024). Si el contexto de simulación tiene un identificador de catálogo o de proceso histórico, se usa ese.
2. **Copia controlada** del catálogo real asociada al contexto (si existe y está activa).
3. **Catálogo histórico** del proceso indicado (si el contexto indica “histórico” + proceso).
4. **Catálogo simulado base** (source = SIMULATED, catalogType = SIMULATED_BASE). Uso por defecto cuando no hay histórico ni copia elegidos.

**Región en SIMULACIÓN:** Si el contexto de simulación tiene región (ej. SIMULACION/e2e/MAU), el catálogo debe ser compatible: `regionScope` vacío o esa región en `regionScope`. Si no hay región fija, se acepta catálogo de alcance global.

**Resumen:** En SIMULACIÓN el catálogo activo = el que corresponda al contexto (elegido > copia controlada > histórico > simulado base), con mode=SIMULACION, isActive=true y alcance de región coherente.

---

## 3. Qué pasa si hay más de un candidato

Si tras aplicar los filtros (modo, proceso, región, source, status, isActive) queda **más de un catálogo candidato**, se aplica una **regla de desempate** en este orden:

1. **isActive = true** primero (si por algún motivo hubiera candidatos con isActive false, se excluyen antes; en la práctica los candidatos ya vienen con isActive true).
2. **Vigencia:** el catálogo cuya ventana [validFrom, validTo] contenga la fecha/hora actual. Si varios la contienen, pasar al siguiente criterio. Si ninguno tiene vigencia definida, se considera que todos están en vigencia.
3. **Fecha más reciente:** de los que sigan empatados, se elige el de **updatedAt** más reciente (o **createdAt** si se prefiere “última versión creada”).

**Regla adicional:** Por política, el sistema puede exigir que **no exista más de un** catálogo que cumpla las condiciones para OPERACIÓN (un solo oficial publicado activo por proceso). Si la configuración o la carga de datos generan dos, se considera error de configuración y se aplica desempate por vigencia y luego por fecha para elegir uno de forma determinista y registrar advertencia.

---

## 4. Qué pasa si no hay catálogo activo

Si tras aplicar las reglas **no hay ningún catálogo** que cumpla los criterios del contexto actual:

| Opción | Comportamiento recomendado |
|--------|-----------------------------|
| **Error visible** | Mostrar mensaje claro al usuario: “No hay catálogo de locales disponible para este contexto. Contacte al administrador.” No dejar la pantalla sin explicación. |
| **Modo degradado** | El sistema puede permitir navegar y ver casos existentes, pero **bloquear** la creación de nuevos casos que requieran selección de local (formulario “Nuevo incidente” con local obligatorio deshabilitado o mostrando el mensaje de error). |
| **Uso sin local** | Si la política lo permite, se podría permitir crear caso “sin local” (local opcional) cuando no hay catálogo activo, con advertencia. Esto es una decisión de producto; la regla mínima es **no mezclar** datos de otro catálogo ni asumir uno por defecto sin que quede explícito. |

**Resumen:** Sin catálogo activo → error visible + bloqueo de creación con local (o modo degradado definido por producto). No usar un catálogo distinto “por defecto” sin que esté definido en configuración.

---

## 5. Cuándo cambia el catálogo activo

El catálogo activo se **recalcula** (y puede cambiar) en estos eventos:

| Evento | Efecto |
|--------|--------|
| **Cambio de membership/contexto** | El usuario elige otro contexto (ej. otro membership: OPERACION vs SIMULACION, otra región en SIMULACION). El modo y la región efectiva cambian → se reaplica la resolución. El catálogo activo puede pasar a otro (o a ninguno). |
| **Cambio de región activa** | Dentro del mismo contexto, si la “región activa” (filtro, scope efectivo) cambia y el catálogo tiene regionScope, puede haber que elegir otro catálogo o el mismo si sigue siendo compatible. |
| **Cambio de proceso electoral activo** | Si la aplicación permite cambiar el “proceso en curso” (ej. año electoral), el catálogo activo en OPERACIÓN debe resolverse de nuevo para el nuevo proceso. |
| **Publicar/activar un catálogo nuevo** | Al publicar o activar un nuevo catálogo (status=PUBLISHED, isActive=true) que cumpla los criterios del contexto actual, la próxima resolución puede devolver ese catálogo (según desempate). No es obligatorio cambiar en caliente; puede aplicarse en la siguiente carga de contexto o al reabrir la sesión, según diseño técnico. |

**Regla práctica:** La resolución del catálogo activo se ejecuta cuando se **establece o cambia el contexto** (membership, región efectiva, proceso activo) y, si se implementa caché, cuando se invalida (ej. al publicar/activar un catálogo).

---

## 6. Qué guarda el caso

- **Referencia al local resuelto:** El caso **no** guarda el catálogo completo. Guarda una **referencia** al local resuelto contra el catálogo activo en el momento de la operación. Como mínimo:
  - **catalogId** (o equivalente) del catálogo usado.
  - Identificador del local en ese catálogo: **catalogLocalId** o la combinación estable **catalogId + regionCode + communeCode + localCode** (según modelo de datos).

- **Snapshot mínimo (recomendado):** Para trazabilidad y lectura histórica (ej. reportes, auditoría, casos ya cerrados cuando el catálogo pueda haber cambiado), conviene guardar en el caso un **snapshot mínimo** del local en el momento del registro, por ejemplo:
  - localName (o nombre del local)
  - address (opcional)
  - regionCode, communeCode, localCode

Así, aunque el catálogo se archive o se reemplace, el caso sigue mostrando “en qué local ocurrió” sin depender de que ese local siga existiendo en el catálogo activo. La **fuente de verdad** para “qué locales existen” sigue siendo el catálogo versionado; el caso solo guarda referencia + copia mínima para trazabilidad.

---

## Resumen de reglas

| Tema | Regla |
|------|--------|
| **OPERACIÓN** | Catálogo activo = único que cumple: mode=OPERACION, source=OFFICIAL, status=PUBLISHED, isActive=true, proceso activo, región compatible. |
| **SIMULACIÓN** | Catálogo activo = elegido por contexto (elegido > copia > histórico > simulado base), mode=SIMULACION, isActive=true, región compatible. |
| **Varios candidatos** | Desempate: vigencia (validFrom/validTo) y luego updatedAt más reciente. |
| **Ningún candidato** | Error visible; bloquear creación con local (o modo degradado definido). |
| **Cuándo cambia** | Al cambiar membership/contexto, región activa, proceso activo; al publicar/activar catálogo (según diseño). |
| **Qué guarda el caso** | Referencia (catalogId + identificador del local); recomendado snapshot mínimo (nombre, dirección, códigos) para trazabilidad. |

Este documento deja escritas las reglas exactas de selección del catálogo activo por contexto y el contrato mínimo de lo que guarda el caso, listas para gobernanza, comunas e implementación técnica.
