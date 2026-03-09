# Matriz mínima de gobernanza por criticidad — v1

**Regla matriz base.** Sin permisos técnicos finos, sin implementación backend ni excepciones. Solo la matriz por criticidad y rol para traducir después a permisos y comportamiento del rol simulado.

**Fecha:** 2026-03-08  
**Estado:** Borrador. Base para traducción a permisos y completar comunas/carga territorial.

---

## Roles considerados

| Rol | Descripción breve |
|-----|-------------------|
| PESE | Presidente de mesa / primer contacto en el local. |
| Delegado JE | Delegado de Junta Electoral (mesa/local). |
| Funcionario en terreno | Funcionario en el terreno (reporte, apoyo local). |
| Apoyo regional | Apoyo en oficina regional. |
| Director Regional | Responsable regional (DR). |
| Nivel Central | Nivel central / institucional. |
| ADMIN_PILOTO | Solo simulación; no se mezcla con permisos operativos en esta matriz. |

**Nota:** ADMIN_PILOTO se considera aparte (simulación y pilotaje). La matriz aplica a los seis roles operativos/simulados; ADMIN_PILOTO puede mapearse después según contexto simulado.

---

## Columnas de la matriz

| Columna | Significado |
|--------|-------------|
| **Puede registrar/gestionar** | Puede crear el caso y gestionarlo (actualizar estado, acciones, comentarios) en la fase correspondiente. |
| **Puede escalar** | Puede escalar el caso a otro nivel (regional o central). |
| **Puede decidir** | Puede tomar decisiones de fondo (ej. bypass, cambio de vía, decisión de no escalar). |
| **Puede validar cierre** | Puede validar el cierre operativo (que la resolución cumple criterios antes de cerrar). |
| **Puede cerrar** | Puede cerrar formalmente el caso. |
| **Escalamiento obligatorio** | Si aplica a la criticidad: si el caso debe escalarse obligatoriamente (Sí) o no (No). |

---

## BAJA

| Criticidad | Puede registrar/gestionar | Puede escalar | Puede decidir | Puede validar cierre | Puede cerrar | Escalamiento obligatorio |
|------------|---------------------------|---------------|---------------|----------------------|--------------|---------------------------|
| **BAJA** | PESE, Delegado JE, Funcionario en terreno, Apoyo regional | Apoyo regional, Director Regional | Director Regional | Director Regional (o Apoyo regional si se define) | Director Regional | No |

**Regla resumida:** Registro y gestión en terreno y apoyo regional; decisiones y cierre en DR. No se exige escalamiento.

---

## MEDIA

| Criticidad | Puede registrar/gestionar | Puede escalar | Puede decidir | Puede validar cierre | Puede cerrar | Escalamiento obligatorio |
|------------|---------------------------|---------------|---------------|----------------------|--------------|---------------------------|
| **MEDIA** | PESE, Delegado JE, Funcionario en terreno, Apoyo regional | Apoyo regional, Director Regional | Director Regional | Director Regional | Director Regional | No |

**Regla resumida:** Misma lógica que BAJA; DR decide y cierra. Escalamiento a central opcional según política interna (no obligatorio en esta matriz base).

---

## ALTA

| Criticidad | Puede registrar/gestionar | Puede escalar | Puede decidir | Puede validar cierre | Puede cerrar | Escalamiento obligatorio |
|------------|---------------------------|---------------|---------------|----------------------|--------------|---------------------------|
| **ALTA** | PESE, Delegado JE, Funcionario en terreno, Apoyo regional | Apoyo regional, Director Regional | Director Regional, Nivel Central | Director Regional, Nivel Central | Director Regional (con validación), Nivel Central | Sí (a DR como mínimo; a Nivel Central si la política lo exige) |

**Regla resumida:** Registro en terreno; escalamiento obligatorio al menos a DR. Decisiones y validación de cierre pueden ser DR o Nivel Central según política. Cierre por DR con validación o por Nivel Central.

---

## CRITICA

| Criticidad | Puede registrar/gestionar | Puede escalar | Puede decidir | Puede validar cierre | Puede cerrar | Escalamiento obligatorio |
|------------|---------------------------|---------------|---------------|----------------------|--------------|---------------------------|
| **CRITICA** | PESE, Delegado JE, Funcionario en terreno, Apoyo regional | Director Regional (escala a Central) | Nivel Central (o DR con criterio definido) | Nivel Central | Nivel Central | Sí (obligatorio a Nivel Central) |

**Regla resumida:** Registro en terreno; escalamiento obligatorio a Nivel Central. Decide, valida cierre y cierra Nivel Central (o DR solo si la política lo permite explícitamente).

---

## Tabla resumen por criticidad

| Criticidad | Registrar/gestionar | Escalar | Decidir | Validar cierre | Cerrar | Esc. obligatorio |
|------------|---------------------|---------|---------|---------------|--------|------------------|
| BAJA | PESE, Delegado JE, Func. terreno, Apoyo reg. | Apoyo reg., DR | DR | DR | DR | No |
| MEDIA | PESE, Delegado JE, Func. terreno, Apoyo reg. | Apoyo reg., DR | DR | DR | DR | No |
| ALTA | PESE, Delegado JE, Func. terreno, Apoyo reg. | Apoyo reg., DR | DR, Nivel Central | DR, Nivel Central | DR (con valid.), Nivel Central | Sí (mín. a DR) |
| CRITICA | PESE, Delegado JE, Func. terreno, Apoyo reg. | DR (a Central) | Nivel Central | Nivel Central | Nivel Central | Sí (a Nivel Central) |

---

## Reglas de uso de esta matriz

1. **Solo matriz base:** No define aún permisos técnicos por botón ni excepciones (ej. “DR eventual”, delegaciones). Eso se deriva después.
2. **Traducción a permisos:** Cada “Puede X” se traducirá en reglas de permisos (backend/UI) por rol y criticidad.
3. **Rol simulado:** En simulación, el “rol que actúa” (PESE, Delegado JE, etc.) se mapea a esta matriz para saber qué puede hacer en el ejercicio sin cambiar permisos reales del membership.
4. **ADMIN_PILOTO:** En simulación, ADMIN_PILOTO puede representar cualquier rol; la capacidad efectiva en el ejercicio es la del rol simulado elegido según esta matriz.

Con esta matriz queda cerrada la regla base por criticidad y rol, lista para traducir a gobernanza técnica y completar comunas y carga territorial sobre una lógica estable.
