# Política de Simulación SCCE — Propuesta consolidada

## 1. Propósito

La simulación del SCCE tiene por objeto:

- entrenar a Directores Regionales y equipos
- probar flujos operativos y de gobernanza
- validar escalamiento entre niveles
- detectar brechas de interfaz, permisos y trazabilidad
- hacerlo **sin contaminar la operación real**

## 2. Regla general

**Toda actividad de prueba, entrenamiento o ejercicio debe ejecutarse en SIMULACIÓN, nunca en OPERACIÓN.**

Regla simple:

- **si es prueba → SIMULACIÓN**
- **si es real → OPERACIÓN**

## 3. Fases de habilitación

### Fase 1

Quedan habilitados para usar la simulación:

- Directores Regionales
- ADMIN_PILOTO
- funcionarios de equipos regionales autorizados por cada Director Regional, solo para ejercicios de simulación

Objetivo de esta fase:

- estabilizar el flujo
- probar roles
- ajustar gobernanza
- corregir UX
- validar entrenamiento regional

### Fase 2

Se incorpora el Nivel Central real como usuario de simulación.

Objetivo de esta fase:

- validar conducción superior
- probar escalamiento multi-nivel
- revisar atribuciones de decisión, validación y cierre
- preparar despliegue institucional más amplio

## 4. Alcance por perfil

### Director Regional

**Puede:**

- usar OPERACIÓN de su región
- usar SIMULACIÓN de su región
- compartir ejercicios de simulación con su equipo autorizado
- participar en pruebas de flujo y gobernanza regional

**No debe:**

- usar simulación para alterar operación real
- reemplazar por defecto atribuciones reales de otros niveles fuera de la lógica del ejercicio

### ADMIN_PILOTO

**Puede:**

- usar simulación regional
- usar simulación integral/global
- preparar escenarios de prueba
- habilitar y administrar ejercicios
- probar cualquier rol en contexto de simulación

**No debe:**

- reemplazar automáticamente la autoridad institucional real en modo operación

### Equipos regionales autorizados

Pueden participar **solo en simulación** actuando en roles asignados para el ejercicio, por ejemplo:

- PESE
- Delegado de Junta Electoral
- funcionario en terreno
- apoyo regional
- otros roles operativos definidos por el proyecto

### Nivel Central real

Se incorpora en Fase 2 para participar directamente en simulaciones institucionales.

## 5. Roles simulados

Desde Fase 1 debe existir la posibilidad de simular, al menos, estos roles:

- PESE
- Delegado de Junta Electoral
- funcionario en terreno
- Director Regional
- Nivel Central

**Regla clave:** una cosa es el **usuario real** que entra al sistema; otra cosa es el **rol simulado** que representa en el ejercicio.

## 6. Regla territorial

- **Directores Regionales:** deben simular principalmente en su propia región.
- **ADMIN_PILOTO:** debe poder simular por región, en forma integral/global, y como cualquier rol necesario para pruebas controladas.

## 7. Relación entre contexto y simulación

Se distinguen dos niveles:

| Concepto | Descripción |
|----------|-------------|
| **Contexto** | Define dónde viven los datos del ejercicio: `SIMULACION` / `e2e` u otros contextos de simulación que se creen. |
| **Módulo o vista Simulación** | Herramienta para generar escenarios, preparar incidentes y cargarlos al Dashboard. |

Por tanto:

- el **contexto** define el entorno de datos
- la **vista Simulación** define una función de entrenamiento

## 8. Regla de datos

Los ejercicios de simulación:

- no deben nacer en OPERACIÓN
- deben quedar identificados como simulación
- deben ser separables de los casos reales
- deben poder administrarse sin afectar trazabilidad operacional

## 9. Regla de gobernanza en simulación

La simulación puede flexibilizar permisos para fines de prueba, pero debe respetar la lógica institucional del modelo:

- el sistema puede sugerir
- el usuario prueba acciones según rol simulado
- los actos sensibles no deben confundirse con decisiones reales
- la simulación no reemplaza la gobernanza del modo real

## 10. Regla de uso compartido

