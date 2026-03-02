import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

export type MembershipAuditItem = {
  id: string;
  contextType: string;
  contextId: string;
  regionCode: string;
  regionScopeMode: string;
  regionScope: string[];
};

export type UserMembershipsAuditItem = {
  user: { id: string; email: string; isActive: boolean; createdAt: Date };
  memberships: MembershipAuditItem[];
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getMembershipsAudit(): Promise<UserMembershipsAuditItem[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        isActive: true,
        createdAt: true,
        memberships: {
          select: {
            id: true,
            contextType: true,
            contextId: true,
            regionCode: true,
            regionScopeMode: true,
            regionScope: true,
          },
        },
      },
      orderBy: { email: "asc" },
    });

    return users.map((u) => ({
      user: {
        id: u.id,
        email: u.email,
        isActive: u.isActive,
        createdAt: u.createdAt,
      },
      memberships: u.memberships.map((m) => ({
        id: m.id,
        contextType: m.contextType,
        contextId: m.contextId,
        regionCode: m.regionCode,
        regionScopeMode: m.regionScopeMode,
        regionScope: m.regionScope ?? [],
      })),
    }));
  }
}
