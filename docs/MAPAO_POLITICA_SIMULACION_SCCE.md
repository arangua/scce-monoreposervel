# Mapeo detallado: Política de Simulación SCCE ↔ Implementación

Documento único que relaciona cada elemento de la política con el modelo de datos, el seed, los guards y la UI. Incluye estado (implementado / parcial / faltante) y valores concretos.

---

## 1. Modelo de datos (Prisma)

### 1.1 Enums y tablas involucrados

| Artefacto | Ubicación | Valores / Campos |
|-----------|-----------|-------------------|
| **ContextType** | `api/prisma/schema.prisma` L10-14 | `OPERACION`, `SIMULACION` |
| **Role** | `api/prisma/schema.prisma` L16-21 | `ADMIN_PILOTO`, `DR`, `EQUIPO_REGIONAL`, `NIVEL_CENTRAL_SIM` |
| **RegionScopeMode** | `api/prisma/schema.prisma` L23-26 | `ALL`, `LIST` |
| **User** | `api/prisma/schema.prisma` L64-72 | id, email, passwordHash, isActive, createdAt |
| **Membership** | `api/prisma/schema.prisma` L75-91 | id, userId, **contextType**, **contextId**, **regionCode**, **role**, regionScopeMode, regionScope, createdAt. Unique: (userId, contextType, contextId, regionCode) |
| **Case** | `api/prisma/schema.prisma` L108-129 | id, **contextType**, **contextId**, title, summary, status, criticality, criticalityLevel, createdByUserId, regionCode, communeCode, localCode, localSnapshot, assignedTo, createdAt, updatedAt |
| **Event** | `api/prisma/schema.prisma` L131-145 | id, caseId, **contextType**, **contextId**, actorId, eventType, payloadJson, prevHash, hash, createdAt |

### 1.2 Regla de unicidad de Membership

Un mismo usuario puede tener varios memberships; la combinación **(userId, contextType, contextId, regionCode)** debe ser única. Así un DR puede tener, por ejemplo:

- (userId, OPERACION, GLOBAL, TRP)
- (userId, SIMULACION, e2e, TRP)
- (userId, SIMULACION, integral, ADM) — si se agrega

---

## 2. Política → Contextos (contextType + contextId)

Cada “lugar” donde viven los datos de un ejercicio queda definido por un par (contextType, contextId). La política habla de “contexto” y “SIMULACION / e2e u otros”.

| Política (sección / frase) | contextType | contextId | Uso en sistema | Estado |
|----------------------------|-------------|-----------|----------------|--------|
| “SIMULACION / e2e u otros contextos de simulación” (§7) | SIMULACION | e2e | Ejercicios por región, E2E, entrenamiento DR. Casos creados aquí no contaminan OPERACIÓN. | **Implementado** (seed + regla de creación) |
| “simulación integral/global” para ADMIN_PILOTO (§4, §6) | SIMULACION | integral | Simulación sin atadura a una sola región (scope ALL). | **Faltante** (no existe en seed ni en UI) |
| Casos archivados desde OPERACIÓN (script archivo seguro) | SIMULACION | archivo-prueba | Solo movidos por script; no es contexto de creación. | **Implementado** (script; no seed) |

Resumen de contextIds de simulación:

| contextId | Creado en seed | Uso |
|-----------|----------------|-----|
| e2e | Sí (por usuario DR y admin) | Pruebas, ejercicios regionales, entrenamiento. |
| integral | No | Simulación global ADMIN_PILOTO (política §4, §6). |
| archivo-prueba | No (se asigna en script) | Casos PRUEBA_EN_REAL archivados. |

---

## 3. Política → Roles del sistema (enum Role)

La política distingue **perfiles** (quién puede hacer qué) y **roles simulados** (qué papel se representa en el ejercicio). En el modelo actual solo existe el **rol del sistema** (Role en Membership).

| Perfil política (§4, §5) | Role Prisma | Descripción en sistema | Usado en seed |
|--------------------------|-------------|-------------------------|---------------|
| Director Regional | DR | Operación y simulación de su región. | Sí (OPERACION/GLOBAL + SIMULACION/e2e por región). |
| ADMIN_PILOTO | ADMIN_PILOTO | Operación y simulación regional e integral. | Sí (OPERACION; SIMULACION/e2e TRP). No SIMULACION/integral. |
| Equipos regionales autorizados | EQUIPO_REGIONAL | Solo simulación, rol asignado por DR. | No (no hay usuarios ni memberships). |
| Nivel Central (Fase 2) | NIVEL_CENTRAL_SIM | Simulación institucional. | No (Fase 2). |

