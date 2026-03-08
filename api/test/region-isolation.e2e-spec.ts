import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaClient } from "@prisma/client";

import { AppModule } from "../src/app.module";
import { JwtAuthGuard } from "../src/auth/jwt.guard";
import { ContextGuard } from "../src/auth/context.guard";
import { e2eCleanup } from "./e2e-cleanup";

const E2E_ISOLATION_CONTEXT = "e2e-region-isolation";

function guardOverride(regionScope: string[]) {
  return {
    canActivate: (ctx: any) => {
      const req = ctx.switchToHttp().getRequest();
      req.user = { userId: "e2e-isolation-user" };
      req.scceContext = { contextType: "SIMULACION" as const, contextId: E2E_ISOLATION_CONTEXT };
      req.scceMembershipId = "e2e-membership-isolation";
      req.scceMembership = {
        id: "e2e-membership-isolation",
        contextType: "SIMULACION",
        contextId: E2E_ISOLATION_CONTEXT,
        regionScopeMode: "LIST" as const,
        regionScope,
      };
      return true;
    },
  };
}

/**
 * Aislamiento multi-región: un membership con región "13" no puede acceder a casos de región "02".
 * Clave para el piloto con Directores Regionales.
 */
describe("Region isolation (13 cannot access 02)", () => {
  let appRegion02: INestApplication;
  let appRegion13: INestApplication;
  let prisma: PrismaClient;
  let caseIdRegion02: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const mod02 = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ContextGuard)
      .useValue(guardOverride(["02"]))
      .compile();
    appRegion02 = mod02.createNestApplication();
    await appRegion02.init();

    const mod13 = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ContextGuard)
      .useValue(guardOverride(["13"]))
      .compile();
    appRegion13 = mod13.createNestApplication();
    await appRegion13.init();
  });

  afterAll(async () => {
    await e2eCleanup(prisma);
    await prisma.$disconnect();
    await appRegion02?.close();
    await appRegion13?.close();
  });

  it("creates a case in region 02 (membership 02)", async () => {
    const res = await request(appRegion02.getHttpServer())
      .post("/cases")
      .send({
        summary: "Caso región 02",
        regionCode: "02",
        communeCode: "02101",
        localCode: "LOC-02",
      })
      .expect(201);
    caseIdRegion02 = res.body?.id;
    expect(caseIdRegion02).toBeDefined();
    expect(res.body?.regionCode).toBe("02");
  });

  it("membership 13 cannot GET case from region 02 (404)", async () => {
    const res = await request(appRegion13.getHttpServer())
      .get(`/cases/${caseIdRegion02}`)
      .expect(404);
    expect(res.body?.message).toMatch(/no encontrado|not found/i);
  });

  it("membership 13 GET /cases does not include case from region 02", async () => {
    const res = await request(appRegion13.getHttpServer()).get("/cases").expect(200);
    const list = Array.isArray(res.body) ? res.body : [];
    const found = list.find((c: { id?: string }) => c.id === caseIdRegion02);
    expect(found).toBeUndefined();
  });
});
