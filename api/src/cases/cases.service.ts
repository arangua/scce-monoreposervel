import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { CaseStatus, DecisionStage, DataConfidence, ContextType, Prisma } from "@prisma/client";

// FASE 0: mapping UI status (español) → enum CaseStatus (BD)
export const UI_TO_DB_STATUS: Record<string, CaseStatus> = {
  "Nuevo":               CaseStatus.NEW,
  "Recepcionado por DR": CaseStatus.RECEIVED,
  "En gestión":          CaseStatus.IN_MANAGEMENT,
  "Escalado":            CaseStatus.ESCALATED,
  "Mitigado":            CaseStatus.MITIGATED,
  "Resuelto":            CaseStatus.RESOLVED,
  "Cerrado":             CaseStatus.CLOSED,
  // valores legacy del frontend anterior
  "OPEN":               CaseStatus.NEW,
  "CLOSED":             CaseStatus.CLOSED,
  "IN_PROGRESS":        CaseStatus.IN_MANAGEMENT,
};

// FASE 0: mapping inverso BD → UI status
export const DB_TO_UI_STATUS: Record<CaseStatus, string> = {
  [CaseStatus.NEW]:           "Nuevo",
  [CaseStatus.RECEIVED]:      "Recepcionado por DR",
  [CaseStatus.IN_MANAGEMENT]: "En gestión",
  [CaseStatus.ESCALATED]:     "Escalado",
  [CaseStatus.MITIGATED]:     "Mitigado",
  [CaseStatus.RESOLVED]:      "Resuelto",
  [CaseStatus.CLOSED]:        "Cerrado",
};

import { ScceCtx } from "../auth/ctx.decorator";
import { PrismaService } from "../prisma.service";
import { sha256 } from "../common/hash";
import { CreateCaseDto, CreateCaseEventDto, UpdateCaseDto } from "./dto";

function regionWhere(ctx: ScceCtx) {
  if (!ctx.regionScopeMode) return {};
  if (ctx.regionScopeMode === "ALL") return {};
  const scope = ctx.regionScope ?? [];
  if (scope.length === 0) {
    throw new ForbiddenException("Membership misconfigured: empty region scope");
  }
  return { regionCode: { in: scope } };
}

