import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifySignatureMock, getTrustedPublicKeysMock } = vi.hoisted(() => ({
  verifySignatureMock: vi.fn<(...args: unknown[]) => Promise<boolean>>(),
  getTrustedPublicKeysMock: vi.fn<(...args: unknown[]) => Promise<Set<string>>>(),
}));

vi.mock("./signingVault", () => ({
  verifySignature: verifySignatureMock,
  getTrustedPublicKeys: getTrustedPublicKeysMock,
}));

import { buildExportBundle, validateImportBundle } from "./exportImport";

function makeValidCases(): unknown[] {
  return [
    {
      id: "TRP_IQQ_001",
      region: "TRP",
      commune: "IQQ",
      summary: "Caso base valido",
    },
  ];
}

describe("validateImportBundle", () => {
  beforeEach(() => {
    verifySignatureMock.mockReset();
    getTrustedPublicKeysMock.mockReset();
    verifySignatureMock.mockResolvedValue(false);
    getTrustedPublicKeysMock.mockResolvedValue(new Set<string>());
  });

  it("returns none for valid bundle without signature", async () => {
    const bundle = await buildExportBundle(makeValidCases(), "1.9");

    const result = await validateImportBundle(bundle);

    expect(result.ok).toBe(true);
    expect(result.signatureStatus).toBe("none");
  });

  it("returns invalid when integrity is altered", async () => {
    const bundle = await buildExportBundle(makeValidCases(), "1.9");
    const tampered = { ...bundle, integrity: { ...bundle.integrity, value: "deadbeef" } };

    const result = await validateImportBundle(tampered);

    expect(result.ok).toBe(false);
    expect(result.signatureStatus).toBe("invalid");
  });

  it("returns invalid when signature is malformed", async () => {
    const bundle = await buildExportBundle(makeValidCases(), "1.9");
    const withBadSignature = { ...bundle, signature: { algo: "Ed25519", publicKeyB64: "", valueB64: "x", signedAt: "" } };

    const result = await validateImportBundle(withBadSignature);

    expect(result.ok).toBe(false);
    expect(result.signatureStatus).toBe("invalid");
    expect(verifySignatureMock).not.toHaveBeenCalled();
  });

  it("returns invalid when cryptographic signature verification fails", async () => {
    const bundle = await buildExportBundle(makeValidCases(), "1.9");
    const withSignature = {
      ...bundle,
      signature: { algo: "Ed25519", publicKeyB64: "pub-1", valueB64: "sig-1", signedAt: "2026-01-01T00:00:00.000Z" },
    };
    verifySignatureMock.mockResolvedValueOnce(false);

    const result = await validateImportBundle(withSignature);

    expect(result.ok).toBe(false);
    expect(result.signatureStatus).toBe("invalid");
  });

  it("returns valid_untrusted when signature is valid and key is not trusted", async () => {
    const bundle = await buildExportBundle(makeValidCases(), "1.9");
    const withSignature = {
      ...bundle,
      signature: { algo: "Ed25519", publicKeyB64: "pub-2", valueB64: "sig-2", signedAt: "2026-01-01T00:00:00.000Z" },
    };
    verifySignatureMock.mockResolvedValueOnce(true);
    getTrustedPublicKeysMock.mockResolvedValueOnce(new Set<string>());

    const result = await validateImportBundle(withSignature);

    expect(result.ok).toBe(true);
    expect(result.signatureStatus).toBe("valid_untrusted");
  });

  it("returns valid_trusted when signature is valid and key is trusted", async () => {
    const bundle = await buildExportBundle(makeValidCases(), "1.9");
    const withSignature = {
      ...bundle,
      signature: { algo: "Ed25519", publicKeyB64: "pub-3", valueB64: "sig-3", signedAt: "2026-01-01T00:00:00.000Z" },
    };
    verifySignatureMock.mockResolvedValueOnce(true);
    getTrustedPublicKeysMock.mockResolvedValueOnce(new Set<string>(["pub-3"]));

    const result = await validateImportBundle(withSignature);

    expect(result.ok).toBe(true);
    expect(result.signatureStatus).toBe("valid_trusted");
  });

  it("returns invalid when cases are structurally invalid", async () => {
    const invalidCases = [
      {
        id: "TRP_IQQ_002",
        region: "TRP",
        commune: "IQQ",
      },
    ];
    const bundle = await buildExportBundle(invalidCases, "1.9");

    const result = await validateImportBundle(bundle);

    expect(result.ok).toBe(false);
    expect(result.signatureStatus).toBe("invalid");
    expect(result.error).toContain("Import fail-closed");
  });
});

