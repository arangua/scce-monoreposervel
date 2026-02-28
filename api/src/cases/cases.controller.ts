import { Controller, Get, Post, Body, Param, UseGuards, Req } from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt.guard";
import { ContextGuard } from "../auth/context.guard";
import { Ctx, type ScceCtx } from "../auth/ctx.decorator";

import { CasesService } from "./cases.service";
import { CreateCaseDto, CreateCaseEventDto } from "./dto";

type AuthedRequest = { user?: { userId: string }; scceContext?: ScceCtx };

@Controller("cases")
@UseGuards(JwtAuthGuard, ContextGuard)
export class CasesController {
  constructor(private cases: CasesService) {}

  @Get()
  list(@Ctx() ctx: ScceCtx) {
    return this.cases.list(ctx);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Ctx() ctx: ScceCtx) {
    return this.cases.findOne(id, ctx);
  }

  @Post()
  create(@Body() dto: CreateCaseDto, @Ctx() ctx: ScceCtx, @Req() req: AuthedRequest) {
    const userId = req.user?.userId ?? "";
    return this.cases.create(dto, ctx, userId);
  }

  @Get(":id/events")
  getEvents(@Param("id") id: string, @Ctx() ctx: ScceCtx) {
    return this.cases.getEvents(id, ctx.contextType, ctx.contextId);
  }

  @Post(":id/events")
  addEvent(
    @Param("id") id: string,
    @Body() dto: CreateCaseEventDto,
    @Ctx() ctx: ScceCtx,
    @Req() req: AuthedRequest
  ) {
    const userId = req.user?.userId ?? "";
    return this.cases.addEvent(id, ctx.contextType, ctx.contextId, userId, dto);
  }
}
