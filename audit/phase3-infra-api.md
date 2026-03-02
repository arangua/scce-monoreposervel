# FASE 3 — INFRAESTRUCTURA / API

> Alcance aplicado: persistencia/ORM, seguridad endpoints, Auth/AuthZ, errores HTTP, logging/trazabilidad, performance básico, configuración de entorno/secrets.

## Hallazgos priorizados (máx 10)

ID: F3-01
Severidad: Crítico
Evidencia: `api/src/auth/auth.module.ts` L9-L12 y `api/src/auth/jwt.strategy.ts` L8-L11 usan fallback de secreto JWT hardcodeado (`"SCCE_DEV_SECRET_CHANGE_ME"`).
Diagnóstico: Si `JWT_SECRET` no está definido, la API firma/valida tokens con un secreto conocido, habilitando falsificación de JWT en producción.
Impacto si escala 10x: Compromiso masivo de autenticación y potencial acceso no autorizado transversal.
Propuesta zero-breaking (snippet TS estricto):
```ts
// api/src/auth/auth.module.ts
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("JWT_SECRET is required at startup");
}

JwtModule.register({
  secret: jwtSecret,
  signOptions: { expiresIn: 43200 },
});
```
Justificación de compatibilidad: No cambia contratos HTTP ni payloads; sólo falla temprano en configuración insegura.
Validación (test específico Jest/Vitest): test bootstrap que espere throw cuando `process.env.JWT_SECRET` esté vacío.

ID: F3-02
Severidad: Alto
Evidencia: `api/src/main.ts` L8-L13 configura `ValidationPipe` y CORS, pero no registra filtros globales de excepción ni normalización de error HTTP.
Diagnóstico: La API depende del formateo por defecto de Nest para errores; esto dificulta contrato uniforme de errores para clientes y trazabilidad operativa.
Impacto si escala 10x: Mayor costo de soporte por respuestas heterogéneas y diagnóstico más lento en incidentes.
Propuesta zero-breaking (snippet TS estricto):
```ts
// api/src/common/http-exception.filter.ts
@Catch(HttpException)
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const status = exception.getStatus();

    res.status(status).json({
      statusCode: status,
      path: req.url,
      timestamp: new Date().toISOString(),
      message: exception.message,
    });
  }
}
```
Justificación de compatibilidad: Mantiene semántica de status codes y excepciones existentes; sólo estandariza shape del error.
Validación (test específico Jest/Vitest): e2e `GET /cases/:id` inexistente => `404` con campos `statusCode/path/timestamp/message`.

ID: F3-03
Severidad: Alto
Evidencia: `api/src/cases/cases.service.ts` L66-L75 (`list`) y `api/src/contexts.controller.ts` L14-L19 (`membership.findMany`) no usan `take/skip` ni límites.
Diagnóstico: Endpoints de listado sin paginación pueden crecer sin control y degradar latencia/memoria.
Impacto si escala 10x: Riesgo de timeouts, saturación de DB/API y picos de memoria por respuestas volumétricas.
Propuesta zero-breaking (snippet TS estricto):
```ts
// api/src/cases/cases.controller.ts
@Get()
list(
  @Ctx() ctx: ScceCtx,
  @Query("limit") limitRaw?: string,
  @Query("offset") offsetRaw?: string
) {
  const limit = Math.min(100, Math.max(1, Number(limitRaw ?? "20") || 20));
  const offset = Math.max(0, Number(offsetRaw ?? "0") || 0);
  return this.cases.list(ctx, { limit, offset });
}
```
Justificación de compatibilidad: Parámetros opcionales; clientes actuales siguen funcionando con defaults.
Validación (test específico Jest/Vitest): e2e `GET /cases?limit=10&offset=0` devuelve ≤ 10 elementos.

