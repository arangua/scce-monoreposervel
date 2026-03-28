/**
 * catalog.service.ts
 * Lógica de negocio para el catálogo de locales de votación.
 *
 * Operaciones:
 *  - list(ctx)                  → todos los locales del contexto
 *  - importBulk(ctx, items, by) → reemplaza los locales del contexto (modo elección o simulación)
 *  - toggle(ctx, id, field, by) → activa/desactiva un local
 */
import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { type ScceCtx } from "../auth/ctx.decorator";
import { type ImportLocalDto } from "./dto";

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  /** Retorna todos los locales del contexto, ordenados por región/comuna/nombre */
  async list(ctx: ScceCtx) {
    return this.prisma.votingLocal.findMany({
      where: {
        contextType: ctx.contextType,
        contextId:   ctx.contextId,
      },
      orderBy: [
        { regionCode:  "asc" },
        { communeCode: "asc" },
        { nombre:      "asc" },
      ],
    });
  }

  /**
   * Importa un lote de locales desde Excel.
   * modo "eleccion"   → reemplaza locales con activoEnEleccionActual=true
   * modo "simulacion" → reemplaza locales con activoEnEleccionActual=false
   *
   * Estrategia: DELETE + INSERT dentro de una transacción.
   * Los locales del otro modo no se tocan.
   */
  async importBulk(
    ctx: ScceCtx,
    items: ImportLocalDto[],
    modo: "eleccion" | "simulacion",
    createdBy: string,
  ) {
    const esEleccion = modo === "eleccion";
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // 1. Eliminar los locales del modo que se está reemplazando
      await tx.votingLocal.deleteMany({
        where: {
          contextType:            ctx.contextType,
          contextId:              ctx.contextId,
          activoEnEleccionActual: esEleccion,
        },
      });

      // 2. Insertar los nuevos en lotes de 500 (evita queries enormes)
      const BATCH = 500;
      for (let i = 0; i < items.length; i += BATCH) {
        const slice = items.slice(i, i + BATCH);
        await tx.votingLocal.createMany({
          data: slice.map((item) => ({
            contextType:            ctx.contextType,
            contextId:              ctx.contextId,
            regionCode:             item.regionCode,
            communeCode:            item.communeCode,
            nombre:                 item.nombre,
            direccion:              item.direccion ?? null,
            mesas:                  item.mesas ?? null,
            activoGlobal:           true,
            activoEnEleccionActual: esEleccion,
            origenSeed:             false,
            fechaCreacion:          now,
            createdBy,
          })),
        });
      }
    });

    // Retornar conteo para confirmación
    const total = await this.prisma.votingLocal.count({
      where: {
        contextType:            ctx.contextType,
        contextId:              ctx.contextId,
        activoEnEleccionActual: esEleccion,
      },
    });

    return { importados: total, modo };
  }

  /** Desactiva globalmente un local (soft delete) */
  async deactivate(ctx: ScceCtx, id: string, createdBy: string) {
    const local = await this.prisma.votingLocal.findFirst({
      where: { id, contextType: ctx.contextType, contextId: ctx.contextId },
    });
    if (!local) throw new NotFoundException(`Local ${id} no encontrado`);

    return this.prisma.votingLocal.update({
      where: { id },
      data: {
        activoGlobal:          false,
        activoEnEleccionActual: false,
        fechaDesactivacion:    new Date(),
      },
    });
  }

  /** Reactiva un local previamente desactivado */
  async reactivate(ctx: ScceCtx, id: string) {
    const local = await this.prisma.votingLocal.findFirst({
      where: { id, contextType: ctx.contextType, contextId: ctx.contextId },
    });
    if (!local) throw new NotFoundException(`Local ${id} no encontrado`);

    return this.prisma.votingLocal.update({
      where: { id },
      data: {
        activoGlobal:       true,
        fechaDesactivacion: null,
      },
    });
  }

  /** Alterna la participación de un local en la elección activa */
  async toggleEleccion(ctx: ScceCtx, id: string) {
    const local = await this.prisma.votingLocal.findFirst({
      where: { id, contextType: ctx.contextType, contextId: ctx.contextId },
    });
    if (!local) throw new NotFoundException(`Local ${id} no encontrado`);
    if (!local.activoGlobal) {
      throw new Error("No se puede activar en elección: local desactivado globalmente");
    }

    return this.prisma.votingLocal.update({
      where: { id },
      data: { activoEnEleccionActual: !local.activoEnEleccionActual },
    });
  }
}
