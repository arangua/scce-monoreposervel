import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaClient } from "@prisma/client";

import { AppModule } from "../src/app.module";
import { JwtAuthGuard } from "../src/auth/jwt.guard";
import { ContextGuard } from "../src/auth/context.guard";
import { e2eCleanup } from "./e2e-cleanup";

const CTX = { contextType: "SIMULACION" as const, contextId: "e2e-case-flow" };

describe("Case Flow (reglas de negocio SCCE)", () => {
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
          req.user = { userId: "e2e-case-flow-user" };
          return true;
        },
      })
      .overrideGuard(ContextGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.scceContext = CTX;
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

  async function createCase() {
    const res = await request(app.getHttpServer())
      .post("/cases")
      .send({
        summary: "E2E Case Flow",
        regionCode: "13",
        communeCode: "13101",
        localCode: "LOC-E2E",
      })
      .expect(201);
    return res.body.id as string;
  }

  it("1) No cerrar sin acción: rechaza CASE_CLOSED si no hay eventos de acción (COMMENT_ADDED/INSTRUCTION_CREATED)", async () => {
    const caseId = await createCase();

    const res = await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "CASE_CLOSED", reason: "Motivo", note: "ok" })
      .expect(400);

    expect(res.body?.message).toMatch(/acción|action/i);
  });

  it("2) No cerrar sin validación operacional: rechaza CASE_CLOSED si no existe OPERATIONAL_VALIDATION", async () => {
    const caseId = await createCase();

    await prisma.case.update({
      where: { id: caseId },
      data: { status: "RESOLVED" },
    });

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "Acción registrada" } })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "CASE_CLOSED", reason: "Motivo", note: "ok" })
      .expect(400);

    expect(res.body?.message).toMatch(/validación operativa|operacional/i);
  });

  it("3) No validar si el caso no está en Resuelto: rechaza OPERATIONAL_VALIDATION cuando status != RESOLVED", async () => {
    const caseId = await createCase();

    const res = await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({
        eventType: "OPERATIONAL_VALIDATION",
        payloadJson: { result: "OK" },
      })
      .expect(400);

    expect(res.body?.message).toMatch(/Resuelto|RESOLVED/i);
  });

  it("4) Permitir cerrar cuando todo está completo: acepta CASE_CLOSED con acción + RESOLVED + OPERATIONAL_VALIDATION + motivo", async () => {
    const caseId = await createCase();

    await prisma.case.update({
      where: { id: caseId },
      data: { status: "RESOLVED" },
    });

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "Acción completada" } })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({
        eventType: "OPERATIONAL_VALIDATION",
        payloadJson: { result: "OK" },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "CASE_CLOSED", reason: "Cierre E2E completo", note: "OK" })
      .expect(201);

    const getCase = await request(app.getHttpServer())
      .get(`/cases/${caseId}`)
      .expect(200);
    expect(getCase.body?.status).toBe("CLOSED");
  });

  it("5a) Cierre permitido con validación OBSERVATIONS (única)", async () => {
    const caseId = await createCase();
    await prisma.case.update({
      where: { id: caseId },
      data: { status: "RESOLVED" },
    });
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "Acción" } })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({
        eventType: "OPERATIONAL_VALIDATION",
        payloadJson: { result: "OBSERVATIONS", note: "Observaciones menores documentadas" },
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "CASE_CLOSED", reason: "Cierre con observaciones", note: "ok" })
      .expect(201);
    const getCase = await request(app.getHttpServer()).get(`/cases/${caseId}`).expect(200);
    expect(getCase.body?.status).toBe("CLOSED");
  });

  it("5b) Cierre bloqueado si la última validación es FAIL", async () => {
    const caseId = await createCase();
    await prisma.case.update({
      where: { id: caseId },
      data: { status: "RESOLVED" },
    });
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "Acción" } })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({
        eventType: "OPERATIONAL_VALIDATION",
        payloadJson: { result: "FAIL", note: "Fallo en terreno" },
      })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "CASE_CLOSED", reason: "Intentar cierre", note: "ok" })
      .expect(400);
    expect(res.body?.message).toMatch(/última validación|Fallo|validación operacional/i);
  });

  it("5c) Cierre bloqueado si hubo FAIL y no hay acción posterior", async () => {
    const caseId = await createCase();
    await prisma.case.update({
      where: { id: caseId },
      data: { status: "RESOLVED" },
    });
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "Acción antes del FAIL" } })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({
        eventType: "OPERATIONAL_VALIDATION",
        payloadJson: { result: "FAIL", note: "Fallo" },
      })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "CASE_CLOSED", reason: "Motivo", note: "ok" })
      .expect(400);
    expect(res.body?.message).toMatch(/acción posterior|validación operacional/i);
  });

  it("5d) Cierre bloqueado si hubo FAIL, hay acción posterior, pero no nueva validación OK/OBS", async () => {
    const caseId = await createCase();
    await prisma.case.update({
      where: { id: caseId },
      data: { status: "RESOLVED" },
    });
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "Acción 1" } })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({
        eventType: "OPERATIONAL_VALIDATION",
        payloadJson: { result: "FAIL", note: "Fallo" },
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "Acción tras fallo" } })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "CASE_CLOSED", reason: "Motivo", note: "ok" })
      .expect(400);
    expect(res.body?.message).toMatch(/nueva validación|OK u Observaciones/i);
  });

  it("5e) Cierre permitido si hubo FAIL, luego acción, luego validación OK", async () => {
    const caseId = await createCase();
    await prisma.case.update({
      where: { id: caseId },
      data: { status: "RESOLVED" },
    });
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "Acción 1" } })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({
        eventType: "OPERATIONAL_VALIDATION",
        payloadJson: { result: "FAIL", note: "Fallo" },
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "Acción tras fallo" } })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({
        eventType: "OPERATIONAL_VALIDATION",
        payloadJson: { result: "OK" },
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "CASE_CLOSED", reason: "Cierre tras revalidación OK", note: "ok" })
      .expect(201);
    const getCase = await request(app.getHttpServer()).get(`/cases/${caseId}`).expect(200);
    expect(getCase.body?.status).toBe("CLOSED");
  });

  it("5f) Cierre permitido si hubo FAIL, luego acción, luego validación OBSERVATIONS", async () => {
    const caseId = await createCase();
    await prisma.case.update({
      where: { id: caseId },
      data: { status: "RESOLVED" },
    });
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "Acción 1" } })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({
        eventType: "OPERATIONAL_VALIDATION",
        payloadJson: { result: "FAIL", note: "Fallo" },
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "Acción tras fallo" } })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({
        eventType: "OPERATIONAL_VALIDATION",
        payloadJson: { result: "OBSERVATIONS", note: "Observaciones post-fallo" },
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "CASE_CLOSED", reason: "Cierre tras revalidación OBS", note: "ok" })
      .expect(201);
    const getCase = await request(app.getHttpServer()).get(`/cases/${caseId}`).expect(200);
    expect(getCase.body?.status).toBe("CLOSED");
  });

  it("6) Registrar auditoría completa: eventos mínimos CASE_CREATED, COMMENT_ADDED, OPERATIONAL_VALIDATION, CASE_CLOSED", async () => {
    const caseId = await createCase();

    await prisma.case.update({
      where: { id: caseId },
      data: { status: "RESOLVED" },
    });

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "Acción" } })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "OPERATIONAL_VALIDATION", payloadJson: { result: "OK" } })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "CASE_CLOSED", reason: "Auditoría E2E", note: "ok" })
      .expect(201);

    const evRes = await request(app.getHttpServer())
      .get(`/cases/${caseId}/events`)
      .expect(200);

    const types = (evRes.body as { eventType: string }[]).map((e) => e.eventType);
    expect(types).toContain("CASE_CREATED");
    expect(types).toContain("COMMENT_ADDED");
    expect(types).toContain("OPERATIONAL_VALIDATION");
    expect(types).toContain("CASE_CLOSED");
    expect(types.length).toBe(4);
  });

  it("7) Rechazar cierre si falta responsable actual", async () => {
    const caseId = await createCase();

    await prisma.case.update({
      where: { id: caseId },
      data: { status: "RESOLVED" },
    });

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "Acción" } })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({
        eventType: "OPERATIONAL_VALIDATION",
        payloadJson: { result: "OK" },
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "CASE_CLOSED", reason: "Motivo", note: "ok" })
      .expect(400);

    expect(res.body?.message).toBe(
      "Debe asignarse un responsable actual del caso antes del cierre"
    );
  });

  it("8) Permitir cierre cuando existe responsable actual", async () => {
    const caseId = await createCase();

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({
        eventType: "ASSIGNMENT_CHANGED",
        payloadJson: { assignedTo: "Responsable E2E" },
      })
      .expect(201);

    await prisma.case.update({
      where: { id: caseId },
      data: { status: "RESOLVED" },
    });

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "COMMENT_ADDED", payloadJson: { text: "Acción" } })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({
        eventType: "OPERATIONAL_VALIDATION",
        payloadJson: { result: "OK" },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .send({ eventType: "CASE_CLOSED", reason: "Cierre con responsable", note: "ok" })
      .expect(201);

    const getCase = await request(app.getHttpServer())
      .get(`/cases/${caseId}`)
      .expect(200);
    expect(getCase.body?.status).toBe("CLOSED");
    expect(getCase.body?.assignedTo).toBe("Responsable E2E");
  });
});
