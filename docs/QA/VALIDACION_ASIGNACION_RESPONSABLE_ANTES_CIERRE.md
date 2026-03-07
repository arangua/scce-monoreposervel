# Validación manual — asignación de responsable antes del cierre

Fecha: 2026-03-07
Caso probado: Caso en Liceo Altiplano

## Objetivo
Validar que el responsable del caso:
- no sea exigido al crear
- no sea exigido al marcar Resuelto
- sí pueda asignarse antes del cierre
- sí quede exigido al cerrar

## Hallazgo inicial
El selector "Asignar responsable" no aparecía en la ficha cuando el caso estaba en estado "Nuevo".

Causa detectada en frontend:
`canAssign` solo permitía mostrar el selector en estados:
- Recepcionado por DR
- En gestión
- Escalado
- o bypass

## Ajuste aplicado
En `scce-app/src/views/case/CaseDetailView.tsx` se simplificó la condición a:
- caso no cerrado
- usuario con permiso assign

## Resultado de la prueba manual
Se validó correctamente que:
1. el selector aparece en caso no cerrado
2. se puede asignar responsable desde estado Nuevo
3. la asignación queda visible en ficha
4. la asignación genera evento en bitácora
5. el flujo completo Acción → Resuelto → Validación operacional → Decisión → Motivo de cierre → Cierre funciona correctamente
6. no hubo bloqueo indebido por responsable
7. el cierre quedó permitido con responsable ya asignado

## Commit asociado
`c17b239` — `fix(frontend): permitir asignar responsable en casos no cerrados`
