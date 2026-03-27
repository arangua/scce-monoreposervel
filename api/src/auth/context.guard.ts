import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { ContextType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";

type AuthedUser = { userId: string; email: string };

// Tipo derivado directamente del select de Prisma — sin cast manual
const MEMBERSHIP_SELECT = {
  id: true,
  contextType: true,
  contextId: true,
  regionScopeMode: true,
  regionScope: true,
} satisfies Prisma.MembershipSelect;

type MembershipRow = Prisma.MembershipGetPayload<{ select: typeof MEMBERSHIP_SELECT }>;

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
      // FIX BUG-002: select tipado con Prisma.MembershipGetPayload — sin cast manual
      const row: MembershipRow | null = await this.prisma.membership.findFirst({
        where: { id: membershipId, userId: user.userId },
        select: MEMBERSHIP_SELECT,
      });

      if (!row) {
        throw new ForbiddenException("Invalid or inactive membership");
      }

      req.scceMembershipId = row.id;
      req.scceContext = { contextType: row.contextType, contextId: row.contextId };
      req.scceMembership = {
        id: row.id,
        contextType: row.contextType,
        contextId: row.contextId,
        regionScopeMode: row.regionScopeMode,
        regionScope: row.regionScope,
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
