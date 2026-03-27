// scce-app/src/domain/exportImport.ts
import type { CaseItem } from "./types";
import { getTrustedPublicKeys, verifySignature } from "./signingVault";

export type ExportBundle = {
  schemaVersion: "SCCE_APP_STATE_V2" | "SCCE_APP_STATE_V3";
  exportedAt: string;
  app: { name: "SCCE_APP"; version: string };
  data: { cases: CaseItem[] };
  integrity?: {
    algo: "SHA-256";
    value: string;
  };
  signature?: {
    algo: "Ed25519";
    publicKeyB64: string;
    valueB64: string;
    signedAt: string;
  };
};

export type SignatureStatus = "none" | "valid_trusted" | "valid_untrusted";
export type ImportOk = { ok: true; cases: CaseItem[]; signatureStatus: SignatureStatus };
export type ImportFail = { ok: false; error: string };

function isIsoDate(s: unknown): boolean {
  if (typeof s !== "string") return false;
  const t = Date.parse(s);
  return Number.isFinite(t);
}

/**
 * Hardening mínimo contra prototype pollution.
 * Rechaza si el JSON contiene keys peligrosas en cualquier nivel.
 */
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function containsDangerousKeys(value: unknown, depth = 0): boolean {
  // Evita recorridos infinitos o demasiado costosos
  if (depth > 50) return true;

  if (!value || typeof value !== "object") return false;

  if (Array.isArray(value)) {
    for (const v of value) {
      if (containsDangerousKeys(v, depth + 1)) return true;
    }
    return false;
  }

  for (const k of Object.keys(value as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.has(k)) return true;
    const v = (value as Record<string, unknown>)[k];
    if (containsDangerousKeys(v, depth + 1)) return true;
  }
  return false;
}

export async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function buildExportBundle(
  cases: CaseItem[],
  appVersion: string
): Promise<ExportBundle> {
  const base = {
    schemaVersion: "SCCE_APP_STATE_V3" as const,
    exportedAt: new Date().toISOString(),
    app: { name: "SCCE_APP" as const, version: appVersion },
    data: { cases },
  };

  const canonical = JSON.stringify(base.data);
  const hash = await sha256Hex(canonical);

  return {
    ...base,
    integrity: {
      algo: "SHA-256",
      value: hash,
    },
  };
}

export async function validateImportBundle(raw: unknown): Promise<ImportOk | ImportFail> {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "JSON inválido (objeto raíz no válido)." };
  }

  // Hardening: rechazar keys peligrosas
  if (containsDangerousKeys(raw)) {
    return { ok: false, error: "Archivo rechazado: contiene claves peligrosas." };
  }

  const r = raw as {
    schemaVersion?: string;
    data?: { cases?: unknown[] };
    integrity?: { algo?: string; value?: string };
    signature?: unknown;
  };

  if (r.schemaVersion !== "SCCE_APP_STATE_V2" && r.schemaVersion !== "SCCE_APP_STATE_V3") {
    return {
      ok: false,
      error: "Versión de schema no soportada.",
    };
  }

  if (!r.data || typeof r.data !== "object") return { ok: false, error: "Falta bloque data." };
  if (!Array.isArray(r.data.cases)) return { ok: false, error: "data.cases debe ser un arreglo." };

  const cases = r.data.cases as CaseItem[];

  for (const c of cases as { id?: string; timeline?: unknown[] }[]) {
    if (!c || typeof c !== "object") return { ok: false, error: "Caso inválido (no objeto)." };
    if (typeof c.id !== "string" || !(c.id as string).trim())
      return { ok: false, error: "Caso sin id válido." };

    const tl = c.timeline ?? [];
    if (!Array.isArray(tl)) return { ok: false, error: `Caso ${c.id}: timeline debe ser arreglo.` };

    for (const ev of tl as { at?: unknown; type?: unknown; actor?: unknown; eventId?: unknown }[]) {
      if (!ev || typeof ev !== "object") return { ok: false, error: `Caso ${c.id}: evento inválido.` };
      if (!isIsoDate(ev.at)) return { ok: false, error: `Caso ${c.id}: evento con at inválido.` };
      if (typeof ev.type !== "string") return { ok: false, error: `Caso ${c.id}: evento sin type.` };
      if (typeof ev.actor !== "string") return { ok: false, error: `Caso ${c.id}: evento sin actor.` };

      // Compatibilidad: eventId puede no venir, pero si viene debe ser string no vacía
      if (ev.eventId !== undefined) {
        if (typeof ev.eventId !== "string" || !ev.eventId.trim()) {
          return { ok: false, error: `Caso ${c.id}: eventId inválido.` };
        }
      }
    }
  }

  // Unicidad de eventId (solo para los que vengan)
  const seen = new Set<string>();
  for (const c of cases as { timeline?: { eventId?: string }[] }[]) {
    for (const ev of (c.timeline ?? []) as { eventId?: string }[]) {
      const id = ev.eventId;
      if (typeof id === "string" && id) {
        if (seen.has(id)) return { ok: false, error: `eventId duplicado detectado: ${id}` };
        seen.add(id);
      }
    }
  }

  // Sanitiza timeline para casos donde venga null/otro (por seguridad defensiva)
  const sanitized = (cases as { timeline?: unknown[] }[]).map((c) => ({
    ...c,
    timeline: Array.isArray(c.timeline) ? c.timeline : [],
  })) as CaseItem[];

  // Verificación de integridad solo si es V3
  if (r.schemaVersion === "SCCE_APP_STATE_V3") {
    if (!r.integrity || r.integrity.algo !== "SHA-256" || typeof r.integrity.value !== "string") {
      return { ok: false, error: "Bloque de integridad inválido." };
    }

    const canonical = JSON.stringify({ cases: sanitized });
    const expected = await sha256Hex(canonical);

    if (expected !== r.integrity.value) {
      return { ok: false, error: "Integridad fallida: archivo alterado o corrupto." };
    }
  }

  let signatureStatus: SignatureStatus = "none";

  if (r.signature !== undefined) {
    const sig = r.signature as {
      algo?: unknown;
      publicKeyB64?: unknown;
      valueB64?: unknown;
      signedAt?: unknown;
    };

    if (
      !sig ||
      sig.algo !== "Ed25519" ||
      typeof sig.publicKeyB64 !== "string" ||
      typeof sig.valueB64 !== "string" ||
      typeof sig.signedAt !== "string"
    ) {
      return { ok: false, error: "Bloque de firma inválido." };
    }

    const hashHex = r.integrity?.value;
    if (typeof hashHex !== "string" || !hashHex) {
      return { ok: false, error: "No se puede verificar firma: falta hash de integridad." };
    }

    const okSig = await verifySignature({
      publicKeyB64: sig.publicKeyB64,
      signatureB64: sig.valueB64,
      hashHex,
    });

    if (!okSig) {
      return { ok: false, error: "Firma inválida: archivo no confiable." };
    }

    const trusted = await getTrustedPublicKeys();
    signatureStatus = trusted.has(sig.publicKeyB64) ? "valid_trusted" : "valid_untrusted";
  }

  return { ok: true, cases: sanitized, signatureStatus };
}
