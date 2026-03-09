# Catálogo de locales versionado — Modelo funcional v1

**Documento funcional.** Sin implementación en código. Define la base para gobernanza, comunas y simulación.

**Fecha:** 2026-03-08  
**Estado:** Borrador para alineación.

---

## 1. Qué es un catálogo en SCCE

En SCCE, **un catálogo** es el conjunto de **locales de votación** (y, en su caso, de inmuebles elegibles o locales preliminares) que el sistema usa para:

- **Registrar incidentes** (asociar un caso a un local concreto).
- **Validar** que el local exista y esté vigente en el proceso.
- **Mostrar opciones** en formularios (región → comuna → local).
- **Comparar** el estado del caso con el catálogo (divergencias, snapshot).

Un catálogo no es “el local” como dato único y fijo: es **una versión del conjunto de locales** ligada a un **proceso electoral**, un **modo de uso** (OPERACION vs SIMULACION), una **fuente** (oficial, simulado, histórico, manual) y una **vigencia**.

**Resumen:** catálogo = conjunto versionado de locales con proceso, modo, fuente y vigencia.

---

## 2. Diferencia entre inmueble elegible, local preliminar y local definitivo

| Concepto | Descripción | Uso típico |
|----------|-------------|------------|
| **Inmueble elegible** | Espacio físico candidato a ser local de votación (pre-selección). | Catálogo preliminar: “estos son los inmuebles que podrían ser locales”. |
| **Local preliminar** | Local propuesto o en evaluación para la elección (aún no definitivo). | Fase previa al cierre del catálogo: inmuebles/eventuales locales antes de la selección final. |
| **Local definitivo** | Local confirmado y vigente para la elección. Es el que cuenta para operación real. | Catálogo definitivo: locales con los que se trabaja el día de la elección y en operación. |

En el modelo versionado:

- Un **catálogo preliminar** puede contener inmuebles elegibles y/o locales preliminares.
- Un **catálogo definitivo** contiene solo locales definitivos (vigentes para el proceso).
- En **simulación** se puede usar un catálogo histórico (definitivo de una elección pasada) o un catálogo simulado (base o copia controlada).

---

## 3. Cómo conviven varios catálogos en el tiempo

- **Varios catálogos pueden coexistir** en el sistema:
  - Por **proceso electoral** (año, tipo de elección).
  - Por **tipo** (preliminar vs definitivo).
  - Por **fuente** (oficial, simulado, histórico, carga manual).
  - Por **vigencia** (borrador, publicado, archivado).

- **Regla de coexistencia:**  
  No se mezclan locales de un catálogo con otro. Cada catálogo es una unidad identificable (por id de catálogo o por proceso + tipo + fuente + vigencia). Las operaciones (crear caso, validar local, listar opciones) se resuelven siempre contra **un** catálogo activo en el contexto actual.

- **En el tiempo:**  
  Para un mismo proceso puede haber secuencia: preliminar (borrador) → preliminar (publicado) → definitivo (publicado). Para simulación pueden existir catálogos históricos (archivados) y catálogos simulados (vigentes en contexto SIMULACION).

---

## 4. Cómo se separan OPERACION y SIMULACION

| Modo | Catálogo que debe usar | Restricción |
|------|------------------------|-------------|
| **OPERACION** | Solo catálogo **oficial vigente** del proceso electoral activo. | Un solo catálogo “real” por proceso; no se usan catálogos simulados ni históricos para operación real. |
| **SIMULACION** | Catálogo **simulado**, **histórico** o **copia controlada** del real. | No modifica el catálogo oficial. Permite ejercicios con datos pasados o de prueba sin afectar el definitivo. |

Separación práctica:

- **OPERACION:** siempre resuelve “local” contra el catálogo oficial definitivo del proceso activo (y, si aplica, preliminar en fases previas, según política).
- **SIMULACION:** el sistema elige un catálogo según contexto (simulado base, histórico de elección X, o copia controlada). Ese catálogo es el “activo” solo en ese contexto.

Así se evita que un ejercicio de simulación cambie o dependa del catálogo en uso en operación real.

---

## 5. Cómo se carga un catálogo histórico sin afectar el real

- **Catálogo histórico** = versión del catálogo (o del conjunto de locales) asociada a una **elección pasada** o a un **proceso archivado**, marcada como tal (fuente: histórico; estado: archivado o publicado histórico).

- **Reglas para no afectar el real:**
  1. El catálogo histórico se **registra como tal** (tipo/fuente/estado que lo distinguen del oficial vigente).
  2. Se asocia a **proceso electoral pasado** (o a un id de catálogo histórico), no al proceso activo de operación.
  3. **OPERACION** nunca usa ese catálogo para validaciones ni listados; solo puede usarlo **SIMULACION** cuando el usuario (o la política) elige “simular con elección X” o “catálogo histórico Y”.
  4. Carga e importación de históricos **no modifican** el catálogo oficial vigente ni el definitivo del proceso en curso.

Con esto, “cargar un catálogo histórico” es crear/importar una **nueva versión de catálogo** etiquetada como histórica, no sobrescribir el real.

---

## 6. Cuál catálogo queda “activo” para cada contexto

- **OPERACION (proceso activo):**  
  Catálogo activo = catálogo **oficial definitivo** (o el que la política defina para el proceso activo). Un solo catálogo activo por contexto OPERACION.

- **SIMULACION:**  
  Catálogo activo = el que corresponda al **contexto de simulación** elegido, por ejemplo:
  - Catálogo **simulado base** (pruebas generales).
  - Catálogo **histórico** de una elección pasada (simulación sobre datos pasados).
  - **Copia controlada** del catálogo real (solo lectura en simulación, sin afectar el oficial).

La regla práctica:

- **OPERACION** → solo catálogo oficial vigente del proceso activo.
- **SIMULACION** → catálogo simulado, histórico o copia controlada del real, según configuración/contexto de la simulación.

---

## Resumen de reglas recomendadas

| Contexto | Catálogo activo |
|----------|------------------|
| OPERACION | Solo catálogo oficial vigente del proceso activo. |
| SIMULACION | Catálogo simulado, catálogo histórico o copia controlada del real. |

---

## Tipos de catálogo a soportar (mínimo)

| Tipo de catálogo | Uso |
|------------------|-----|
| Catálogo simulado base | Pruebas generales. |
| Catálogo histórico | Simulación sobre elecciones pasadas. |
| Catálogo preliminar | Inmuebles/eventuales locales antes de selección. |
| Catálogo definitivo | Locales vigentes para la elección en curso. |

Cada catálogo debería quedar asociado, en el modelo, a:

- Proceso electoral  
- Modo: OPERACION o SIMULACION  
- Región (si aplica alcance regional)  
- Vigencia  
- Estado: borrador, publicado, archivado  
- Fuente: simulado, histórico, oficial, carga manual  

---

## Próximos pasos (fuera de este documento)

1. Bajar este modelo a entidades y reglas de negocio (sin implementar aún).
2. Definir cómo se identifica y selecciona el catálogo activo por contexto (membership, proceso, modo).
3. A partir de esta base, abordar gobernanza, carga completa de comunas y simulación sobre históricos.
