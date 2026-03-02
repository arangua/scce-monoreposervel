# FASE 2 — CORE / DOMAIN

> Alcance aplicado: type-safety, DTO/validaciones, invariantes de dominio, boundary leaks, errores de negocio, duplicación lógica.

## Hallazgos priorizados (máx 10)

ID: F2-01  
Severidad: Crítico  
Evidencia: `api/src/auth/context.guard.ts` L72-L95 (`headerType/headerId` opcionales + fallback `OPERACION/GLOBAL` en L93).  
Diagnóstico: Existe bypass de frontera de contexto: una request autenticada puede operar sin membresía explícita, rompiendo aislamiento de dominio multi-contexto.  
Impacto si escala 10x: Riesgo de acceso transversal a datos de casos/eventos entre contextos; impacto directo en integridad/autorización.  
Propuesta zero-breaking (snippet TS estricto):
```ts
// api/src/auth/context.guard.ts
const headerType = (req.header("x-scce-context-type") || "").trim();
const headerId = (req.header("x-scce-context-id") || "").trim();

if (!membershipId && !(headerType && headerId)) {
  throw new ForbiddenException(
    "Context required: provide x-scce-membership-id or explicit context headers"
  );
}
```
Justificación de compatibilidad: No cambia contratos de payload ni rutas; solo endurece una rama actualmente permisiva y evita acceso implícito inseguro.  
Validación (test específico Jest/Vitest): `api/test/region-isolation.e2e-spec.ts` agregar caso `GET /cases` sin `membershipId` ni headers => `403`.

ID: F2-02  
Severidad: Alto  
Evidencia: `api/src/cases/cases.controller.ts` L28-L31 y L43-L47 (`userId` fallback `""`); `api/src/cases/cases.service.ts` L130-L136 y L237-L243 persiste `actorId`.  
Diagnóstico: Invariante de auditoría incompleto: se pueden generar eventos sin actor válido, degradando trazabilidad de negocio.  
Impacto si escala 10x: Aumenta volumen de eventos no auditables; dificulta investigación forense y trazas regulatorias.  
Propuesta zero-breaking (snippet TS estricto):
```ts
// api/src/cases/cases.controller.ts
import { UnauthorizedException } from "@nestjs/common";

function requireUserId(req: { user?: { userId?: string } }): string {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedException("Authenticated user is required");
  return userId;
}

const userId = requireUserId(req);
```
Justificación de compatibilidad: No rompe API pública; mantiene endpoints y contrato de respuesta, solo evita estado inválido interno.  
Validación (test específico Jest/Vitest): En `api/test/cases-events.e2e-spec.ts`, override de `JwtAuthGuard` sin `req.user` y esperar `401` en `POST /cases/:id/events`.

ID: F2-03  
Severidad: Alto  
Evidencia: `api/tsconfig.json` L21-L23 desactiva garantías estrictas (`noImplicitAny`, `strictBindCallApply`, `noFallthroughCasesInSwitch`).  
Diagnóstico: La base de type-safety del core queda debilitada, habilitando errores silenciosos y contratos implícitos.  
Impacto si escala 10x: Mayor probabilidad de defectos semánticos en flujos críticos (casos/eventos/auth) con menor detectabilidad en build.  
Propuesta zero-breaking (snippet TS estricto):
```json
{
  "compilerOptions": {
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "noFallthroughCasesInSwitch": true
  }
}
```
Justificación de compatibilidad: Cambio de compilación, no de runtime ni contratos HTTP; puede habilitarse por etapas corrigiendo archivos con errores.  
Validación (test específico Jest/Vitest): `npm --prefix api run build` debe fallar inicialmente y quedar en verde tras corregir tipado.

ID: F2-04  
Severidad: Medio  
Evidencia: `api/src/cases/cases.service.ts` L36, L53, L161, L169, L219, L244; `api/src/cases/dto.ts` L56 (`Record<string, any>`).  
Diagnóstico: Violación directa de type-safety en ruta de integridad de eventos (hash chain), aumentando riesgo de errores no tipados.  
Impacto si escala 10x: Mayor superficie de corrupción lógica por payloads inesperados y menor confianza en verificación de integridad.  
Propuesta zero-breaking (snippet TS estricto):
```ts
// api/src/cases/types.ts
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

export type EventPayload = Readonly<Record<string, JsonValue>>;
```
```ts
// reemplazos sugeridos
function stableStringify(value: JsonValue): string { /* ... */ }
payloadJson?: EventPayload;
```
Justificación de compatibilidad: Mantiene forma JSON de payload y contratos actuales; fortalece solo el tipado interno.  
Validación (test específico Jest/Vitest): agregar test unitario para `stableStringify` con objeto anidado y arrays tipados (`api/src/cases/cases.service.spec.ts`).

