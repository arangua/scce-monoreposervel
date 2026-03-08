import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaClient } from "@prisma/client";

import { AppModule } from "../src/app.module";
import { JwtAuthGuard } from "../src/auth/jwt.guard";
import { ContextGuard } from "../src/auth/context.guard";
import { e2eCleanup } from "./e2e-cleanup";

const E2E_CONTEXT_ID = "e2e-region-scope";
const baseCase = {
  summary: "E2E region scope",
  communeCode: "IQQ",
  localCode: "LOC-001",
};
const caseTRP = { ...baseCase, regionCode: "TRP" };
const caseAYP = { ...baseCase, regionCode: "AYP", communeCode: "ARI", localCode: "LOC-AYP-001" };

function guardOverride(regionScopeMode: "ALL" | "LIST", regionScope: string[]) {
  return {
    canActivate: (ctx: any) => {
      const req = ctx.switchToHttp().getRequest();
      req.user = { userId: "e2e-region-user" };
      req.scceContext = { contextType: "SIMULACION" as const, contextId: E2E_CONTEXT_ID };
      req.scceMembershipId = "e2e-membership-id";
      req.scceMembership = {
        id: "e2e-membership-id",
        contextType: "SIMULACION",
        contextId: E2E_CONTEXT_ID,
        regionScopeMode,
        regionScope,
      };
      return true;
    },
  };
}

describe("Region scope LIST [TRP]", () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ContextGuard)
      .useValue(guardOverride("LIST", ["TRP"]))
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await e2eCleanup(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  it("POST TRP -> 201", async () => {
    const res = await request(app.getHttpServer())
      .post("/cases")
      .send(caseTRP)
      .expect(201);
    expect(res.body?.regionCode).toBe("TRP");
  });

  it("POST AYP -> 403", async () => {
    const res = await request(app.getHttpServer())
      .post("/cases")
      .send(caseAYP)
      .expect(403);
    expect(res.body?.message).toContain("Region not allowed");
  });

  it("GET /cases -> solo TRP", async () => {
    const res = await request(app.getHttpServer()).get("/cases").expect(200);
    const list = Array.isArray(res.body) ? res.body : [];
    expect(list.length).toBeGreaterThan(0);
    list.forEach((c: { regionCode?: string }) => {
      expect(c.regionCode).toBe("TRP");
    });
  });
});

describe("Region scope ALL", () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ContextGuard)
      .useValue(guardOverride("ALL", []))
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await e2eCleanup(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  it("POST AYP -> 201 y GET /cases incluye ese caso", async () => {
    const created = await request(app.getHttpServer())
      .post("/cases")
      .send(caseAYP)
      .expect(201);
    const createdId = created.body?.id;
    const createdRegion = created.body?.regionCode;
    expect(createdId).toBeDefined();
    expect(createdRegion).toBe("AYP");

    const listRes = await request(app.getHttpServer()).get("/cases").expect(200);
    const list = Array.isArray(listRes.body) ? listRes.body : [];
    const found = list.find((c: { id?: string }) => c.id === createdId);
    expect(found).toBeDefined();
    expect(found?.regionCode).toBe("AYP");
  });
});
