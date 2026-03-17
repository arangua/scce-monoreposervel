type SignatureStatus = "none" | "valid_untrusted" | "valid_trusted" | "invalid";

type ExportBundle = {
  appVersion: string;
  exportedAt: string;
  cases: unknown[];
  integrity: {
    algo: "sha256";
    value: string;
  };
  signature?: {
    algo: "Ed25519";
    publicKeyB64: string;
    valueB64: string;
    signedAt: string;
  };
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildExportBundle(cases: unknown[], appVersion: string): Promise<ExportBundle> {
  const exportedAt = new Date().toISOString();
  const payload = { appVersion, exportedAt, cases };
  const integrityValue = await sha256Hex(JSON.stringify(payload));

  return {
    appVersion,
    exportedAt,
    cases,
    integrity: {
      algo: "sha256",
      value: integrityValue,
    },
  };
}

export async function validateImportBundle(raw: unknown): Promise<{
  ok: boolean;
  error: string;
  signatureStatus: SignatureStatus;
  cases: unknown[];
}> {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Bundle invalido.", signatureStatus: "invalid", cases: [] };
  }

  const obj = raw as {
    cases?: unknown;
    integrity?: { value?: unknown };
    signature?: { publicKeyB64?: unknown; valueB64?: unknown; signedAt?: unknown };
  };

  if (!Array.isArray(obj.cases)) {
    return { ok: false, error: "Bundle invalido: falta cases.", signatureStatus: "invalid", cases: [] };
  }

  if (!obj.integrity || typeof obj.integrity.value !== "string" || !obj.integrity.value.trim()) {
    return { ok: false, error: "Bundle invalido: falta integridad.", signatureStatus: "invalid", cases: [] };
  }

  if (!obj.signature) {
    return { ok: true, error: "", signatureStatus: "none", cases: obj.cases };
  }

  const hasPub = typeof obj.signature.publicKeyB64 === "string" && obj.signature.publicKeyB64.length > 0;
  const hasVal = typeof obj.signature.valueB64 === "string" && obj.signature.valueB64.length > 0;
  const hasAt = typeof obj.signature.signedAt === "string" && obj.signature.signedAt.length > 0;

  if (!hasPub || !hasVal || !hasAt) {
    return { ok: false, error: "Firma inválida.", signatureStatus: "invalid", cases: [] };
  }

  return { ok: true, error: "", signatureStatus: "valid_untrusted", cases: obj.cases };
}
