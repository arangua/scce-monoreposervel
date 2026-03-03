import { Controller, Get, Req, UseGuards, ForbiddenException } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { ContextGuard } from "../auth/context.guard";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, ContextGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get("memberships")
  async memberships(@Req() req: Request) {
    const m = req.scceMembership;
    if (m?.regionScopeMode !== "ALL") {
      throw new ForbiddenException("Solo disponible con membership de alcance ALL (ej. ADMIN_PILOTO · Todas las regiones)");
    }
    return this.admin.getMembershipsAudit();
  }
}