Roles **simulados** (PESE, Delegado JE, terreno, DR, Nivel Central) no están en Prisma; en el front existen como etiquetas en `USERS` (demo/terrain). Para la política son “rol que representa en el ejercicio”, no el Role del membership.

---

## 4. Mapeo Política → Seed (línea a línea)

### 4.1 Regiones

| Política | Seed | Archivo:Líneas |
|----------|------|----------------|
| Regla territorial (§6): DR por región. | REGIONS (id 01..16), REGION_CODES (AYP, TRP, …). | seed.ts L11-30 |
| Upsert Region por id. | prisma.region.upsert en loop. | seed.ts L34-40 |

### 4.2 Usuarios DR (16)

| Política | Seed | Archivo:Líneas |
|----------|------|----------------|
| “Directores Regionales” (§3 Fase 1, §4). | Un User por región: `dr.{code}@scce.local`. | seed.ts L58-71 |
| “usar OPERACIÓN de su región” (§4). | Un Membership por DR: contextType=OPERACION, contextId=GLOBAL, regionCode=code, role=DR, regionScopeMode=LIST, regionScope=[code]. | seed.ts L72-91 |
| “usar SIMULACIÓN de su región” (§4, §6). | Un segundo Membership por DR: contextType=SIMULACION, contextId=e2e, regionCode=code, role=DR, regionScopeMode=LIST, regionScope=[code]. | seed.ts L92-108 |

### 4.3 Admin piloto

| Política | Seed | Archivo:Líneas |
|----------|------|----------------|
| “ADMIN_PILOTO” (§3, §4). | User `admin.piloto@scce.local`. | seed.ts L110-122 |
| “Operación real” (DR TRP + ADMIN_PILOTO). | deleteMany memberships de admin; luego 2 memberships OPERACION/GLOBAL: (regionCode=TRP, role=DR, LIST [TRP]) y (regionCode=ADM, role=ADMIN_PILOTO, ALL []). | seed.ts L124-163 |
| “usar simulación regional” (§4). | Un Membership: contextType=SIMULACION, contextId=e2e, regionCode=TRP, role=DR, LIST [TRP]. | seed.ts L164-181 |
| “usar simulación integral/global” (§4, §6). | No hay membership SIMULACION/integral. | **Faltante** |

### 4.4 Equipos regionales y Nivel Central

| Política | Seed | Estado |
|----------|------|--------|
| “funcionarios de equipos regionales autorizados” (§3 Fase 1), “solo en simulación” (§4). | No hay usuarios con role EQUIPO_REGIONAL ni memberships SIMULACION/e2e. | **Faltante** |
| “Nivel Central” (§3 Fase 2, §4). | No hay usuarios NIVEL_CENTRAL_SIM ni memberships SIMULACION. | **Faltante** (Fase 2) |

---

## 5. Mapeo Política → Backend (guards, casos, eventos)

### 5.1 Origen del contexto en cada request

| Política | Implementación | Archivo:Líneas |
|----------|----------------|----------------|
| “Contexto define dónde viven los datos” (§7). | El contexto de la request viene de: (1) header `x-scce-membership-id` → se resuelve el Membership y se usa su contextType y contextId; (2) si no, headers `x-scce-context-type` y `x-scce-context-id`; (3) si no, default OPERACION/GLOBAL. | context.guard.ts L40-94 |
| Aceptar solo OPERACION o SIMULACION. | validTypes: ["OPERACION", "SIMULACION"]. | context.guard.ts L76 |
| Listado de casos y creación por contexto. | cases.service list/create usan ctx (contextType, contextId) y regionWhere(ctx). | cases.service.ts L264-272, L288-311 |
| Eventos atados al caso y al contexto. | Case y Event se crean/consultan con el mismo contextType y contextId. | cases.service.ts L296-311, L331-344 |

### 5.2 ScceCtx (lo que recibe el servicio)

| Campo | Origen | Uso |
|-------|--------|-----|
| contextType | req.scceContext (membership o headers) | Filtro Case/Event, creación. |
| contextId | req.scceContext | Filtro Case/Event, creación. |
| membershipId | req.scceMembershipId | Opcional. |
| regionScopeMode | req.scceMembership | regionWhere: si LIST, filtra por regionCode in regionScope. |
| regionScope | req.scceMembership | regionWhere y assertRegionAllowed. |