Cada Director Regional puede compartir la aplicación con funcionarios de su equipo para ejercicios de simulación, asignándoles roles simulados específicos, con el fin de reproducir situaciones reales de trabajo colaborativo.

Esto incluye, por ejemplo:

- un funcionario como PESE
- otro como Delegado JE
- otro como apoyo o terreno
- el Director Regional como conductor del caso

## 11. Principio rector final

La simulación del SCCE debe permitir probar roles, decisiones, escalamiento y coordinación realista, **sin afectar la operación real ni debilitar la gobernanza institucional**.

---

## Implicancias técnicas: memberships y contextos

Documento de referencia para implementación. Mapeo entre política y artefactos actuales del sistema.

### Modelo actual (Prisma)

- **ContextType:** `OPERACION` | `SIMULACION`
- **Role:** `ADMIN_PILOTO` | `DR` | `EQUIPO_REGIONAL` | `NIVEL_CENTRAL_SIM`
- **Membership:** (userId, contextType, contextId, regionCode, role, regionScopeMode, regionScope)

### Contextos de simulación definidos

| contextType | contextId   | Uso |
|-------------|------------|-----|
| SIMULACION  | e2e        | Pruebas E2E, ejercicios por región, entrenamiento DR (Fase 1). Ya implementado en seed. |
| SIMULACION  | integral   | Simulación global/integral para ADMIN_PILOTO (opcional Fase 1). |
| SIMULACION  | archivo-prueba | Casos archivados desde OPERACIÓN (no creación nueva). |

### Memberships por fase

#### Fase 1 (actual)

| Usuario / perfil | contextType | contextId | regionCode | role | Notas |
|------------------|-------------|-----------|------------|------|--------|
| Cada DR          | OPERACION   | GLOBAL    | &lt;región&gt; | DR   | Operación real. |
| Cada DR          | SIMULACION  | e2e      | &lt;región&gt; | DR   | Simulación en su región. **Implementado en seed.** |
| Admin piloto     | OPERACION   | GLOBAL    | TRP / ADM  | DR / ADMIN_PILOTO | Operación real. |
| Admin piloto     | SIMULACION  | e2e      | TRP        | DR   | Simulación regional. **Implementado en seed.** |
| Admin piloto     | SIMULACION  | integral | ADM        | ADMIN_PILOTO | Simulación global. **Pendiente de agregar al seed.** |
| Equipo regional (autorizado) | SIMULACION | e2e | &lt;región&gt; | EQUIPO_REGIONAL | Solo simulación, rol asignado por DR. **Pendiente: usuarios y seed.** |

#### Fase 2

| Usuario / perfil | contextType | contextId | role | Notas |
|------------------|-------------|-----------|------|--------|
| Nivel Central    | SIMULACION  | e2e o integral | NIVEL_CENTRAL_SIM | **Pendiente: usuarios y memberships.** |

### Rol real vs rol simulado

- **Rol real (Role en Membership):** el que define permisos en el sistema (DR, ADMIN_PILOTO, EQUIPO_REGIONAL, NIVEL_CENTRAL_SIM).
- **Rol simulado:** el que el usuario representa en el ejercicio (PESE, Delegado JE, terreno, DR, Nivel Central). Puede implementarse como:
  - atributo en sesión o en el contexto del ejercicio (futuro), o
  - etiqueta/selector en la vista Simulación sin cambiar permisos de backend.

### Checklist de implementación

- [x] SIMULACION / e2e para DR y admin (seed).
- [x] Regla “prueba → SIMULACION” en creación de casos (E2E y seed).
- [ ] SIMULACION / integral para ADMIN_PILOTO (opcional Fase 1).
- [ ] Usuarios EQUIPO_REGIONAL con membership solo SIMULACION/e2e (Fase 1).
- [ ] Usuarios NIVEL_CENTRAL_SIM y memberships SIMULACION (Fase 2).
- [ ] Rol simulado (PESE, Delegado JE, etc.) en UI/contexto de ejercicio (Fase 1–2).

Este apartado se actualiza según avance la implementación.
