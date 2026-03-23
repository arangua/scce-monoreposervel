import { getTrustedPublicKeys, verifySignature } from "./signingVault";

type SignatureStatus = "none" | "valid_untrusted" | "valid_trusted" | "invalid";

const MAX_ID = 80;
const MAX_SHORT = 120;
const MAX_MED = 240;
const MAX_LONG = 2000;
const MAX_TIMELINE = 500;
const MAX_EVENT_NOTE = 500;
const MAX_EVIDENCE_ITEMS = 50;
const MAX_TOTAL_PAYLOAD_BYTES = 5 * 1024 * 1024;
const MAX_DATE_STR = 35;
const ISO_SOFT_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
const ID_RE = /^[A-Za-z0-9_-]+$/;

function importFail(msg: string): never {
  throw new Error(msg);
}

function assertImportString(name: string, v: unknown): string {
  if (typeof v !== "string") importFail(`Import fail-closed: "${name}" debe ser string.`);
  const s = v.trim();
  if (!s) importFail(`Import fail-closed: "${name}" no puede ser vacio.`);
  return s;
}

function assertStringMax(name: string, v: unknown, max: number, optional = false): string | undefined {
  if (v === undefined || v === null) return optional ? undefined : importFail(`Import fail-closed: "${name}" es requerido.`);
  const s = assertImportString(name, v);
  if (s.length > max) importFail(`Import fail-closed: "${name}" excede maximo (${max}).`);
  return s;
}

function assertIdStable(v: unknown): string {
  const id = assertStringMax("case.id", v, MAX_ID, false);
  if (id === undefined) importFail(`Import fail-closed: "case.id" es requerido.`);
  if (!ID_RE.test(id)) importFail('Import fail-closed: "case.id" contiene caracteres no permitidos. Use solo A-Z a-z 0-9 _ -');
  return id;
}

function assertArrayMax(name: string, v: unknown, max: number, optional = false): unknown[] | undefined {
  if (v === undefined || v === null) return optional ? undefined : importFail(`Import fail-closed: "${name}" es requerido.`);
  if (!Array.isArray(v)) importFail(`Import fail-closed: "${name}" debe ser arreglo.`);
  if (v.length > max) importFail(`Import fail-closed: "${name}" excede maximo (${max}).`);
  return v;
}

function assertPlainObject(name: string, v: unknown): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) importFail(`Import fail-closed: "${name}" debe ser objeto.`);
  return v as Record<string, unknown>;
}

function assertUnknownItemKind(name: string, v: unknown): void {
  if (typeof v === "string") {
    if (v.trim().length > MAX_LONG) importFail(`Import fail-closed: "${name}" string excede maximo (${MAX_LONG}).`);
    return;
  }
  if (typeof v === "object" && v !== null && !Array.isArray(v)) return;
  importFail(`Import fail-closed: "${name}" debe ser string u objeto.`);
}

function assertCaseEvent(name: string, v: unknown): void {
  const o = assertPlainObject(name, v);
  assertStringMax(`${name}.type`, o.type, MAX_SHORT, false);
  assertStringMax(`${name}.at`, o.at, MAX_SHORT, false);
  assertStringMax(`${name}.actor`, o.actor, MAX_MED, false);
  assertStringMax(`${name}.note`, o.note, MAX_EVENT_NOTE, true);
}

function assertIsoSoft(name: string, v: unknown, optional = false): string | undefined {
  if (v === undefined || v === null) return optional ? undefined : importFail(`Import fail-closed: "${name}" es requerido.`);
  const s = assertImportString(name, v);
  if (s.length > MAX_DATE_STR) importFail(`Import fail-closed: "${name}" excede maximo (${MAX_DATE_STR}).`);
  if (!ISO_SOFT_RE.test(s)) importFail(`Import fail-closed: "${name}" no tiene forma ISO valida (soft).`);
  return s;
}