Si no se envía membership (solo headers type/id), regionScope no se llena y regionWhere puede no filtrar por región (comportamiento según ctx.regionScopeMode).

### 5.3 Endpoint de contextos (listado para “Seleccionar contexto”)

| Política | Implementación | Archivo:Líneas |
|----------|----------------|----------------|
| Usuario elige contexto antes de operar (§7). | GET /contexts devuelve todos los memberships del usuario (Prisma findMany where userId, orderBy createdAt). | contexts.controller.ts L9-19 |
| La UI muestra “contextType / contextId” y el usuario elige. | Front envía x-scce-membership-id en las peticiones siguientes. | App.tsx (membershipToRequestHeaders, getMembershipApiHeaders). |

---

## 6. Mapeo Política → Frontend

### 6.1 Selección de contexto

| Política | Implementación | Ubicación |
|----------|----------------|-----------|
| “Seleccionar contexto” antes de continuar. | Pantalla ContextSelectorScreen con lista de memberships; cada botón muestra “contextType / contextId” y regionLabels. | App.tsx L2853-2900 |
| Al elegir membership se usa en todas las peticiones. | setActiveMembership(m); headers con x-scce-membership-id (y opcionalmente x-scce-context-type, x-scce-context-id). | App.tsx L2874-2878; helpers que construyen headers. |
| currentUser.role para permisos. | currentUser.role = activeMembership.role (viene del membership devuelto por API). | App.tsx L1506-1516 |

### 6.2 Rol real vs rol simulado

| Política (§5, §10) | Estado en front |
|--------------------|-----------------|
| “Usuario real vs rol simulado en el ejercicio”. | Rol del sistema = membership.role (DR, ADMIN_PILOTO, etc.). Roles “PESE”, “Delegado JE”, etc. existen en el array USERS (demo/terrain) para flujos locales; no hay selector de “rol simulado” en contexto de simulación en la app actual. |

### 6.3 Regla “prueba → SIMULACION”

| Política (§2, §8) | Implementación |
|-------------------|----------------|
| “Toda prueba en SIMULACIÓN”. | E2E Playwright: ensureLoggedIn elige contexto con texto SIMULACION. Seed: miembros SIMULACION/e2e. API E2E: inyectan contexto SIMULACION. Creación de caso: si el usuario eligió membership SIMULACION/e2e, el POST /cases usa ese membership → caso nace en SIMULACION. |

---

## 7. Tabla resumen: requisito política → artefacto → estado

Cada fila es un requisito concreto derivado de la política, el artefacto que lo implementa y el estado actual.

| # | Requisito (política) | Artefacto (schema / seed / backend / front) | Estado |
|---|----------------------|---------------------------------------------|--------|
| 1 | ContextType OPERACION y SIMULACION | schema.prisma enum ContextType | Implementado |
| 2 | Roles DR, ADMIN_PILOTO, EQUIPO_REGIONAL, NIVEL_CENTRAL_SIM | schema.prisma enum Role | Implementado |
| 3 | Casos y eventos por (contextType, contextId) | Case y Event en schema; cases.service list/create/getEvents | Implementado |
| 4 | DR: operación real por región | seed: Membership OPERACION/GLOBAL, regionCode=code, regionScope=[code] | Implementado |
| 5 | DR: simulación por su región | seed: Membership SIMULACION/e2e, regionCode=code, regionScope=[code] | Implementado |
| 6 | Admin: operación (DR TRP + ADMIN_PILOTO) | seed: 2 memberships OPERACION/GLOBAL (TRP, ADM) | Implementado |
| 7 | Admin: simulación regional | seed: Membership SIMULACION/e2e, regionCode=TRP | Implementado |
| 8 | Admin: simulación integral/global | seed: no existe membership SIMULACION/integral | Faltante |
| 9 | Pruebas E2E y manual en SIMULACION | seed SIMULACION/e2e; E2E eligen SIMULACION; regla creación | Implementado |
| 10 | Contexto por request (membership o headers) | context.guard.ts; Ctx decorator con regionScope | Implementado |
| 11 | Listado de contextos para el usuario | GET /contexts → memberships del usuario | Implementado |
| 12 | UI “Seleccionar contexto” con contextType/contextId | ContextSelectorScreen, activeMembership, headers en requests | Implementado |
| 13 | Equipos regionales solo simulación (Fase 1) | No hay usuarios ni memberships EQUIPO_REGIONAL SIMULACION/e2e | Faltante |
| 14 | Nivel Central en simulación (Fase 2) | No hay usuarios ni memberships NIVEL_CENTRAL_SIM | Faltante (Fase 2) |
| 15 | Casos de prueba no en OPERACIÓN (archivo) | Script archive-prueba-en-real → SIMULACION/archivo-prueba | Implementado |
| 16 | Rol simulado (PESE, Delegado JE, etc.) en ejercicio | Solo en USERS demo/terrain; no en flujo API/simulación | Parcial / Faltante |

