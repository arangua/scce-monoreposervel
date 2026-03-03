// scce-app/src/domain/signingVault.ts
// Vault cifrado (IndexedDB + AES-GCM) para llave Ed25519.
// Firma opcional: si no hay llave, no se firma.

type VaultRecord = {
  id: "SCCE_ED25519_V1";
  createdAt: string;
  publicKeyB64: string; // raw public key
  saltB64: string; // PBKDF2 salt
  ivB64: string; // AES-GCM iv
  privateKeyEncB64: string; // AES-GCM ciphertext (PKCS8)
};

const DB_NAME = "SCCE_VAULT_DB";
const STORE = "vault";
const KEY_ID: VaultRecord["id"] = "SCCE_ED25519_V1";

const TRUST_DB_NAME = "SCCE_TRUST_DB";
const TRUST_STORE = "trusted";
const TRUST_KEY = "TRUSTED_PUBKEYS_V1";

export type TrustEntry = {
  publicKeyB64: string;
  alias: string;
  addedAt: string;
  reason: string;
};

type TrustStoreRecord = {
  keys: string[];
  entries: TrustEntry[];
};

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function openDb(dbName: string, storeName: string): Promise<IDBDatabase> {
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(dbName: string, storeName: string, key: string): Promise<T | null> {
  const db = await openDb(dbName, storeName);
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut<T>(dbName: string, storeName: string, key: string, value: T): Promise<void> {
  const db = await openDb(dbName, storeName);
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const req = store.put(value as unknown as object, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 150_000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptBytes(passphrase: string, plain: Uint8Array): Promise<{
  salt: Uint8Array;
  iv: Uint8Array;
  cipher: Uint8Array;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aesKey = await deriveAesKey(passphrase, salt);
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    aesKey,
    plain as BufferSource
  );
  return { salt, iv, cipher: new Uint8Array(cipherBuf) };
}

async function decryptBytes(
  passphrase: string,
  salt: Uint8Array,
  iv: Uint8Array,
  cipher: Uint8Array
): Promise<Uint8Array> {
  const aesKey = await deriveAesKey(passphrase, salt);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    aesKey,
    cipher as BufferSource
  );
  return new Uint8Array(plainBuf);
}

export async function hasSigningKey(): Promise<boolean> {
  const rec = await idbGet<VaultRecord>(DB_NAME, STORE, KEY_ID);
  return !!rec?.privateKeyEncB64 && !!rec?.publicKeyB64;
}

function normalizeTrustRecord(rec: { keys?: string[]; entries?: TrustEntry[] } | null | undefined): TrustStoreRecord {
  const keys = rec?.keys ?? [];
  const entries = rec?.entries ?? keys.map((k) => ({ publicKeyB64: k, alias: "Firmante", addedAt: "", reason: "" }));
  return { keys: [...keys], entries: [...entries] };
}

export async function getTrustedPublicKeys(): Promise<Set<string>> {
  const rec = await idbGet<{ keys: string[]; entries?: TrustEntry[] }>(TRUST_DB_NAME, TRUST_STORE, TRUST_KEY);
  const { keys } = normalizeTrustRecord(rec);
  return new Set(keys);
}

export async function getTrustedEntries(): Promise<TrustEntry[]> {
  const rec = await idbGet<{ keys: string[]; entries?: TrustEntry[] }>(TRUST_DB_NAME, TRUST_STORE, TRUST_KEY);
  const { entries } = normalizeTrustRecord(rec);
  return entries;
}

export async function addTrustedKey(params: {
  publicKeyB64: string;
  alias: string;
  reason: string;
}): Promise<void> {
  const rec = await idbGet<{ keys: string[]; entries?: TrustEntry[] }>(TRUST_DB_NAME, TRUST_STORE, TRUST_KEY);
  const { keys, entries } = normalizeTrustRecord(rec);
  if (keys.includes(params.publicKeyB64)) return;
  const now = new Date().toISOString();
  await idbPut(TRUST_DB_NAME, TRUST_STORE, TRUST_KEY, {
    keys: [...keys, params.publicKeyB64],
    entries: [...entries, { publicKeyB64: params.publicKeyB64, alias: params.alias, addedAt: now, reason: params.reason }],
  });
}

export async function removeTrustedKey(publicKeyB64: string): Promise<void> {
  const rec = await idbGet<{ keys: string[]; entries?: TrustEntry[] }>(TRUST_DB_NAME, TRUST_STORE, TRUST_KEY);
  const { keys, entries } = normalizeTrustRecord(rec);
  const nextKeys = keys.filter((k) => k !== publicKeyB64);
  const nextEntries = entries.filter((e) => e.publicKeyB64 !== publicKeyB64);
  await idbPut(TRUST_DB_NAME, TRUST_STORE, TRUST_KEY, { keys: nextKeys, entries: nextEntries });
}

/** Huella corta: SHA-256(publicKey raw) → primeros 4 + últimos 4 bytes en hex (ej. AB12…9F0C). */
export async function publicKeyFingerprintShort(publicKeyB64: string): Promise<string> {
  const raw = fromB64(publicKeyB64);
  const hash = await crypto.subtle.digest("SHA-256", raw as BufferSource);
  const arr = new Uint8Array(hash);
  const hex = (b: number) => b.toString(16).toUpperCase().padStart(2, "0");
  const first = Array.from(arr.slice(0, 4)).map(hex).join("");
  const last = Array.from(arr.slice(-4)).map(hex).join("");
  return `${first}…${last}`;
}

async function trustPublicKey(pubKeyB64: string, alias = "Llave local", reason = "Creada al configurar firma"): Promise<void> {
  await addTrustedKey({ publicKeyB64: pubKeyB64, alias, reason });
}

export async function initSigningKey(passphrase: string): Promise<{ publicKeyB64: string }> {
  const kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", kp.privateKey));
  const pubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));

  const { salt, iv, cipher } = await encryptBytes(passphrase, pkcs8);

  const record: VaultRecord = {
    id: KEY_ID,
    createdAt: new Date().toISOString(),
    publicKeyB64: toB64(pubRaw),
    saltB64: toB64(salt),
    ivB64: toB64(iv),
    privateKeyEncB64: toB64(cipher),
  };

  await idbPut(DB_NAME, STORE, KEY_ID, record);

  // Este publicKey queda como "confiable" localmente (trust store)
  await trustPublicKey(record.publicKeyB64);

  return { publicKeyB64: record.publicKeyB64 };
}