ID: F3-04
Severidad: Medio
Evidencia: `api/src/main.ts` L7-L13 no activa shutdown hooks de Nest; `api/src/prisma.service.ts` L6-L11 sí implementa `OnModuleDestroy`.
Diagnóstico: Con cierre de proceso (SIGTERM), no hay evidencia de `app.enableShutdownHooks()` para garantizar flujo limpio de cierre.
Impacto si escala 10x: Mayor probabilidad de cierres abruptos y errores transitorios en despliegues/rollouts.
Propuesta zero-breaking (snippet TS estricto):
```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  // ...
}
```
Justificación de compatibilidad: No altera endpoints ni contratos; mejora robustez operacional en lifecycle.
Validación (test específico Jest/Vitest): test de integración que invoque cierre de app y verifique `prisma.$disconnect` llamado.

ID: F3-05
Severidad: Medio
Evidencia: `api/src/contexts.controller.ts` L14-L19 retorna membresías completas sin `select`; modelo `Membership` incluye campos sensibles de autorización (`role`, `regionScope`).
Diagnóstico: Sobreexposición de datos de membresía en API de contexto, sin minimización explícita por respuesta.
Impacto si escala 10x: Mayor superficie de exposición de metadatos de autorización y acoplamiento de clientes a estructura interna.
Propuesta zero-breaking (snippet TS estricto):
```ts
const ms = await this.prisma.membership.findMany({
  where: { userId },
  orderBy: { createdAt: "asc" },
  select: {
    id: true,
    contextType: true,
    contextId: true,
    role: true,
    regionScopeMode: true,
    regionScope: true,
    createdAt: true,
  },
});
```
Justificación de compatibilidad: Mantiene endpoint y campos relevantes; explicita y controla contrato de salida.
Validación (test específico Jest/Vitest): e2e `GET /contexts` valida que no aparezcan columnas no seleccionadas si se agregan en modelo futuro.

ID: F3-06
Severidad: Medio
Evidencia: `api/src/main.ts` L9-L12 habilita CORS por `origin` único configurable, pero no hay evidencia de versionado/prefijo global de API (`setGlobalPrefix`).
Diagnóstico: Superficie API sin namespace global complica evolución de versión y gobernanza de rutas públicas.
Impacto si escala 10x: Mayor costo para introducir cambios de versión sin afectar consumidores actuales.
Propuesta zero-breaking (snippet TS estricto):
```ts
// rollout gradual
if (process.env.API_PREFIX_ENABLED === "true") {
  app.setGlobalPrefix("api");
}
```
Justificación de compatibilidad: Feature-flag evita breaking inmediato; habilitación progresiva por entorno.
Validación (test específico Jest/Vitest): e2e con flag activo verifica `GET /api/health` => 200.

ID: F3-07
Severidad: Bajo
Evidencia: `api/src/health.controller.ts` L5-L8 responde `{ ok: true }` sin chequeo de dependencias (DB).
Diagnóstico: Healthcheck no distingue liveness de readiness; puede reportar sano aun con DB caída.
Impacto si escala 10x: Falsos positivos en monitoreo y enruteo de tráfico a instancias no listas.
Propuesta zero-breaking (snippet TS estricto):
```ts
@Get()
async getHealth() {
  await this.prisma.$queryRaw`SELECT 1`;
  return { ok: true, db: "up" as const };
}
```
Justificación de compatibilidad: Conserva `ok: true`; agrega señal de readiness sin romper consumidores existentes.
Validación (test específico Jest/Vitest): e2e con DB disponible retorna 200; con DB caída retorna 5xx controlado.

## Pendientes por evidencia (fase 3)

- Configuración de secretos por entorno (Vault/SSM/KMS), rotación y masking en logs: **PENDIENTE POR EVIDENCIA**.
- Políticas de despliegue sin downtime (rolling/canary/blue-green): **PENDIENTE POR EVIDENCIA**.
- Config de observabilidad externa (APM, trazas distribuidas, correlación): **PENDIENTE POR EVIDENCIA**.