---

## 8. ContextIds y memberships: valores exactos hoy

### 8.1 ContextIds que existen en BD (tras seed y script de archivo)

| contextType | contextId | Cómo se crea |
|-------------|-----------|--------------|
| OPERACION | GLOBAL | Seed: todos los DR y admin. |
| SIMULACION | e2e | Seed: todos los DR y admin (un membership por región para DR; admin con TRP). |
| SIMULACION | archivo-prueba | Script archive-prueba-en-real (casos movidos, no membership de usuario). |

### 8.2 Memberships creados por el seed (resumen)

| Usuario | contextType | contextId | regionCode | role | regionScopeMode | regionScope |
|---------|-------------|-----------|------------|------|-----------------|-------------|
| dr.{ayp,trp,...}@scce.local | OPERACION | GLOBAL | AYP, TRP, … | DR | LIST | [code] |
| dr.{ayp,trp,...}@scce.local | SIMULACION | e2e | AYP, TRP, … | DR | LIST | [code] |
| admin.piloto@scce.local | OPERACION | GLOBAL | TRP | DR | LIST | [TRP] |
| admin.piloto@scce.local | OPERACION | GLOBAL | ADM | ADMIN_PILOTO | ALL | [] |
| admin.piloto@scce.local | SIMULACION | e2e | TRP | DR | LIST | [TRP] |

No existe en seed:

- (admin, SIMULACION, integral, ADM, ADMIN_PILOTO, ALL, []).
- Cualquier usuario con role EQUIPO_REGIONAL o NIVEL_CENTRAL_SIM.

---

## 9. Flujo de datos: desde “Seleccionar contexto” hasta caso creado

1. Usuario hace login → JWT.
2. Front llama GET /contexts con JWT → Backend devuelve memberships del usuario (Prisma Membership where userId).
3. Usuario elige un membership en “Seleccionar contexto” → Front guarda activeMembership y lo usa en todas las peticiones (x-scce-membership-id).
4. ContextGuard: si hay x-scce-membership-id, carga el membership y pone en req scceContext (contextType, contextId) y scceMembership (regionScopeMode, regionScope).
5. POST /cases: CasesService.create(dto, ctx, userId). Crea Case y Event con ctx.contextType y ctx.contextId. assertRegionAllowed(ctx, dto.regionCode) usa regionScope.
6. Si el membership elegido era SIMULACION/e2e, el caso nace en SIMULACION y no en OPERACIÓN.

---

## 10. Checklist de implementación (referencia)

- [x] Schema: ContextType, Role, Membership con (contextType, contextId, regionCode, role).
- [x] Seed: DR con OPERACION/GLOBAL + SIMULACION/e2e por región.
- [x] Seed: Admin con OPERACION (TRP + ADM) + SIMULACION/e2e TRP.
- [ ] Seed: Admin con SIMULACION/integral (regionCode ADM, scope ALL).
- [ ] Seed (o proceso aparte): Usuarios EQUIPO_REGIONAL con membership solo SIMULACION/e2e.
- [ ] Fase 2: Usuarios NIVEL_CENTRAL_SIM con memberships SIMULACION.
- [x] Backend: ContextGuard y Ctx con contextType, contextId, regionScope.
- [x] Backend: Cases y Events filtrados/creados por contexto.
- [x] Front: Listado de contextos (memberships) y envío de membership en requests.
- [x] Regla creación: pruebas (E2E y manual con contexto SIMULACION) crean casos en SIMULACION.
- [ ] UI/backend: Rol simulado en ejercicio (PESE, Delegado JE, etc.) si se desea en Fase 1.

Este documento se puede actualizar cuando se agreguen memberships (p. ej. SIMULACION/integral) o usuarios de EQUIPO_REGIONAL / NIVEL_CENTRAL_SIM.
