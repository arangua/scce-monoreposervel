# Regresión mínima: Central / región "Todas" (ALL)

**Objetivo:** No romper el flujo "nivel central ve Todas las regiones" ni el default por membership OPERACION/GLOBAL.

## Checklist rápido (manual)

1. **Central (OPERACION/GLOBAL):** Login con usuario que tenga membership `contextType=OPERACION`, `contextId=GLOBAL`.  
   - **Esperado:** Selector de región muestra "Todas las regiones" por defecto; se ven casos de TRP y AYP (o las regiones que existan).

2. **Central → filtrar por región:** Con el mismo usuario, elegir "Tarapacá" (TRP) en el selector.  
   - **Esperado:** Solo se listan casos de TRP.

3. **No central:** Login con usuario regional (ej. rol PESE/REGISTRO_SCCE con región TRP).  
   - **Esperado:** No aparece la opción "Todas las regiones"; solo regiones normales.

4. **Crear caso con "Todas" seleccionada:** Estando central con "Todas las regiones", abrir "Nuevo caso".  
   - **Esperado:** El caso se guarda con `region = DEFAULT_REGION` (TRP), no con "ALL".

---

## Test automatizado (criterio)

`scce-app/src/domain/authSession.test.ts`: valida que `isCentralFromContext(membership, demoRole)` sea `true` cuando `membership.contextType === "OPERACION"` y `membership.contextId === "GLOBAL"`, y que los roles demo NIVEL_CENTRAL / NIVEL_CENTRAL_SIM / ADMIN_PILOTO sigan siendo central sin membership. Ejecutar: `npx vitest run src/domain/authSession.test.ts`.
