# Validación manual — Rol simulado (contexto visual en SIMULACION)

**Fecha:** 2026-03-08  
**Ámbito:** Comportamiento visual de `simulatedRoleId` / `simulatedRoleLabel`: barra superior, ficha de caso, módulo Simulación. Sin cambios de permisos ni lógica.

---

## Revisión de código (consistencia esperada)

Antes de ejecutar la prueba manual, el código respalda lo siguiente:

| Verificación | Dónde | Comportamiento en código |
|-------------|--------|---------------------------|
| Barra en SIMULACION | `App.tsx`: `activeSimulatedRole &&` → "Modo simulación · Actuando como: {activeSimulatedRole.label}" | Solo se muestra si `activeMembership?.contextType === "SIMULACION"`; el label viene de `getSimulatedRole(simulatedRoleId)`. |
| Ficha en SIMULACION | `CaseDetailView.tsx`: `gate.contextType === "SIMULACION" && gate.simulatedRoleLabel` → "Ejercicio actual: actuando como {gate.simulatedRoleLabel}" + `SIMULATED_ROLE_HELP[gate.simulatedRoleId]` | Gates reciben `activeSimulatedRole?.id` y `activeSimulatedRole?.label`; el texto orientativo se busca por id en `simulatedRoleHelp`. |
| Módulo Simulación en SIMULACION | `SimulationView.tsx`: misma condición y mismos campos del gate → mismo par de líneas | Misma fuente: `activeSimulatedRole` inyectado en `simulationGate`. |
| OPERACION | Misma condición en las tres vistas | Si `contextType !== "SIMULACION"`, `activeSimulatedRole` es `undefined`; los gates reciben `simulatedRoleId`/`simulatedRoleLabel` undefined y las vistas no muestran el bloque. |
| Selector cambia textos | `App.tsx`: `simulatedRoleId` en state; `activeSimulatedRole = getSimulatedRole(simulatedRoleId)` | Al cambiar el `<select>`, `setSimulatedRoleId` actualiza el state; barra y gates se recalculan con el nuevo rol. |
| Acciones/permisos no cambian | No se usa `simulatedRoleId` en `canDo`, guards ni políticas | Confirmado: solo se usa para copy y contexto visual. |

Si en la prueba manual algo no coincide con esta tabla, anótalo en "FALLA" con detalle.

---

## Script de prueba manual (8 puntos)

**Precondición:** Usuario con al menos un membership en contexto **SIMULACION** (y opcionalmente otro en OPERACION para el punto 8).

1. **Entrar con usuario en contexto SIMULACION.**  
   - [ ] Hecho.

2. **Barra superior:** Debe aparecer exactamente:  
   `Modo simulación · Actuando como: {rol actual}`  
   (por ejemplo "Director Regional" si no has cambiado el selector).  
   - [ ] OK  /  [ ] FALLA — *Si falla: qué se ve en la barra: ________*

3. **Cambiar el selector de rol simulado** ("Actuar como:") a otro rol (p. ej. PESE).  
   Verificar que el texto de la barra cambia al nuevo rol.  
   - [ ] OK  /  [ ] FALLA — *Si falla: qué se ve: ________*

4. **Abrir una ficha de caso.** Verificar que aparece:  
   - Línea: `Ejercicio actual: actuando como {rol}`  
   - Línea siguiente: el texto orientativo correspondiente a ese rol (p. ej. para PESE: "En este ejercicio, registra y comunica incidencias como PESE.").  
   - [ ] OK  /  [ ] FALLA — *Si falla: qué se ve en ficha: ________*

5. **Ir al módulo Simulación.** Verificar que aparece:  
   - Línea: `Ejercicio actual: actuando como {rol}`  
   - Línea siguiente: el mismo texto orientativo que en la ficha para ese rol.  
   - [ ] OK  /  [ ] FALLA — *Si falla: qué se ve en módulo Simulación: ________*

6. **Cambiar otra vez el selector** a un rol distinto. Verificar que tanto en la ficha de caso como en el módulo Simulación los textos (rol + orientativo) se actualizan al nuevo rol.  
   - [ ] OK  /  [ ] FALLA — *Si falla: dónde no se actualizó: ________*

7. **Comprobar que al cambiar el rol simulado no cambian** acciones, permisos ni botones disponibles (misma capacidad de crear/editar/asignar/cerrar, etc.).  
   - [ ] OK  /  [ ] FALLA — *Si falla: qué acción o botón cambió sin deber: ________*

8. **Cambiar a un contexto OPERACION** (si tienes membership OPERACION) o salir de SIMULACION. Verificar que **no** aparece:  
   - "Modo simulación · Actuando como: ..." en la barra  
   - "Ejercicio actual: actuando como ..." ni el texto orientativo en ficha ni en módulo Simulación.  
   - [ ] OK  /  [ ] FALLA — *Si falla: dónde siguen viéndose textos de simulación: ________*

---

## Resultado (rellenar tras la ejecución)

| Punto | Resultado | Notas |
|-------|-----------|--------|
| 1. Entrada SIMULACION | OK / FALLA | |
| 2. Barra "Modo simulación · Actuando como: {rol}" | OK / FALLA | |
| 3. Selector cambia texto barra | OK / FALLA | |
| 4. Ficha: "Ejercicio actual" + texto orientativo | OK / FALLA | |
| 5. Módulo Simulación: "Ejercicio actual" + texto orientativo | OK / FALLA | |
| 6. Cambio de selector actualiza ficha y módulo | OK / FALLA | |
| 7. Acciones/permisos no cambian con el rol simulado | OK / FALLA | |
| 8. OPERACION: no aparece ninguno de esos textos | OK / FALLA | |

**Cierre de etapa:** Todas OK = etapa de rol simulado visual consolidada. Cualquier FALLA = indicar exactamente dónde y qué se vio antes de seguir.
