import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { ContextType } from "@prisma/client";

export type ScceCtx = {
  contextType: ContextType;
  contextId: string;
  membershipId?: string | null;
  regionScopeMode?: "ALL" | "LIST";
  regionScope?: string[];
};

export const Ctx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ScceCtx => {
    const req = ctx.switchToHttp().getRequest();

    const safe =
      (req.scceContext as { contextType: ContextType; contextId: string } | undefined) ??
      ({ contextType: ContextType.OPERACION, contextId: "GLOBAL" } as const);

    const m = req.scceMembership as
      | { regionScopeMode: "ALL" | "LIST"; regionScope: string[] }
      | undefined;

    return {
      ...safe,
      membershipId: (req.scceMembershipId ?? null) as string | null,
      regionScopeMode: m?.regionScopeMode,
      regionScope: m?.regionScope ?? [],
    };
  },
);
