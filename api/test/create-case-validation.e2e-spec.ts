import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { PrismaClient } from "@prisma/client";

import { AppModule } from "../src/app.module";
import { JwtAuthGuard } from "../src/auth/jwt.guard";
import { ContextGuard } from "../src/auth/context.guard";
import { e2eCleanup } from "./e2e-cleanup";

/**
 * Blinda el DTO de creación de casos: no se puede crear sin regionCode, communeCode, localCode.
 * Si alguien quita la validación, estos tests fallan (400 esperado).
 */
describe("POST /cases validation (regionCode, communeCode, localCode required)", () => {
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
          req.user = { userId: "e2e-validation-user" };
          return true;
        },
      })
      .overrideGuard(ContextGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.scceContext = { contextType: "SIMULACION", contextId: "e2e-validation" };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await e2eCleanup(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  it("returns 400 when regionCode is missing", async () => {
    const res = await request(app.getHttpServer())
      .post("/cases")
      .send({
        summary: "Test",
        communeCode: "13101",
        localCode: "LOC-1",
      })
      .expect(400);
    expect(res.body?.message).toBeDefined();
  });

  it("returns 400 when communeCode is missing", async () => {
    const res = await request(app.getHttpServer())
      .post("/cases")
      .send({
        summary: "Test",
        regionCode: "13",
        localCode: "LOC-1",
      })
      .expect(400);
    expect(res.body?.message).toBeDefined();
  });

  it("returns 400 when localCode is missing", async () => {
    const res = await request(app.getHttpServer())
      .post("/cases")
      .send({
        summary: "Test",
        regionCode: "13",
        communeCode: "13101",
      })
      .expect(400);
    expect(res.body?.message).toBeDefined();
  });

  it("returns 400 when only summary is sent", async () => {
    const res = await request(app.getHttpServer())
      .post("/cases")
      .send({ summary: "Solo summary" })
      .expect(400);
    expect(res.body?.message).toBeDefined();
  });
});
