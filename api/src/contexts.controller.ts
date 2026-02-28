import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "./auth/jwt.guard";
import { PrismaService } from "./prisma.service";

@Controller("contexts")
export class ContextsController {
  constructor(private prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Req() req: { user: { userId: string } }) {
    const userId = req.user.userId;

    const ms = await this.prisma.membership.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return { memberships: ms };
  }
}
