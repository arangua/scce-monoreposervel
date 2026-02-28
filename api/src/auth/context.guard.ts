import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { ContextType } from "@prisma/client";
import { PrismaService } from "../prisma.service";

type AuthedUser = { userId: string; email: string };

declare module "express-serve-static-core" {
  interface Request {
    scceContext?: { contextType: ContextType; contextId: string };
    scceMembershipId?: string | null;

    scceMembership?: {
      id: string;
      contextType: ContextType;
      contextId: string;
      regionScopeMode: "ALL" | "LIST";
      regionScope: string[];
    };
  }
}

@Injectable()
export class ContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user as AuthedUser | undefined;

    if (!user?.userId) {
      throw new UnauthorizedException("Missing authenticated user");
    }

    const membershipId = (req.header("x-scce-membership-id") || "").trim() || null;

    if (membershipId) {
      const m = await this.prisma.membership.findFirst({
        where: { id: membershipId, userId: user.userId },
        select: {
          id: true,
          contextType: true,
          contextId: true,
          regionScopeMode: true,
          regionScope: true,
        } as { id: boolean; contextType: boolean; contextId: boolean; regionScopeMode: boolean; regionScope: boolean },
      });

      if (!m) {
        throw new ForbiddenException("Invalid or inactive membership");
      }

      const row = m as typeof m & { regionScopeMode?: "ALL" | "LIST"; regionScope?: string[] };
      req.scceMembershipId = row.id;
      req.scceContext = { contextType: row.contextType, contextId: row.contextId };
      req.scceMembership = {
        id: row.id,
        contextType: row.contextType,
        contextId: row.contextId,
        regionScopeMode: row.regionScopeMode ?? "LIST",
        regionScope: row.regionScope ?? [],
      };
      return true;
    }

    const headerType = (req.header("x-scce-context-type") || "").trim();
    const headerId = (req.header("x-scce-context-id") || "").trim();

    if (headerType && headerId) {
      const validTypes: ContextType[] = ["OPERACION", "SIMULACION"];
      if (!validTypes.includes(headerType as ContextType)) {
        throw new ForbiddenException(
          `Invalid x-scce-context-type. Use one of: ${validTypes.join(", ")}`
        );
      }
      req.scceMembershipId = null;
      req.scceMembership = undefined;
      req.scceContext = {
        contextType: headerType as ContextType,
        contextId: headerId,
      };
      return true;
    }

    req.scceMembershipId = null;
    req.scceMembership = undefined;
    req.scceContext = { contextType: ContextType.OPERACION, contextId: "GLOBAL" };
    return true;
  }
}
