import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  UnauthorizedException,
} from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt.guard";
import { ContextGuard } from "../auth/context.guard";
import { Ctx, type ScceCtx } from "../auth/ctx.decorator";

import { CasesService } from "./cases.service";
import { CreateCaseDto, CreateCaseEventDto } from "./dto";

type AuthedRequest = { user?: { userId?: string }; scceContext?: ScceCtx };

type PaginationInput = { take: number; skip: number };

export function parsePagination(limitRaw?: string, offsetRaw?: string): PaginationInput {
  const parsedLimit = Number(limitRaw ?? "20");
  const parsedOffset = Number(offsetRaw ?? "0");

  const take = Number.isFinite(parsedLimit)
    ? Math.min(100, Math.max(1, Math.trunc(parsedLimit)))
    : 20;
  const skip = Number.isFinite(parsedOffset)
    ? Math.max(0, Math.trunc(parsedOffset))
    : 0;

  return { take, skip };
}

function requireUserId(req: AuthedRequest): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new UnauthorizedException("Authenticated user is required");
  }
  return userId;
}

@Controller("cases")
@UseGuards(JwtAuthGuard, ContextGuard)
export class CasesController {
  constructor(private cases: CasesService) {}

  @Get()
  list(
    @Ctx() ctx: ScceCtx,
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string
  ) {
    const pagination = parsePagination(limitRaw, offsetRaw);
    return this.cases.list(ctx, pagination);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Ctx() ctx: ScceCtx) {
    return this.cases.findOne(id, ctx);
  }

  @Post()
  create(@Body() dto: CreateCaseDto, @Ctx() ctx: ScceCtx, @Req() req: AuthedRequest) {
    return this.cases.create(dto, ctx, requireUserId(req));
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
    return this.cases.addEvent(id, ctx.contextType, ctx.contextId, requireUserId(req), dto);
  }
}