ID: F2-05  
Severidad: Medio  
Evidencia: `api/src/cases/dto.ts` L15-L21 (`status`/`criticality` string libre); `api/src/cases/cases.service.ts` L95-L96 defaults sin enum.  
Diagnóstico: Invariante de dominio débil: estados/criticidades no controlados pueden entrar al modelo.  
Impacto si escala 10x: Fragmentación de estados (`open`, `Open`, `CERRADO`, etc.) y reglas de negocio inconsistentes.  
Propuesta zero-breaking (snippet TS estricto):
```ts
const ALLOWED_STATUS = ["OPEN", "IN_PROGRESS", "CLOSED"] as const;
const ALLOWED_CRITICALITY = ["BAJA", "MEDIA", "ALTA"] as const;

@IsOptional()
@IsIn(ALLOWED_STATUS)
status?: (typeof ALLOWED_STATUS)[number];

@IsOptional()
@IsIn(ALLOWED_CRITICALITY)
criticality?: (typeof ALLOWED_CRITICALITY)[number];
```
Justificación de compatibilidad: No altera estructura de DTO; restringe únicamente valores inválidos que hoy generan deuda semántica.  
Validación (test específico Jest/Vitest): extender `api/test/create-case-validation.e2e-spec.ts` con `status: "INVALID"` => `400`.

ID: F2-06  
Severidad: Medio  
Evidencia: `api/src/auth/auth.controller.ts` L9-L12 usa tipo inline; `api/src/main.ts` L7 aplica `ValidationPipe` global (sin reglas de clase en login).  
Diagnóstico: Boundary leak de entrada en autenticación: falta contrato validable para credenciales (formato email/longitud).  
Impacto si escala 10x: Incremento de entradas inválidas a capa de servicio, ruido operacional y degradación de observabilidad de errores.  
Propuesta zero-breaking (snippet TS estricto):
```ts
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

@Post("auth/login")
login(@Body() body: LoginDto) {
  return this.auth.login(body.email, body.password);
}
```
Justificación de compatibilidad: Mantiene endpoint y shape esperada (`email/password`); agrega validación predecible sin romper cliente correcto.  
Validación (test específico Jest/Vitest): nuevo e2e `POST /auth/login` con email inválido => `400`.

ID: F2-07  
Severidad: Bajo  
Evidencia: `api/src/cases/dto.ts` L42-L46 (catálogo permitido de usuario); `api/src/cases/cases.service.ts` L125-L137 crea `CASE_CREATED`.  
Diagnóstico: Catálogo de eventos inconsistente entre capa DTO y capa de dominio; aumenta riesgo de drift funcional.  
Impacto si escala 10x: Dificulta mantenibilidad y generación de tooling/reportes basados en tipado de evento.  
Propuesta zero-breaking (snippet TS estricto):
```ts
export const SYSTEM_EVENT_TYPES = ["CASE_CREATED"] as const;
export const USER_EVENT_TYPES = ["COMMENT_ADDED", "INSTRUCTION_CREATED", "CASE_CLOSED"] as const;
export const ALL_EVENT_TYPES = [...SYSTEM_EVENT_TYPES, ...USER_EVENT_TYPES] as const;

export type EventType = (typeof ALL_EVENT_TYPES)[number];
```
Justificación de compatibilidad: No cambia payload ni endpoints; solo separa explícitamente eventos de sistema vs usuario.  
Validación (test específico Jest/Vitest): test unitario que verifique que `CASE_CREATED` no es aceptado por endpoint de usuario pero sí por servicio interno de creación.

ID: F2-08  
Severidad: Bajo  
Evidencia: `api/src/cases/cases.service.ts` L14-L22 y L24-L34 repiten validación de scope vacío y control `ALL/LIST`.  
Diagnóstico: Duplicación de lógica de negocio en control de alcance regional, con riesgo de divergencia futura.  
Impacto si escala 10x: Cada ajuste de policy regional requiere cambios en múltiples funciones, elevando probabilidad de inconsistencias.  
Propuesta zero-breaking (snippet TS estricto):
```ts
type RegionAccess = { mode: "ALL" } | { mode: "LIST"; scope: readonly string[] };

function resolveRegionAccess(ctx: ScceCtx): RegionAccess {
  if (!ctx.regionScopeMode || ctx.regionScopeMode === "ALL") return { mode: "ALL" };
  const scope = ctx.regionScope ?? [];
  if (scope.length === 0) throw new ForbiddenException("Membership misconfigured: empty region scope");
  return { mode: "LIST", scope };
}
```
Justificación de compatibilidad: Refactor interno puro, sin impacto en contratos externos ni datos persistidos.  
Validación (test específico Jest/Vitest): test unitario para `resolveRegionAccess` cubriendo `ALL`, `LIST + scope`, `LIST + empty`.
