import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaClient } from "@prisma/client";

import { AppModule } from "../src/app.module";
import { JwtAuthGuard } from "../src/auth/jwt.guard";
import { ContextGuard } from "../src/auth/context.guard";
import { e2eCleanup } from "./e2e-cleanup";

describe("Cases + Events (append-only, chained hash, close)", () => {
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
          req.scceContext = { contextType: "OPERACION", contextId: "e2e-context" };
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

  it("creates case, adds comment, closes, blocks post-close, and validates chain via GET events", async () => {
    // 1) POST /cases (regionCode, communeCode, localCode requeridos)
    const caseRes = await request(app.getHttpServer())
      .post("/cases")
      .send({
        summary: "E2E case events chain",
        regionCode: "13",
        communeCode: "13101",
        localCode: "LOC-E2E",
      })
      .expect(201);

    const caseId = caseRes.body?.id;
    expect(typeof caseId).toBe("string");
    expect(caseId.length).toBeGreaterThan(0);

    // 2) COMMENT_ADDED
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "hola" } })
      .expect(201);

    // 3) CASE_CLOSED
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "CASE_CLOSED", reason: "RESUELTO", note: "ok" })
      .expect(201);

    // 4) COMMENT post-close => 409
    const postClose = await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "no debe entrar" } })
      .expect(409);

    expect(postClose.body?.message).toContain("Caso cerrado");

    // 5) GET /cases/:id => status CLOSED
    const getCase = await request(app.getHttpServer())
      .get(`/cases/${caseId}`)
      .expect(200);

    expect(getCase.body?.status).toBe("CLOSED");

    // 6) GET /cases/:id/events => 200 and chained prevHash
    const evRes = await request(app.getHttpServer())
      .get(`/cases/${caseId}/events`)
      .expect(200);

    const events = evRes.body;
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBe(3);

    const [e0, e1, e2] = events;

    expect(e0.eventType).toBe("CASE_CREATED");
    expect(e1.eventType).toBe("COMMENT_ADDED");
    expect(e2.eventType).toBe("CASE_CLOSED");

    // cadena prevHash (primero null/""; luego hash anterior)
    expect(e0.prevHash === null || e0.prevHash === "").toBe(true);
    expect(e1.prevHash).toBe(e0.hash);
    expect(e2.prevHash).toBe(e1.hash);

    // payload mínimo de cierre
    expect(e2.payloadJson?.reason).toBe("RESUELTO");
    expect(e2.payloadJson?.note).toBe("ok");
  });
});
