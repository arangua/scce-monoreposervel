import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { CaseStatus, ContextType, CriticalityLevel, EventType, Prisma } from "@prisma/client";

import { ScceCtx } from "../auth/ctx.decorator";
import { PrismaService } from "../prisma.service";
import { sha256 } from "../common/hash";
import { CreateCaseDto, CreateCaseEventDto } from "./dto";
import {
  operationalValidationAllowsClosure,
  type TimelineEventLike,
  type ActionLike,
} from "./operationalValidationClosure";

/** Tipo mínimo del cliente de transacción para addEvent (evita acoplamiento a Prisma interno). */
type AddEventTx = Pick<PrismaService, "event" | "case">;

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

function toCaseStatus(s: string): CaseStatus {
  const v = s.toUpperCase();
  if (["NEW", "ACKED", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(v)) {
    return v as CaseStatus;
  }
  return "NEW";
}

function toCriticalityLevel(c: string): CriticalityLevel {
  const v = (c ?? "").toUpperCase().replaceAll("Í", "I");
  if (v === "CRITICA") return "LEVEL_4";
  if (v === "ALTA") return "LEVEL_3";
  if (v === "BAJA") return "LEVEL_1";
  return "LEVEL_2";
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

function closureRejectionMessage(reason: string): string {
  const messages: Record<string, string> = {
    last_fail:
      "No se puede cerrar: la última validación operacional es Fallo. Registre una acción y luego una nueva validación OK u Observaciones.",
    fail_exists_no_action_after:
      "No se puede cerrar: hubo Fallo en validación operacional y no existe acción posterior. Registre una acción y luego una nueva validación OK u Observaciones.",
    action_after_fail_but_no_ok_obs_after_action:
      "No se puede cerrar: tras el Fallo hay acción pero falta una nueva validación operacional OK u Observaciones.",
  };
  return (
    messages[reason] ??
    "No se puede cerrar: la validación operacional no cumple la secuencia requerida."
  );
}

async function validateCaseClosedPreconditions(
  tx: AddEventTx,
  caseId: string,
  c: { assignedTo: string | null }
): Promise<void> {
  const assignedToTrimmed = (c.assignedTo ?? "").trim();
  if (!assignedToTrimmed) {
    throw new BadRequestException(
      "Debe asignarse un responsable actual del caso antes del cierre"
    );
  }

  const hasAction = await tx.event.findFirst({
    where: {
      caseId,
      eventType: { in: [EventType.ACTION_ADDED] },
    },
    select: { id: true },
  });
  if (!hasAction) {
    throw new BadRequestException(
      "No se puede cerrar un caso sin al menos una acción registrada"
    );
  }

  const hasOpVal = await tx.event.findFirst({
    where: { caseId, eventType: EventType.OPERATIONAL_VALIDATION },
    select: { id: true },
  });
  if (!hasOpVal) {
    throw new BadRequestException(
      "No se puede cerrar un caso sin validación operacional"
    );
  }

  const opValEvents = await tx.event.findMany({
    where: { caseId, eventType: EventType.OPERATIONAL_VALIDATION },
    select: { createdAt: true, payloadJson: true },
  });
  const actionEvents = await tx.event.findMany({
    where: {
      caseId,
      eventType: { in: [EventType.ACTION_ADDED] },
    },
    select: { createdAt: true },
  });
  const timeline: TimelineEventLike[] = opValEvents.map((e) => ({
    type: "OPERATIONAL_VALIDATION",
    at: new Date(e.createdAt).toISOString(),
    result: (e.payloadJson as { result?: string })?.result as
      | "OK"
      | "OBSERVATIONS"
      | "FAIL"
      | undefined,
  }));
  const actions: ActionLike[] = actionEvents.map((e) => ({
    at: new Date(e.createdAt).toISOString(),
  }));
  const closureResult = operationalValidationAllowsClosure(timeline, actions);
  if (!closureResult.isOperationalValidationSatisfied) {
    throw new BadRequestException(
      closureRejectionMessage(closureResult.reason)
    );
  }
}

const VALID_OPERATIONAL_RESULTS = ["OK", "OBSERVATIONS", "FAIL"] as const;

function buildOperationalValidationPayload(base: Record<string, any>): Record<string, any> {
  const result = base?.result;
  const note = base?.note;
  if (!VALID_OPERATIONAL_RESULTS.includes(result)) {
    throw new BadRequestException(
      "payloadJson.result debe ser OK, OBSERVATIONS o FAIL"
    );
  }
  if (result !== "OK" && (!note || String(note).trim().length === 0)) {
    throw new BadRequestException(
      "payloadJson.note es obligatorio cuando result es OBSERVATIONS o FAIL"
    );
  }
  return { result, ...(note ? { note: String(note).trim() } : {}) };
}

function buildCaseClosedPayload(dto: CreateCaseEventDto, base: Record<string, any>): Record<string, any> {
  return {
    reason: dto.reason,
    ...(dto.note ? { note: dto.note } : {}),
    ...base,
  };
}

function buildAssignmentChangedPayload(base: Record<string, any>): Record<string, any> {
  const assignedTo = String(base?.assignedTo ?? "").trim();
  return { assignedTo };
}

function buildDecisionAddedPayload(base: Record<string, any>): Record<string, any> {
  const fundament = String(base?.fundament ?? "").trim();
  if (!fundament) {
    throw new BadRequestException(
      "payloadJson.fundament es obligatorio para DECISION_ADDED"
    );
  }
  const who = String(base?.who ?? "").trim();
  const at = String(base?.at ?? "").trim();
  return {
    fundament,
    ...(who ? { who } : {}),
    ...(at ? { at } : {}),
  };
}

function buildEventPayload(dto: CreateCaseEventDto): Record<string, any> {
  const base = dto.payloadJson ?? {};
  switch (dto.eventType) {
    case "OPERATIONAL_VALIDATION":
      return buildOperationalValidationPayload(base);
    case "CASE_CLOSED":
      return buildCaseClosedPayload(dto, base);
    case "ASSIGNMENT_CHANGED":
      return buildAssignmentChangedPayload(base);
    case "DECISION_ADDED":
      return buildDecisionAddedPayload(base);
    default:
      return base;
  }
}

async function applyPostEventSideEffects(
  tx: AddEventTx,
  eventType: string,
  caseId: string,
  payloadJson: Record<string, any>
): Promise<void> {
  if (eventType === "CASE_CLOSED") {
    await tx.case.update({
      where: { id: caseId },
      data: { status: CaseStatus.CLOSED, updatedAt: new Date() },
    });
    return;
  }
  if (eventType === "RESOLVE") {
    await tx.case.update({
      where: { id: caseId },
      data: { status: CaseStatus.RESOLVED, updatedAt: new Date() },
    });
    return;
  }
  if (eventType === "ASSIGNMENT_CHANGED") {
    const assignedTo = (payloadJson as { assignedTo?: string }).assignedTo ?? "";
    await tx.case.update({
      where: { id: caseId },
      data: { assignedTo, updatedAt: new Date() },
    });
  }
}

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

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
    assertRegionAllowed(ctx, dto.regionCode);

    const contextType = ctx.contextType;
    const contextId = ctx.contextId;
    const status = toCaseStatus(dto.status ?? "NEW");
    const criticality = dto.criticality ?? "MEDIA";

    const created = await this.prisma.case.create({
      data: {
        contextType: contextType,
        contextId: contextId,
        title: dto.summary?.slice(0, 200) ?? "Sin título",
        summary: dto.summary,
        status,
        criticality,
        criticalityLevel: toCriticalityLevel(dto.criticality ?? "MEDIA"),
        createdByUserId: actorId || "system",
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
        eventType: EventType.CASE_CREATED,
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
    for (const ev of events) {
      const prevHash = ev.prevHash ?? "";

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
    if (c.status === CaseStatus.CLOSED) {
      throw new ConflictException("Caso cerrado: no admite nuevos eventos");
    }

    // OPERATIONAL_VALIDATION solo cuando caso está Resuelto
    if (dto.eventType === "OPERATIONAL_VALIDATION") {
      if (c.status !== CaseStatus.RESOLVED) {
        throw new BadRequestException(
          "Validación operativa solo permitida cuando el caso está en Resuelto"
        );
      }
    }

    return this.prisma.$transaction(
      async (tx) => {
        if (dto.eventType === "CASE_CLOSED") {
          await validateCaseClosedPreconditions(tx, caseId, c);
        }

        const last = await tx.event.findFirst({
          where: { caseId },
          orderBy: { createdAt: "desc" },
        });
        const prevHash = last?.hash ?? "";
        const createdAt = new Date();
        const payloadJson = buildEventPayload(dto);

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
            eventType: dto.eventType as EventType,
            payloadJson: payloadJson as any,
            prevHash: prevHash || null,
            hash,
            createdAt,
          },
        });

        await applyPostEventSideEffects(tx, dto.eventType, caseId, payloadJson);
        return ev;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
  }
}
