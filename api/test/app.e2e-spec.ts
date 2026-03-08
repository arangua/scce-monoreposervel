import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaClient } from "@prisma/client";

import { AppModule } from "../src/app.module";
import { JwtAuthGuard } from "../src/auth/jwt.guard";
import { ContextGuard } from "../src/auth/context.guard";
import { e2eCleanup } from "./e2e-cleanup";

describe("E2E Smoke", () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = { userId: "e2e-user" };
          return true;
        },
      })
      .overrideGuard(ContextGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.scceContext = { contextType: "SIMULACION", contextId: "e2e-context" };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await e2eCleanup(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  it("GET /cases returns 200 (auth+ctx overridden)", async () => {
    await request(app.getHttpServer()).get("/cases").expect(200);
  });
});
