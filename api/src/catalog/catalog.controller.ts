/**
 * catalog.controller.ts
 * Endpoints REST para el catálogo de locales de votación.
 *
 * GET    /catalog          → lista todos los locales del contexto
 * POST   /catalog/import   → importa lote desde Excel (reemplaza por modo)
 * PATCH  /catalog/:id/deactivate   → desactiva un local
 * PATCH  /catalog/:id/reactivate   → reactiva un local
 * PATCH  /catalog/:id/toggle-eleccion → alterna participación en elección
 */
import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { ContextGuard } from "../auth/context.guard";
import { Ctx, type ScceCtx } from "../auth/ctx.decorator";
import { CatalogService } from "./catalog.service";
import { ImportBulkDto } from "./dto";

type AuthedRequest = { user?: { userId: string } };

@Controller("catalog")
@UseGuards(JwtAuthGuard, ContextGuard)
export class CatalogController {
  constructor(private catalog: CatalogService) {}

  /** Lista todos los locales del contexto activo */
  @Get()
  list(@Ctx() ctx: ScceCtx) {
    return this.catalog.list(ctx);
  }

  /**
   * Importa un lote de locales desde Excel.
   * Body: { modo: "eleccion"|"simulacion", items: ImportLocalDto[] }
   * Reemplaza completamente los locales del modo indicado.
   */
  @Post("import")
  importBulk(
    @Body() dto: ImportBulkDto,
    @Ctx() ctx: ScceCtx,
    @Req() req: AuthedRequest,
  ) {
    const userId = req.user?.userId ?? "";
    return this.catalog.importBulk(ctx, dto.items, dto.modo, userId);
  }

  /** Desactiva globalmente un local */
  @Patch(":id/deactivate")
  deactivate(
    @Param("id") id: string,
    @Ctx() ctx: ScceCtx,
    @Req() req: AuthedRequest,
  ) {
    return this.catalog.deactivate(ctx, id, req.user?.userId ?? "");
  }

  /** Reactiva un local previamente desactivado */
  @Patch(":id/reactivate")
  reactivate(@Param("id") id: string, @Ctx() ctx: ScceCtx) {
    return this.catalog.reactivate(ctx, id);
  }

  /** Alterna participación en elección activa */
  @Patch(":id/toggle-eleccion")
  toggleEleccion(@Param("id") id: string, @Ctx() ctx: ScceCtx) {
    return this.catalog.toggleEleccion(ctx, id);
  }
}
