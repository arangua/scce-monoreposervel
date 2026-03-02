import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./auth/jwt.guard";
import { PrismaService } from "./prisma.service";

type PaginationInput = { take: number; skip: number };

function parsePagination(limitRaw?: string, offsetRaw?: string): PaginationInput {
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

@Controller("contexts")
export class ContextsController {
  constructor(private prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(
    @Req() req: { user: { userId: string } },
    @Query("limit") limitRaw?: string,
    @Query("offset") offsetRaw?: string
  ) {
    const userId = req.user.userId;
    const pagination = parsePagination(limitRaw, offsetRaw);

    const ms = await this.prisma.membership.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: pagination.take,
      skip: pagination.skip,
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

    return { memberships: ms };
  }
}