function validateCasesStrict(casesIn: unknown[]): { ok: true } | { ok: false; error: string } {
  try {
    const totalSize = JSON.stringify(casesIn).length;
    if (totalSize > MAX_TOTAL_PAYLOAD_BYTES) {
      importFail(`Import fail-closed: tamano total de payload excede maximo (${MAX_TOTAL_PAYLOAD_BYTES} bytes).`);
    }

    const seen = new Set<string>();
    for (let i = 0; i < casesIn.length; i++) {
      const c = casesIn[i] as Record<string, unknown>;
      const id = assertIdStable(c?.id);
      if (seen.has(id)) importFail(`Import fail-closed: case.id duplicado "${id}".`);
      seen.add(id);
      assertStringMax(`cases[${i}].region`, c?.region, MAX_SHORT, false);
      assertStringMax(`cases[${i}].commune`, c?.commune, MAX_SHORT, false);
      assertStringMax(`cases[${i}].summary`, c?.summary, MAX_LONG, false);
      assertStringMax(`cases[${i}].local`, c?.local, MAX_MED, true);
      assertStringMax(`cases[${i}].detail`, c?.detail, MAX_LONG, true);
      assertStringMax(`cases[${i}].assignedTo`, c?.assignedTo, MAX_MED, true);
      assertStringMax(`cases[${i}].closingMotivo`, c?.closingMotivo, MAX_LONG, true);
      assertStringMax(`cases[${i}].bypassMotivo`, c?.bypassMotivo, MAX_LONG, true);
      assertStringMax(`cases[${i}].bypassActor`, c?.bypassActor, MAX_MED, true);
      assertStringMax(`cases[${i}].createdBy`, c?.createdBy, MAX_MED, true);

      if (c?.evidence !== undefined && c?.evidence !== null) {
        if (!Array.isArray(c.evidence)) importFail(`Import fail-closed: cases[${i}].evidence debe ser arreglo.`);
        if (c.evidence.length > MAX_EVIDENCE_ITEMS) {
          importFail(`Import fail-closed: cases[${i}].evidence excede maximo (${MAX_EVIDENCE_ITEMS}).`);
        }
        for (let j = 0; j < c.evidence.length; j++) {
          assertStringMax(`cases[${i}].evidence[${j}]`, c.evidence[j], MAX_LONG, false);
        }
      }

      const tl = assertArrayMax(`cases[${i}].timeline`, c?.timeline, MAX_TIMELINE, true);
      if (tl) {
        for (let j = 0; j < tl.length; j++) {
          assertCaseEvent(`cases[${i}].timeline[${j}]`, tl[j]);
          assertIsoSoft(`cases[${i}].timeline[${j}].at`, (tl[j] as Record<string, unknown>).at, false);
        }
      }

      const acts = assertArrayMax(`cases[${i}].actions`, c?.actions, MAX_TIMELINE, true);
      if (acts) {
        for (let j = 0; j < acts.length; j++) assertUnknownItemKind(`cases[${i}].actions[${j}]`, acts[j]);
      }
      const decs = assertArrayMax(`cases[${i}].decisions`, c?.decisions, MAX_TIMELINE, true);
      if (decs) {
        for (let j = 0; j < decs.length; j++) assertUnknownItemKind(`cases[${i}].decisions[${j}]`, decs[j]);
      }
      const eh = assertArrayMax(`cases[${i}].evaluationHistory`, c?.evaluationHistory, MAX_TIMELINE, true);
      if (eh) {
        for (let j = 0; j < eh.length; j++) assertUnknownItemKind(`cases[${i}].evaluationHistory[${j}]`, eh[j]);
      }

      const insArr = assertArrayMax(`cases[${i}].instructions`, c?.instructions, MAX_TIMELINE, true);
      if (insArr) {
        for (let j = 0; j < insArr.length; j++) {
          const ins = insArr[j] as Record<string, unknown>;
          assertStringMax(`cases[${i}].instructions[${j}].id`, ins?.id, MAX_ID, true);
          assertStringMax(`cases[${i}].instructions[${j}].caseId`, ins?.caseId, MAX_ID, true);
          assertStringMax(`cases[${i}].instructions[${j}].scope`, ins?.scope, MAX_SHORT, false);
          assertStringMax(`cases[${i}].instructions[${j}].audience`, ins?.audience, MAX_SHORT, false);
          assertStringMax(`cases[${i}].instructions[${j}].summary`, ins?.summary, MAX_LONG, false);
          assertStringMax(`cases[${i}].instructions[${j}].details`, ins?.details, MAX_LONG, true);
          assertStringMax(`cases[${i}].instructions[${j}].createdAt`, ins?.createdAt, MAX_SHORT, false);
          assertIsoSoft(`cases[${i}].instructions[${j}].createdAt`, ins?.createdAt, false);
          assertStringMax(`cases[${i}].instructions[${j}].createdBy`, ins?.createdBy, MAX_MED, false);
          assertStringMax(`cases[${i}].instructions[${j}].status`, ins?.status, MAX_SHORT, false);
          if (ins?.ackRequired !== true) {
            importFail(`Import fail-closed: cases[${i}].instructions[${j}].ackRequired debe ser true.`);
          }
          const acks = assertArrayMax(`cases[${i}].instructions[${j}].acks`, ins?.acks, MAX_TIMELINE, false);
          if (!acks) importFail(`Import fail-closed: cases[${i}].instructions[${j}].acks debe ser arreglo.`);
          for (let k = 0; k < acks.length; k++) {
            const ack = acks[k] as Record<string, unknown>;
            assertStringMax(`cases[${i}].instructions[${j}].acks[${k}].userId`, ack?.userId, MAX_MED, false);
            assertStringMax(`cases[${i}].instructions[${j}].acks[${k}].role`, ack?.role, MAX_SHORT, false);
            assertStringMax(`cases[${i}].instructions[${j}].acks[${k}].at`, ack?.at, MAX_SHORT, false);
            assertIsoSoft(`cases[${i}].instructions[${j}].acks[${k}].at`, ack?.at, false);
          }
        }
      }

      assertIsoSoft(`cases[${i}].reportedAt`, c?.reportedAt, true);
      assertIsoSoft(`cases[${i}].firstActionAt`, c?.firstActionAt, true);
      assertIsoSoft(`cases[${i}].escalatedAt`, c?.escalatedAt, true);
      assertIsoSoft(`cases[${i}].mitigatedAt`, c?.mitigatedAt, true);
      assertIsoSoft(`cases[${i}].resolvedAt`, c?.resolvedAt, true);
      assertIsoSoft(`cases[${i}].closedAt`, c?.closedAt, true);
      assertIsoSoft(`cases[${i}].createdAt`, c?.createdAt, true);
      assertIsoSoft(`cases[${i}].updatedAt`, c?.updatedAt, true);
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Import fail-closed: estructura de cases invalida." };
  }
}

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
    appVersion?: unknown;
    exportedAt?: unknown;
    cases?: unknown;
    integrity?: { algo?: unknown; value?: unknown };
    signature?: { algo?: unknown; publicKeyB64?: unknown; valueB64?: unknown; signedAt?: unknown };
  };

  if (typeof obj.appVersion !== "string" || !obj.appVersion.trim()) {
    return { ok: false, error: "Bundle invalido: falta appVersion.", signatureStatus: "invalid", cases: [] };
  }

  if (typeof obj.exportedAt !== "string" || !obj.exportedAt.trim()) {
    return { ok: false, error: "Bundle invalido: falta exportedAt.", signatureStatus: "invalid", cases: [] };
  }

  if (!Array.isArray(obj.cases)) {
    return { ok: false, error: "Bundle invalido: falta cases.", signatureStatus: "invalid", cases: [] };
  }

  if (
    !obj.integrity ||
    obj.integrity.algo !== "sha256" ||
    typeof obj.integrity.value !== "string" ||
    !obj.integrity.value.trim()
  ) {
    return { ok: false, error: "Bundle invalido: falta integridad.", signatureStatus: "invalid", cases: [] };
  }

  const payload = { appVersion: obj.appVersion, exportedAt: obj.exportedAt, cases: obj.cases };
  const recalculatedIntegrity = await sha256Hex(JSON.stringify(payload));
  if (recalculatedIntegrity !== obj.integrity.value) {
    return { ok: false, error: "Integridad fallida.", signatureStatus: "invalid", cases: [] };
  }

  const strict = validateCasesStrict(obj.cases);
  if (!strict.ok) {
    return { ok: false, error: strict.error, signatureStatus: "invalid", cases: [] };
  }

  if (!obj.signature) {
    return { ok: true, error: "", signatureStatus: "none", cases: obj.cases };
  }

  const hasAlgo = obj.signature.algo === "Ed25519";
  const hasPub = typeof obj.signature.publicKeyB64 === "string" && obj.signature.publicKeyB64.length > 0;
  const hasVal = typeof obj.signature.valueB64 === "string" && obj.signature.valueB64.length > 0;
  const hasAt = typeof obj.signature.signedAt === "string" && obj.signature.signedAt.length > 0;

  if (!hasAlgo || !hasPub || !hasVal || !hasAt) {
    return { ok: false, error: "Firma inválida.", signatureStatus: "invalid", cases: [] };
  }

  const signaturePublicKey = obj.signature.publicKeyB64 as string;
  const signatureValue = obj.signature.valueB64 as string;
  const integrityValue = obj.integrity.value as string;

  const isValidSignature = await verifySignature({
    publicKeyB64: signaturePublicKey,
    signatureB64: signatureValue,
    hashHex: integrityValue,
  }).catch(() => false);
  if (!isValidSignature) {
    return { ok: false, error: "Firma inválida.", signatureStatus: "invalid", cases: [] };
  }

  const trustedKeys = await getTrustedPublicKeys();
  if (trustedKeys.has(signaturePublicKey)) {
    return { ok: true, error: "", signatureStatus: "valid_trusted", cases: obj.cases };
  }

  return { ok: true, error: "", signatureStatus: "valid_untrusted", cases: obj.cases };
}
