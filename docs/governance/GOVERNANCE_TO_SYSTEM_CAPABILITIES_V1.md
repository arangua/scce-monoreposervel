# Traducción gobernanza → capacidades del sistema — v1

**Puente entre matriz de gobernanza y futura implementación de permisos.** Sin código. Define en lenguaje de sistema qué puede hacer cada rol, condicionado por criticidad, modo, contexto y estado del caso.

**Fecha:** 2026-03-08  
**Estado:** Borrador. Base para implementación de permisos y rol simulado real.

**Referencia:** GOVERNANCE_DECISION_MATRIX_V1.md.

---

## Capacidades del sistema

| Capacidad | Descripción en sistema |
|-----------|-------------------------|
| **Crear caso** | Registrar un nuevo incidente (caso) en el sistema. |
| **Editar caso** | Modificar datos del caso (resumen, detalle, estado intermedio, asignación, etc.) dentro de lo permitido para el rol. |
| **Agregar comentario** | Añadir comentario o nota al caso. |
| **Agregar acción** | Registrar una acción tomada (qué se hizo, responsable, resultado). |
| **Escalar** | Escalar el caso a otro nivel (regional o central). |
| **Registrar validación operacional** | Registrar que el cierre operativo cumple criterios (validación antes de cerrar). |
| **Agregar decisión** | Tomar decisiones de fondo (ej. decisión de bypass, validar/revocar bypass, decisión de no escalar). |
| **Resolver caso** | Cambiar el estado del caso a "Resuelto" (resolución declarada). |
| **Cerrar caso** | Cerrar formalmente el caso (estado "Cerrado"). |

---

## Condicionantes

Las capacidades se aplican según:

| Condicionante | Valores | Uso |
|---------------|---------|-----|
| **Criticidad** | BAJA, MEDIA, ALTA, CRITICA | Qué puede hacer el rol según el nivel de criticidad del caso. |
| **Modo** | OPERACION, SIMULACION | En SIMULACION las capacidades se aplican al rol simulado; en OPERACION al rol real del membership. |
| **Contexto** | regional, central | Si el usuario actúa en ámbito regional o central (scope del membership). |
| **Estado del caso** | Nuevo, Recepcionado, En gestión, Escalado, Mitigado, Resuelto, Cerrado | Algunas capacidades solo aplican en ciertos estados (ej. Cerrar solo si está Resuelto y validado). |

---

## Matriz de capacidades por rol y criticidad

Leyenda: **Sí** = puede; **No** = no puede; **Cond.** = condicionado (ver nota).

### PESE

| Capacidad | BAJA | MEDIA | ALTA | CRITICA |
|-----------|------|-------|------|---------|
| Crear caso | Sí | Sí | Sí | Sí |
| Editar caso | Sí | Sí | Sí | Sí |
| Agregar comentario | Sí | Sí | Sí | Sí |
| Agregar acción | Sí | Sí | Sí | Sí |
| Escalar | No | No | No | No |
| Registrar validación operacional | No | No | No | No |
| Agregar decisión | No | No | No | No |
| Resolver caso | No | No | No | No |
| Cerrar caso | No | No | No | No |

**Resumen:** PESE puede crear caso, comentar y agregar acción; no puede escalar, decidir, validar cierre, resolver ni cerrar. Gestiona en terreno en todas las criticidades.

---

### Delegado JE

| Capacidad | BAJA | MEDIA | ALTA | CRITICA |
|-----------|------|-------|------|---------|
| Crear caso | Sí | Sí | Sí | Sí |
| Editar caso | Sí | Sí | Sí | Sí |
| Agregar comentario | Sí | Sí | Sí | Sí |
| Agregar acción | Sí | Sí | Sí | Sí |
| Escalar | No | No | No | No |
| Registrar validación operacional | No | No | No | No |
| Agregar decisión | No | No | No | No |
| Resolver caso | No | No | No | No |
| Cerrar caso | No | No | No | No |

**Resumen:** Misma lógica que PESE: registro y gestión en mesa/local; sin capacidades de escalar, decidir o cerrar.

---

### Funcionario en terreno

| Capacidad | BAJA | MEDIA | ALTA | CRITICA |
|-----------|------|-------|------|---------|
| Crear caso | Sí | Sí | Sí | Sí |
| Editar caso | Sí | Sí | Sí | Sí |
| Agregar comentario | Sí | Sí | Sí | Sí |
| Agregar acción | Sí | Sí | Sí | Sí |
| Escalar | No | No | No | No |
| Registrar validación operacional | No | No | No | No |
| Agregar decisión | No | No | No | No |
| Resolver caso | No | No | No | No |
| Cerrar caso | No | No | No | No |

**Resumen:** Igual que PESE y Delegado JE: puede registrar y gestionar (crear, editar, comentar, acciones); no puede escalar, decidir, validar, resolver ni cerrar.

---

### Apoyo regional

| Capacidad | BAJA | MEDIA | ALTA | CRITICA |
|-----------|------|-------|------|---------|
| Crear caso | Sí | Sí | Sí | Sí |
| Editar caso | Sí | Sí | Sí | Sí |
| Agregar comentario | Sí | Sí | Sí | Sí |
| Agregar acción | Sí | Sí | Sí | Sí |
| Escalar | Sí | Sí | Sí | No (escala DR) |
| Registrar validación operacional | No | No | No | No |
| Agregar decisión | No | No | No | No |
| Resolver caso | No | No | No | No |
| Cerrar caso | No | No | No | No |

**Resumen:** Puede crear, editar, comentar, agregar acción y **escalar** (a DR) en BAJA/MEDIA/ALTA; en CRITICA el escalamiento lo hace el DR hacia Central. No decide, no valida cierre ni cierra.

---

### Director Regional