function assertRegionAllowed(ctx: ScceCtx, regionCode: string) {
  if (!ctx.regionScopeMode) return;
  if (ctx.regionScopeMode === "ALL") return;
  const scope = ctx.regionScope ?? [];
  if (scope.length === 0) {
    throw new ForbiddenException("Membership misconfigured: empty region scope");
  }
  if (!scope.includes(regionCode)) {
    throw new ForbiddenException("Region not allowed for this membership");
  }
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== "object") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort((a, b) => a.localeCompare(b));
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`);
  return `{${parts.join(",")}}`;
}

function computeEventHash(input: {
  prevHash: string;
  caseId: string;
  eventType: string;
  payloadJson: Record<string, unknown>;
  createdAtIso: string;
}) {
  const hashInput = `${input.prevHash}|${input.caseId}|${input.eventType}|${stableStringify(
    input.payloadJson
  )}|${input.createdAtIso}`;
  return sha256(hashInput);
}

@Injectable()
export class CasesService {
  constructor(private prisma: PrismaService) {}

  async list(ctx: ScceCtx) {
    return this.prisma.case.findMany({
      where: {
        contextType: ctx.contextType,
        contextId: ctx.contextId,
        ...regionWhere(ctx),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, ctx: ScceCtx) {
    const c = await this.prisma.case.findFirst({
      where: {
        id,
        contextType: ctx.contextType,
        contextId: ctx.contextId,
        ...regionWhere(ctx),
      },
    });
    if (!c) throw new NotFoundException("Caso no encontrado");
    return c;
  }

  async create(dto: CreateCaseDto, ctx: ScceCtx, actorId: string) {
    if (ctx.contextType === "OPERACION" && ctx.contextId === "GLOBAL") {
      const operacionEnabled = process.env.OPERACION_ENABLED === "true";
      if (!operacionEnabled) {
        throw new ForbiddenException(
          "OPERACION_BLOQUEADA: La creación de casos en OPERACION/GLOBAL está deshabilitada. " +
          "Para habilitarla, cambia OPERACION_ENABLED=true en el archivo .env del servidor."
        );
      }
    }
    assertRegionAllowed(ctx, dto.regionCode);

    const contextType = ctx.contextType;
    const contextId = ctx.contextId;
    // FASE 0: mapear status del DTO al enum rico
    const status: CaseStatus = UI_TO_DB_STATUS[dto.status ?? ""] ?? CaseStatus.NEW;
    const criticality = dto.criticality ?? "MEDIA";

    const created = await this.prisma.case.create({
      data: {
        contextType: contextType,
        contextId: contextId,
        title: dto.summary,
        description: null,
        createdByUserId: actorId,
        criticalityLevel: (dto.criticality === "LEVEL_1" || dto.criticality === "LEVEL_2" || dto.criticality === "LEVEL_3" || dto.criticality === "LEVEL_4")
          ? dto.criticality
          : "LEVEL_2",
        summary: dto.summary,
        status,
        criticality,
        regionCode: dto.regionCode,
        communeCode: dto.communeCode,
        localCode: dto.localCode,
        localSnapshot: (dto.localSnapshot ?? undefined) as Prisma.InputJsonValue | undefined,
        detail: dto.detail ?? null,
        assignedTo: dto.assignedTo ?? null,
        evaluation: (dto.evaluation ?? undefined) as Prisma.InputJsonValue | undefined,
        completeness: dto.completeness ?? null,
        actions: (dto.actions ?? undefined) as Prisma.InputJsonValue | undefined,
        decisions: (dto.decisions ?? undefined) as Prisma.InputJsonValue | undefined,
        instructions: (dto.instructions ?? undefined) as Prisma.InputJsonValue | undefined,
        // FASE 1: confianza del dato y orientación
        dataConfidence: (dto.dataConfidence as DataConfidence | undefined) ?? DataConfidence.UNKNOWN,
        orientation: (dto.orientation ?? undefined) as Prisma.InputJsonValue | undefined,
        // statusLegacy: columna de rollback, nullable tras migración 20260328160000
      },
    });

    // --- FIX ENTERPRISE: usar createdAt propio del evento ---
    const prevHash = "";
    const createdAt = new Date();

    const payloadJson = {
      summary: dto.summary,
      status,
      criticality,
    };

    const hash = computeEventHash({
      prevHash,
      caseId: created.id,
      eventType: "CASE_CREATED",
      payloadJson,
      createdAtIso: createdAt.toISOString(),
    });

    await this.prisma.event.create({
      data: {
        caseId: created.id,
        contextType,
        contextId,
        actorId,
        eventType: "CASE_CREATED",
        payloadJson: payloadJson as Prisma.InputJsonValue,
        prevHash: null,
        hash,
        createdAt,
      },
    });

    return created;
  }

  async getEvents(caseId: string, contextType: ContextType, contextId: string) {
    const c = await this.prisma.case.findFirst({
      where: { id: caseId, contextType, contextId },
    });
    if (!c) throw new NotFoundException("Caso no encontrado");

    const events = await this.prisma.event.findMany({
      where: { caseId },
      orderBy: { createdAt: "asc" },
    });

    // --- NUEVO (enterprise): verificación de integridad de encadenamiento ---
    let expectedPrev = "";
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const prevHash = (ev.prevHash ?? "") as string;

      // prevHash debe coincidir con el hash anterior (o "" en el primero)
      if (prevHash !== expectedPrev) {
        throw new ConflictException("Integridad de eventos fallida (prevHash inconsistente)");
      }

      const payloadJson = (ev.payloadJson ?? {}) as Record<string, unknown>;
      const expectedHash = computeEventHash({
        prevHash,
        caseId: ev.caseId,
        eventType: ev.eventType,
        payloadJson,
        createdAtIso: new Date(ev.createdAt).toISOString(),
      });

      if (expectedHash !== ev.hash) {
        throw new ConflictException("Integridad de eventos fallida (hash inválido)");
      }

      expectedPrev = ev.hash;
    }

    return events;
  }

  // --- FASE 4: actualizar campos mutables de un caso ---
  async update(id: string, dto: UpdateCaseDto, ctx: ScceCtx, actorId: string) {
    const c = await this.prisma.case.findFirst({
      where: { id, contextType: ctx.contextType, contextId: ctx.contextId, ...regionWhere(ctx) },
    });
    if (!c) throw new NotFoundException("Caso no encontrado");
    if (c.status === CaseStatus.CLOSED) throw new ConflictException("Caso cerrado");

    // Mapear status UI → DB si viene en el payload
    const newStatus: CaseStatus | undefined = dto.status
      ? (UI_TO_DB_STATUS[dto.status] ?? undefined)
      : undefined;

    // Construir el objeto de actualización solo con campos presentes
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (newStatus !== undefined)     data.status        = newStatus;
    if (dto.actions !== undefined)   data.actions       = dto.actions;
    if (dto.decisions !== undefined) data.decisions     = dto.decisions;
    if (dto.instructions !== undefined) data.instructions = dto.instructions;
    if (dto.timeline !== undefined)  data.timeline      = dto.timeline;
    if (dto.assignedTo !== undefined) data.assignedTo   = dto.assignedTo;
    if (dto.completeness !== undefined) data.completeness = dto.completeness;
    if (dto.evaluation !== undefined) data.evaluation   = dto.evaluation;
    if (dto.dataConfidence !== undefined) data.dataConfidence = dto.dataConfidence as DataConfidence;
    if (dto.orientation !== undefined) data.orientation  = dto.orientation;
    // closingMotivo se guarda en campo detail (campo libre ya existente)
    if (dto.closingMotivo !== undefined) data.detail = dto.closingMotivo;

    // Side effect: si se cierra el caso, fijar decisionStage
    if (newStatus === CaseStatus.CLOSED) data.decisionStage = DecisionStage.CLOSED;

    const updated = await this.prisma.case.update({ where: { id }, data: data as any });

    // Evento de auditoría inmutable
    const last = await this.prisma.event.findFirst({ where: { caseId: id }, orderBy: { createdAt: "desc" } });
    const prevHash = last?.hash ?? "";
    const createdAt = new Date();
    const payloadJson = { fields: Object.keys(data).filter(k => k !== "updatedAt") };
    const hash = computeEventHash({ prevHash, caseId: id, eventType: "CHANGE_CRITICALITY", payloadJson, createdAtIso: createdAt.toISOString() });
    await this.prisma.event.create({
      data: { caseId: id, contextType: ctx.contextType, contextId: ctx.contextId, actorId, eventType: "CHANGE_CRITICALITY", payloadJson: payloadJson as any, prevHash: prevHash || null, hash, createdAt },
    });

    return updated;
  }

  // --- FASE 3: avanzar etapa decisional C2 ---
  async advanceStage(
    caseId: string,
    contextType: ContextType,
    contextId: string,
    actorId: string,
    targetStage: DecisionStage,
    justification?: string,
  ) {
    const STAGE_ORDER: Record<DecisionStage, number> = {
      DETECTED: 1, VALIDATED: 2, ORIENTED: 3, CLASSIFIED: 4,
      DECIDED: 5, EXECUTING: 6, VERIFIED: 7, CLOSED: 8,
    };

    const c = await this.prisma.case.findFirst({ where: { id: caseId, contextType, contextId } });
    if (!c) throw new NotFoundException("Caso no encontrado");
    if (c.status === CaseStatus.CLOSED) throw new ConflictException("Caso cerrado");

    const currentOrder = STAGE_ORDER[c.decisionStage] ?? 1;
    const targetOrder  = STAGE_ORDER[targetStage];
    if (!targetOrder) throw new ConflictException("Etapa inválida");
    if (targetOrder <= currentOrder) {
      throw new ConflictException(
        `No se puede retroceder de ${c.decisionStage} a ${targetStage}`
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Actualizar etapa en el caso
      const updated = await tx.case.update({
        where: { id: caseId },
        data: { decisionStage: targetStage, updatedAt: new Date() },
      });

      // Registrar evento inmutable
      const last = await tx.event.findFirst({ where: { caseId }, orderBy: { createdAt: "desc" } });
      const prevHash = last?.hash ?? "";
      const createdAt = new Date();
      const payloadJson = {
        from: c.decisionStage,
        to: targetStage,
        ...(justification ? { justification } : {}),
      };
      const hash = computeEventHash({ prevHash, caseId, eventType: "STAGE_ADVANCED", payloadJson, createdAtIso: createdAt.toISOString() });

      await tx.event.create({
        data: {
          caseId, contextType, contextId, actorId,
          eventType: "STAGE_ADVANCED",
          payloadJson: payloadJson as any,
          prevHash: prevHash || null,
          hash, createdAt,
        },
      });

      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  // --- agregar evento append-only (comentario / instrucción / cierre) ---
  async addEvent(
    caseId: string,
    contextType: ContextType,
    contextId: string,
    actorId: string,
    dto: CreateCaseEventDto
  ) {
    // Verifica caso en el contexto
    const c = await this.prisma.case.findFirst({
      where: { id: caseId, contextType, contextId },
    });
    if (!c) throw new NotFoundException("Caso no encontrado");

    // --- NUEVO (enterprise): caso cerrado no admite nuevos eventos ---
    if (c.status === CaseStatus.CLOSED) {
      throw new ConflictException("Caso cerrado: no admite nuevos eventos");
    }

    return this.prisma.$transaction(
      async (tx) => {
        if (dto.eventType === "CASE_CLOSED") {
          const fresh = await tx.case.findFirst({
            where: { id: caseId, contextType, contextId },
          });
          if (!fresh) throw new NotFoundException("Caso no encontrado");
          const closeInput = buildCloseValidationInputFromOperationalState(
            fresh.operationalState,
            dto.reason,
          );
          const closeErr = validateCaseClosePreconditions(closeInput);
          if (closeErr) {
            throw new BadRequestException(`validateCaseClosePreconditions:${closeErr}`);
          }
        }

        // Último evento del caso para encadenar prevHash
        const last = await tx.event.findFirst({
          where: { caseId },
          orderBy: { createdAt: "desc" },
        });

        const prevHash = last?.hash ?? "";
        const createdAt = new Date();

        // Payload libre, pero si es cierre forzamos lo mínimo
        let payloadJson: Record<string, unknown> = (dto.payloadJson ?? {}) as Record<string, unknown>;

        if (dto.eventType === "CASE_CLOSED") {
          payloadJson = {
            reason: dto.reason,
            ...(dto.note ? { note: dto.note } : {}),
            ...payloadJson,
          };
        }

        const hash = computeEventHash({
          prevHash,
          caseId,
          eventType: dto.eventType,
          payloadJson,
          createdAtIso: createdAt.toISOString(),
        });

        const ev = await tx.event.create({
          data: {
            caseId,
            contextType,
            contextId,
            actorId,
            eventType: dto.eventType,
            payloadJson: payloadJson as Prisma.InputJsonValue,
            prevHash: prevHash || null,
            hash,
            createdAt,
          },
        });

        // Side-effect controlado: al cerrar, actualiza status + decisionStage
        if (dto.eventType === "CASE_CLOSED") {
          await tx.case.update({
            where: { id: caseId },
            data: {
              status: CaseStatus.CLOSED,
              decisionStage: DecisionStage.CLOSED,
              updatedAt: new Date(),
            },
          });
        }

        return ev;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
  }
}
