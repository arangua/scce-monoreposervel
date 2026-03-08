// api/test/flow-full.e2e-spec.ts
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

type LoginResponse = { token: string };
type Membership = { id: string; contextType: string; contextId: string };

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name} for E2E. Add to api/.env.test`);
  return v;
}

describe("E2E full flow (real auth + real context) — regression for F5/audit/dashboard", () => {
  let app: INestApplication;

  const SEED_EMAIL = mustEnv("E2E_EMAIL");
  const SEED_PASSWORD = mustEnv("E2E_PASSWORD");

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("login -> contexts -> create case -> add ACK/comment -> verify persists after re-reads (F5)", async () => {
    // 1) Login real
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: SEED_EMAIL, password: SEED_PASSWORD })
      .expect(201);

    const { token } = loginRes.body as LoginResponse;
    expect(token).toBeTruthy();

    // 2) Obtener contexts reales (memberships para x-scce-membership-id)
    const ctxRes = await request(app.getHttpServer())
      .get("/contexts")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const { memberships } = ctxRes.body as { memberships: Membership[] };
    expect(Array.isArray(memberships)).toBe(true);
    expect(memberships.length).toBeGreaterThan(0);

    // Regla: toda prueba nace en SIMULACION. Usar membership SIMULACION/e2e si existe.
    const simMembership = memberships.find(
      (m: Membership) => m.contextType === "SIMULACION" && m.contextId === "e2e"
    );
    const membershipId = simMembership?.id ?? memberships[0].id;
    expect(membershipId).toBeTruthy();

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      "x-scce-membership-id": membershipId,
    };

    // 3) Crear caso
    const createRes = await request(app.getHttpServer())
      .post("/cases")
      .set(authHeaders)
      .send({
        regionCode: "TRP",
        communeCode: "IQQ",
        localCode: "LOCAL-TEST-001",
        summary: "E2E full flow case",
      })
      .expect(201);

    const createdCase = createRes.body as { id: string; status?: string };
    expect(createdCase.id).toBeTruthy();
    const caseId = createdCase.id;

    // 4) ACK (acuse recepción)
    const ackRes = await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .set(authHeaders)
      .send({
        eventType: "ACK",
        payloadJson: { note: "Acuse de recepción E2E" },
      });
    expect(ackRes.status).toBe(201);

    // 4.1) GET case y validar status tras ACK
    const caseAfterAck = await request(app.getHttpServer())
      .get(`/cases/${caseId}`)
      .set(authHeaders);
    expect(caseAfterAck.status).toBe(200);
    expect(caseAfterAck.body.status).toBe("ACKED");

    // 5) Comentario
    await request(app.getHttpServer())
      .post(`/cases/${caseId}/events`)
      .set(authHeaders)
      .send({
        eventType: "COMMENT_ADDED",
        payloadJson: { text: "Comentario (E2E) - debe persistir tras F5" },
      })
      .expect(201);

    // 5.1) Estado tras comentario: ACKED → IN_PROGRESS
    const caseAfterComment = await request(app.getHttpServer())
      .get(`/cases/${caseId}`)
      .set(authHeaders);
    expect(caseAfterComment.status).toBe(200);
    expect(caseAfterComment.body.status).toBe("IN_PROGRESS");

    // 6) Auditoría: conteo + orden (3 eventos) y tipos correctos
    const auditRes = await request(app.getHttpServer())
      .get(`/cases/${caseId}/events`)
      .set(authHeaders)
      .expect(200);

    const events = (auditRes.body?.events ?? auditRes.body ?? []) as Array<{ eventType: string }>;
    expect(Array.isArray(events)).toBe(true);
    expect(events).toHaveLength(3);
    expect(events[0].eventType).toBe("CASE_CREATED");
    expect(events[1].eventType).toBe("ACK");
    expect(events[2].eventType).toBe("COMMENT_ADDED");

    // 7) Simular F5: volver a leer eventos (segunda lectura)
    const ev2 = await request(app.getHttpServer())
      .get(`/cases/${caseId}/events`)
      .set(authHeaders)
      .expect(200);
    const events2 = ev2.body as Array<{ eventType: string }>;
    expect(events2).toHaveLength(3);
    expect(events2[0].eventType).toBe("CASE_CREATED");
    expect(events2[1].eventType).toBe("ACK");
    expect(events2[2].eventType).toBe("COMMENT_ADDED");

    // 8) Verificar que el caso aparece en listados
    const list1 = await request(app.getHttpServer())
      .get("/cases")
      .set(authHeaders)
      .expect(200);

    const cases1 = list1.body as Array<{ id: string; status?: string }>;
    expect(cases1.some((c) => c.id === caseId)).toBe(true);

    // 9) F5 en listado: re-listar
    const list2 = await request(app.getHttpServer())
      .get("/cases")
      .set(authHeaders)
      .expect(200);

    const cases2 = list2.body as Array<{ id: string; status?: string }>;
    expect(cases2.some((c) => c.id === caseId)).toBe(true);
  });
});