async function loadPrivateKey(
  passphrase: string
): Promise<{ privateKey: CryptoKey; publicKeyB64: string }> {
  const rec = await idbGet<VaultRecord>(DB_NAME, STORE, KEY_ID);
  if (!rec) throw new Error("NO_KEY");

  const salt = fromB64(rec.saltB64);
  const iv = fromB64(rec.ivB64);
  const cipher = fromB64(rec.privateKeyEncB64);

  const pkcs8 = await decryptBytes(passphrase, salt, iv, cipher);

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8 as BufferSource,
    { name: "Ed25519" },
    false,
    ["sign"]
  );
  return { privateKey, publicKeyB64: rec.publicKeyB64 };
}

export async function signIntegrityHashHex(params: {
  passphrase: string;
  hashHex: string;
}): Promise<{ signatureB64: string; publicKeyB64: string; signedAt: string }> {
  const { privateKey, publicKeyB64 } = await loadPrivateKey(params.passphrase);
  const msg = new TextEncoder().encode(params.hashHex);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "Ed25519" }, privateKey, msg));
  return { signatureB64: toB64(sig), publicKeyB64, signedAt: new Date().toISOString() };
}

export async function verifySignature(params: {
  publicKeyB64: string;
  signatureB64: string;
  hashHex: string;
}): Promise<boolean> {
  const pubRaw = fromB64(params.publicKeyB64);
  const pubKey = await crypto.subtle.importKey(
    "raw",
    pubRaw as BufferSource,
    { name: "Ed25519" },
    false,
    ["verify"]
  );
  const msg = new TextEncoder().encode(params.hashHex);
  const sig = fromB64(params.signatureB64);
  return await crypto.subtle.verify(
    { name: "Ed25519" },
    pubKey,
    sig as BufferSource,
    msg
  );
}
