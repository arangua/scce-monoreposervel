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

type MembershipSelection = {
  id: true;
  contextType: true;
  contextId: true;
  regionScopeMode: true;
  regionScope: true;
};

const membershipSelect: MembershipSelection = {
  id: true,
  contextType: true,
  contextId: true,
  regionScopeMode: true,
  regionScope: true,
};

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
        select: membershipSelect,
      });

      if (!m) {
        throw new ForbiddenException("Invalid or inactive membership");
      }

      req.scceMembershipId = m.id;
      req.scceContext = { contextType: m.contextType, contextId: m.contextId };
      req.scceMembership = {
        id: m.id,
        contextType: m.contextType,
        contextId: m.contextId,
        regionScopeMode: m.regionScopeMode,
        regionScope: m.regionScope,
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

    throw new ForbiddenException(
      "Context required: provide x-scce-membership-id or explicit context headers"
    );
  }
}
