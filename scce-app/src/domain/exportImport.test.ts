/**
 * Fase 4.1.f / 4.3 — Tests Import/Export, seguridad y firma opcional.
 */
import { describe, it, expect, vi } from "vitest";
import { buildExportBundle, validateImportBundle } from "./exportImport";
import type { CaseItem } from "./types";
import { getTrustedPublicKeys, verifySignature } from "./signingVault";

vi.mock("./signingVault", () => ({
  getTrustedPublicKeys: vi.fn(),
  verifySignature: vi.fn(),
}));

/** Caso mínimo válido para tests (cumple CaseItem). */
function minimalCase(overrides: Partial<CaseItem> = {}): CaseItem {
  return {
    id: "test-1",
    region: "R",
    commune: "C",
    status: "Nuevo",
    criticality: "BAJA",
    summary: "Test",
    timeline: [
      { type: "DETECTED", at: "2025-01-01T12:00:00.000Z", actor: "u1" },
    ],
    ...overrides,
  };
}

/** Bundle mínimo válido (estructura esperada por validateImportBundle). */
function validBundle(cases: CaseItem[] = [minimalCase()]) {
  return {
    schemaVersion: "SCCE_APP_STATE_V2",
    exportedAt: new Date().toISOString(),
    app: { name: "SCCE_APP", version: "2.0" },
    data: { cases },
  };
}

describe("exportImport", () => {
  describe("buildExportBundle", () => {
    it("genera bundle V3 con casos mínimos e integridad SHA-256", async () => {
      const cases: CaseItem[] = [minimalCase()];
      const bundle = await buildExportBundle(cases, "2.0");
      expect(bundle.schemaVersion).toBe("SCCE_APP_STATE_V3");
      expect(bundle.app.name).toBe("SCCE_APP");
      expect(bundle.app.version).toBe("2.0");
      expect(Array.isArray(bundle.data.cases)).toBe(true);
      expect(bundle.data.cases).toHaveLength(1);
      expect(bundle.data.cases[0].id).toBe("test-1");
      expect(bundle.integrity).toBeDefined();
      expect(bundle.integrity?.algo).toBe("SHA-256");
      expect(typeof bundle.integrity?.value).toBe("string");
      expect((bundle.integrity?.value ?? "").length).toBe(64);
    });
  });

  describe("validateImportBundle", () => {
    it("T1 — Bundle válido (V2) → ok: true, signatureStatus none", async () => {
      const raw = validBundle();
      const result = await validateImportBundle(raw);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.cases).toHaveLength(1);
        expect(result.cases[0].id).toBe("test-1");
        expect(result.signatureStatus).toBe("none");
      }
    });

    it("T2 — schemaVersion incorrecto → ok: false", async () => {
      const raw = validBundle();
      (raw as { schemaVersion: string }).schemaVersion = "V1";
      const result = await validateImportBundle(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("schema");
      }
    });

    it("T3 — __proto__ presente → ok: false con claves peligrosas", async () => {
      const bundle = validBundle();
      const jsonString = JSON.stringify(bundle).replace(
        '"data":',
        '"__proto__":{"x":1},"data":'
      );
      const raw = JSON.parse(jsonString);
      const result = await validateImportBundle(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("claves peligrosas");
      }
    });

    it("T4 — eventId vacío \"\" → ok: false con eventId inválido", async () => {
      const c = minimalCase({
        timeline: [
          { type: "COMMENT", at: "2025-01-01T12:00:00.000Z", actor: "u1", eventId: "" },
        ],
      });
      const raw = validBundle([c]);
      const result = await validateImportBundle(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("eventId inválido");
      }
    });

    it("T5 — eventId duplicado → ok: false con duplicado detectado", async () => {
      const ev = { type: "COMMENT", at: "2025-01-01T12:00:00.000Z", actor: "u1", eventId: "ev_dup" };
      const c = minimalCase({
        timeline: [ev, { ...ev, at: "2025-01-01T12:01:00.000Z" }],
      });
      const raw = validBundle([c]);
      const result = await validateImportBundle(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("duplicado detectado");
      }
    });

    it("V3 — Export → import sin modificar → ok: true", async () => {
      const cases: CaseItem[] = [minimalCase()];
      const bundle = await buildExportBundle(cases, "2.0");
      const result = await validateImportBundle(bundle);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.cases).toHaveLength(1);
        expect(result.cases[0].id).toBe("test-1");
      }
    });

    it("V3 — JSON con un byte alterado → Integridad fallida", async () => {
      const cases: CaseItem[] = [minimalCase()];
      const bundle = await buildExportBundle(cases, "2.0");
      const jsonStr = JSON.stringify(bundle);
      const tampered = jsonStr.replace('"test-1"', '"test-2"'); // altera data
      const raw = JSON.parse(tampered);
      const result = await validateImportBundle(raw);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Integridad fallida");
      }
    });

    it("V3 — firma válida y trusted → signatureStatus valid_trusted", async () => {
      const cases: CaseItem[] = [minimalCase()];
      const bundle = await buildExportBundle(cases, "2.0");
      const pubKeyB64 = "dGVzdC1wdWJrZXk="; // fake base64
      (bundle as { signature?: object }).signature = {
        algo: "Ed25519",
        publicKeyB64: pubKeyB64,
        valueB64: btoa("fakesig"),
        signedAt: new Date().toISOString(),
      };

      vi.mocked(verifySignature).mockResolvedValue(true);
      vi.mocked(getTrustedPublicKeys).mockResolvedValue(new Set([pubKeyB64]));

      const result = await validateImportBundle(bundle);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.signatureStatus).toBe("valid_trusted");
      }
    });

    it("V3 — firma válida pero untrusted → signatureStatus valid_untrusted", async () => {
      const cases: CaseItem[] = [minimalCase()];
      const bundle = await buildExportBundle(cases, "2.0");
      const pubKeyB64 = "dGVzdC1wdWJrZXk=";
      (bundle as { signature?: object }).signature = {
        algo: "Ed25519",
        publicKeyB64: pubKeyB64,
        valueB64: btoa("fakesig"),
        signedAt: new Date().toISOString(),
      };

      vi.mocked(verifySignature).mockResolvedValue(true);
      vi.mocked(getTrustedPublicKeys).mockResolvedValue(new Set());

      const result = await validateImportBundle(bundle);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.signatureStatus).toBe("valid_untrusted");
      }
    });

    it("V3 — firma inválida → ok: false con Firma inválida", async () => {
      const cases: CaseItem[] = [minimalCase()];
      const bundle = await buildExportBundle(cases, "2.0");
      (bundle as { signature?: object }).signature = {
        algo: "Ed25519",
        publicKeyB64: "dGVzdA==",
        valueB64: btoa("bad"),
        signedAt: new Date().toISOString(),
      };

      vi.mocked(verifySignature).mockResolvedValue(false);

      const result = await validateImportBundle(bundle);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Firma inválida");
      }
    });
  });
});
