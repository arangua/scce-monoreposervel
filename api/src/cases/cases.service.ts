import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { ContextType, Prisma } from "@prisma/client";

import { ScceCtx } from "../auth/ctx.decorator";
import { PrismaService } from "../prisma.service";
import { sha256 } from "../common/hash";
import { CreateCaseDto, CreateCaseEventDto } from "./dto";

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

function stableStringify(value: any): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (typeof value !== "object") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }

  const keys = Object.keys(value).sort((a, b) => a.localeCompare(b));
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`);
  return `{${parts.join(",")}}`;
}

function computeEventHash(input: {
  prevHash: string;
  caseId: string;
  eventType: string;
  payloadJson: Record<string, any>;
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

  async list(ctx: ScceCtx, pagination: { take: number; skip: number }) {
    return this.prisma.case.findMany({
      where: {
        contextType: ctx.contextType,
        contextId: ctx.contextId,
        ...regionWhere(ctx),
      },
      orderBy: { createdAt: "desc" },
      take: pagination.take,
      skip: pagination.skip,
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
    assertRegionAllowed(ctx, dto.regionCode);

    const contextType = ctx.contextType;
    const contextId = ctx.contextId;
    const status = dto.status ?? "OPEN";
    const criticality = dto.criticality ?? "MEDIA";

    const created = await this.prisma.case.create({
      data: {
        contextType: contextType,
        contextId: contextId,
        summary: dto.summary,
        status,
        criticality,
        regionCode: dto.regionCode,
        communeCode: dto.communeCode,
        localCode: dto.localCode,
        localSnapshot: (dto.localSnapshot ?? undefined) as Prisma.InputJsonValue | undefined,
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
        payloadJson: payloadJson as any,
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
      const ev: any = events[i];
      const prevHash = (ev.prevHash ?? "") as string;

      // prevHash debe coincidir con el hash anterior (o "" en el primero)
      if (prevHash !== expectedPrev) {
        throw new ConflictException("Integridad de eventos fallida (prevHash inconsistente)");
      }

      const payloadJson = (ev.payloadJson ?? {}) as Record<string, any>;
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
    if (c.status === "CLOSED") {
      throw new ConflictException("Caso cerrado: no admite nuevos eventos");
    }

    return this.prisma.$transaction(
      async (tx) => {
        // Último evento del caso para encadenar prevHash
        const last = await tx.event.findFirst({
          where: { caseId },
          orderBy: { createdAt: "desc" },
        });

        const prevHash = last?.hash ?? "";
        const createdAt = new Date();

        // Payload libre, pero si es cierre forzamos lo mínimo
        let payloadJson: Record<string, any> = (dto.payloadJson ?? {}) as any;

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
            payloadJson: payloadJson as any,
            prevHash: prevHash || null,
            hash,
            createdAt,
          },
        });

        // Side-effect controlado: al cerrar, actualiza status del caso (sin romper append-only)
        if (dto.eventType === "CASE_CLOSED") {
          await tx.case.update({
            where: { id: caseId },
            data: { status: "CLOSED", updatedAt: new Date() },
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
