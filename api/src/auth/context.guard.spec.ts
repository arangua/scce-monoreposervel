import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ContextGuard } from "./context.guard";

function createExecutionContext(request: {
  user?: { userId?: string; email?: string };
  headers?: Record<string, string | undefined>;
}): ExecutionContext {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(request.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])
  );

  const req = {
    user: request.user,
    header(name: string) {
      return normalizedHeaders[name.toLowerCase()];
    },
  };

  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

describe("ContextGuard", () => {
  it("throws UnauthorizedException when authenticated user is missing", async () => {
    const prisma = {
      membership: {
        findFirst: jest.fn(),
      },
    };

    const guard = new ContextGuard(prisma as never);

    await expect(guard.canActivate(createExecutionContext({}))).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("throws ForbiddenException when no membership id or explicit context headers are provided", async () => {
    const prisma = {
      membership: {
        findFirst: jest.fn(),
      },
    };

    const guard = new ContextGuard(prisma as never);

    await expect(
      guard.canActivate(
        createExecutionContext({
          user: { userId: "u-1", email: "u@example.com" },
        })
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