| Capacidad | BAJA | MEDIA | ALTA | CRITICA |
|-----------|------|-------|------|---------|
| Crear caso | Sí | Sí | Sí | Sí |
| Editar caso | Sí | Sí | Sí | Sí |
| Agregar comentario | Sí | Sí | Sí | Sí |
| Agregar acción | Sí | Sí | Sí | Sí |
| Escalar | Sí | Sí | Sí | Sí (a Central) |
| Registrar validación operacional | Sí | Sí | Sí | No |
| Agregar decisión | Sí | Sí | Sí | Cond. |
| Resolver caso | Sí | Sí | Sí | No |
| Cerrar caso | Sí | Sí | Cond. (con validación) | No |

**Resumen:** DR puede decidir en BAJA/MEDIA/ALTA; puede validar cierre y cerrar en BAJA/MEDIA; en ALTA puede resolver y cerrar con validación operacional. En CRITICA no cierra ni resuelve de forma definitiva: escala o coordina con Nivel Central; "Agregar decisión" en CRITICA es condicionado (solo si la política permite criterio DR; por defecto decide Nivel Central).

---

### Nivel Central

| Capacidad | BAJA | MEDIA | ALTA | CRITICA |
|-----------|------|-------|------|---------|
| Crear caso | Sí | Sí | Sí | Sí |
| Editar caso | Sí | Sí | Sí | Sí |
| Agregar comentario | Sí | Sí | Sí | Sí |
| Agregar acción | Sí | Sí | Sí | Sí |
| Escalar | N/A | N/A | Sí (recibe/coordina) | Sí |
| Registrar validación operacional | No | No | Sí | Sí |
| Agregar decisión | No | No | Sí | Sí |
| Resolver caso | No | No | Sí | Sí |
| Cerrar caso | No | No | Sí | Sí |

**Resumen:** Nivel Central decide y cierra en CRITICA; puede intervenir en ALTA (validar, decidir, resolver, cerrar). En BAJA/MEDIA no interviene en cierre (queda en DR).

---

## Condición por modo y contexto

| Modo | Contexto | Regla |
|------|----------|--------|
| **OPERACION** | regional | Las capacidades se aplican según el **rol real** del membership (DR, EQUIPO_REGIONAL, etc.) y la matriz por criticidad. El mapeo rol técnico → rol de gobernanza (PESE, DR, Nivel Central, etc.) se define en implementación. |
| **OPERACION** | central | Usuario con scope central (ej. Nivel Central real): capacidades de Nivel Central según criticidad. |
| **SIMULACION** | regional / por región | Las capacidades se aplican al **rol simulado** elegido (PESE, Delegado JE, DR, etc.). La matriz anterior aplica; el sistema no usa el rol real del membership para habilitar/ocultar, sino el rol simulado (cuando se implemente). |
| **SIMULACION** | central / integral | Rol simulado puede ser Nivel Central u otro; mismas reglas por criticidad. |

---

## Condición por estado del caso

| Capacidad | Estados en que aplica (ejemplo) |
|-----------|----------------------------------|
| Crear caso | N/A (crea nuevo). |
| Editar caso | Cualquier estado no Cerrado. |
| Agregar comentario | Cualquier estado no Cerrado. |
| Agregar acción | Cualquier estado no Cerrado. |
| Escalar | Según política; típicamente antes de Cerrado. |
| Registrar validación operacional | Estado "Resuelto" (para permitir cierre). |
| Agregar decisión | Según tipo de decisión (ej. bypass en estados que lo permitan). |
| Resolver caso | Caso en estado previo a Resuelto (ej. En gestión, Escalado, Mitigado). |
| Cerrar caso | Caso en estado "Resuelto" y, cuando aplique, con validación operacional registrada. |

---

## Resumen por rol (lógica a bajar)

| Rol | Puede | No puede | Condicionado por criticidad |
|-----|--------|----------|-----------------------------|
| **PESE** | Crear caso, editar, comentar, agregar acción. | Escalar, validar, decidir, resolver, cerrar. | — |
| **Delegado JE** | Igual que PESE. | Escalar, validar, decidir, resolver, cerrar. | — |
| **Funcionario en terreno** | Igual que PESE. | Escalar, validar, decidir, resolver, cerrar. | — |
| **Apoyo regional** | Crear, editar, comentar, acción, **escalar** (a DR). | Validar, decidir, resolver, cerrar. | En CRITICA no escala (escala DR). |
| **Director Regional** | Crear, editar, comentar, acción, escalar, validar cierre, decidir, resolver, cerrar (en BAJA/MEDIA/ALTA según tabla). | Cerrar en CRITICA. | En ALTA cierra con validación; en CRITICA no cierra, solo escala o coordina con Nivel Central. Decisión en CRITICA condicionada por política. |
| **Nivel Central** | Todas las capacidades; decide/valida/cierra en ALTA y CRITICA. | No cierra BAJA/MEDIA (es DR). | Interviene en ALTA y CRITICA; en BAJA/MEDIA no interviene en cierre. |

---

## Uso para implementación

1. **Permisos por rol y criticidad:** Cada celda Sí/Cond./No se traduce en regla de permiso (ej. `canDo("close", user, case)` considerando rol y criticidad del caso).
2. **Rol simulado:** En SIMULACION, el rol efectivo para la matriz es el **rol simulado** (PESE, DR, etc.); el backend/UI aplica la misma matriz.
3. **ADMIN_PILOTO:** En simulación, ADMIN_PILOTO adopta las capacidades del rol simulado elegido; no se le asignan todas las capacidades por ser piloto.

Con este documento quedan mapeadas las capacidades del sistema por rol y criticidad, listas para cobertura territorial completa (regiones + provincias + 346 comunas) y para implementación técnica posterior.
