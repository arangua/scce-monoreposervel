/**
 * Vista Firma y confianza (4.3.b). Recibe gate con callbacks y UI inyectados.
 */
import { useState, useEffect } from "react";
import type React from "react";
import {
  hasSigningKey,
  getTrustedEntries,
  publicKeyFingerprintShort,
  addTrustedKey,
  removeTrustedKey,
} from "../../domain/signingVault";
import type { TrustGate, TrustEntryWithFp } from "./types";

export interface TrustViewProps {
  gate: TrustGate;
}

function getUiText(ui: Record<string, unknown>, path: string, fallback: string): string {
  const parts = path.split(".");
  let v: unknown = ui;
  for (const p of parts) {
    v = (v as Record<string, unknown>)?.[p];
  }
  return (typeof v === "string" ? v : fallback) || fallback;
}

export function TrustView({ gate }: TrustViewProps) {
  const { notify, onTrustKeyAdded, onTrustKeyRemoved, currentUser, UI_TEXT, S, themeColor, setView } = gate;

  const [status, setStatus] = useState<{ cryptoAvailable: boolean; hasKey: boolean; trustedCount: number } | null>(
    null
  );
  const [entriesWithFp, setEntriesWithFp] = useState<TrustEntryWithFp[]>([]);
  const [loading, setLoading] = useState(true);
  const [addForm, setAddForm] = useState({ alias: "", publicKeyB64: "", reason: "" });

  const load = async () => {
    setLoading(true);
    let cryptoAvailable = false;
    try {
      await crypto.subtle.digest("SHA-256", new Uint8Array(1));
      cryptoAvailable = true;
    } catch {
      cryptoAvailable = false;
    }
    const hasKey = await hasSigningKey();
    const entries = await getTrustedEntries();
    const trustedCount = entries.length;
    const withFp = await Promise.all(
      entries.map(async (e) => ({
        ...e,
        fingerprint: await publicKeyFingerprintShort(e.publicKeyB64),
      }))
    );
    setStatus({ cryptoAvailable, hasKey, trustedCount });
    setEntriesWithFp(withFp);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const recommendation = (() => {
    if (status == null) return "";
    if (status.cryptoAvailable === false)
      return getUiText(UI_TEXT, "misc.trustRecommendationNoSupport", "Usar sin firma.");
    if (status.hasKey !== true)
      return getUiText(UI_TEXT, "misc.trustRecommendationNoKey", "Crear llave para firmar exports.");
    return getUiText(UI_TEXT, "misc.trustRecommendationOk", "Puedes firmar y verificar autoría.");
  })();

  const handleAdd = async () => {
    const alias = addForm.alias.trim();
    const pub = addForm.publicKeyB64.trim();
    const reason = addForm.reason.trim();
    const errMsg = getUiText(UI_TEXT, "errors.trustAddInvalid", "Revisa alias, clave pública y motivo.");
    if (alias.length < 3) return notify(errMsg, "error");
    if (reason.length < 5) return notify(errMsg, "error");
    let validB64 = false;
    try {
      atob(pub.replaceAll(/\s/g, ""));
      if (pub.length >= 40 && pub.length <= 500) validB64 = true;
    } catch {
      validB64 = false;
    }
    if (!validB64) return notify(errMsg, "error");
    try {
      await addTrustedKey({ publicKeyB64: pub, alias, reason });
      const fp = await publicKeyFingerprintShort(pub);
      if (currentUser?.id) onTrustKeyAdded(alias, fp);
      notify(getUiText(UI_TEXT, "misc.trustAddedOk", "Firmante agregado a confianza."), "success");
      setAddForm({ alias: "", publicKeyB64: "", reason: "" });
      load();
    } catch {
      notify(getUiText(UI_TEXT, "errors.trustAddFailed", "No se pudo agregar el firmante."), "error");
    }
  };

  const handleRemove = async (publicKeyB64: string, alias: string, fingerprint: string) => {
    if (!globalThis.confirm(`¿Quitar a "${alias}" de la lista de confianza?`)) return;
    try {
      await removeTrustedKey(publicKeyB64);
      if (currentUser?.id) onTrustKeyRemoved(alias, fingerprint);
      notify(getUiText(UI_TEXT, "misc.trustRemovedOk", "Firmante eliminado de confianza."), "success");
      load();
    } catch {
      notify(getUiText(UI_TEXT, "errors.trustRemoveFailed", "No se pudo quitar el firmante."), "error");
    }
  };

  const Sg = S as Record<string, (...args: unknown[]) => unknown> & Record<string, React.CSSProperties>;
  const btn = (variant: string) => (typeof Sg.btn === "function" ? Sg.btn(variant) : Sg.btn) as React.CSSProperties;
  const lbl = Sg.lbl as React.CSSProperties;
  const inp = Sg.inp as React.CSSProperties;

  if (loading && status == null) return <div style={Sg.card}>Cargando…</div>;

  return (
    <div>
      <h2 style={{ margin: "0 0 12px", fontSize: "16px" }}>
        {getUiText(UI_TEXT, "labels.trustPanelTitle", "Firma y confianza")}
      </h2>
      <button style={{ ...btn("dark"), marginBottom: 12 }} onClick={() => setView("dashboard")}>
        ← Volver
      </button>

      <div style={{ ...Sg.card, marginBottom: 10 }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>
          {getUiText(UI_TEXT, "labels.trustStatusTitle", "Estado de verificación")}
        </div>
        <div style={{ fontSize: "12px", color: themeColor("legacySlate") }}>
          <div style={{ marginBottom: 4 }}>
            La verificación de autoría está:{" "}
            <strong>
              {status?.cryptoAvailable
                ? getUiText(UI_TEXT, "misc.trustVerificationAvailable", "Disponible")
                : getUiText(UI_TEXT, "misc.trustVerificationUnavailable", "No disponible")}
            </strong>
          </div>
          <div style={{ marginBottom: 4 }}>
            Llave local:{" "}
            <strong>
              {status?.hasKey
                ? getUiText(UI_TEXT, "misc.trustLocalKeyConfigured", "Configurada")
                : getUiText(UI_TEXT, "misc.trustLocalKeyNotConfigured", "No configurada")}
            </strong>
          </div>
          <div style={{ marginBottom: 4 }}>
            Firmantes confiables: <strong>{status?.trustedCount ?? 0}</strong>
          </div>
          <div style={{ marginTop: 6, color: themeColor("mutedAlt") }}>{recommendation}</div>
        </div>
      </div>

      <div style={{ ...Sg.card, marginBottom: 10 }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>
          {getUiText(UI_TEXT, "labels.trustTrustedListTitle", "Firmantes confiables")}
        </div>
        {entriesWithFp.length === 0 ? (
          <div style={{ color: themeColor("muted"), fontSize: "12px" }}>Ninguno. Agrega uno más abajo.</div>
        ) : (
          <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "6px 8px" }}>{getUiText(UI_TEXT, "labels.trustAliasLabel", "Alias")}</th>
                <th style={{ padding: "6px 8px" }}>{getUiText(UI_TEXT, "labels.trustFingerprintLabel", "Huella")}</th>
                <th style={{ padding: "6px 8px" }}>Agregada</th>
                <th style={{ padding: "6px 8px" }}></th>
              </tr>
            </thead>
            <tbody>
              {entriesWithFp.map((e) => (
                <tr key={e.publicKeyB64} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "6px 8px" }}>{e.alias}</td>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: "11px" }}>{e.fingerprint}</td>
                  <td style={{ padding: "6px 8px", color: themeColor("muted") }}>{e.addedAt.slice(0, 10)}</td>
                  <td style={{ padding: "6px 8px" }}>
                    <button
                      type="button"
                      style={{ ...btn("danger"), fontSize: "10px", padding: "2px 8px" }}
                      onClick={() => handleRemove(e.publicKeyB64, e.alias, e.fingerprint)}
                    >
                      🗑 Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ ...Sg.card, marginBottom: 10 }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>
          {getUiText(UI_TEXT, "labels.trustAddTitle", "Agregar firmante confiable")}
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={lbl} htmlFor="trust-alias">
            {getUiText(UI_TEXT, "labels.trustAliasLabel", "Alias")}
          </label>
          <input
            id="trust-alias"
            style={inp}
            value={addForm.alias}
            onChange={(e) => setAddForm((p) => ({ ...p, alias: e.target.value }))}
            placeholder="Ej: SERVEL Tarapacá – Piloto"
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={lbl} htmlFor="trust-publickey">
            {getUiText(UI_TEXT, "labels.trustPublicKeyLabel", "Clave pública")}
          </label>
          <textarea
            id="trust-publickey"
            style={{ ...inp, minHeight: 80 }}
            value={addForm.publicKeyB64}
            onChange={(e) => setAddForm((p) => ({ ...p, publicKeyB64: e.target.value }))}
            placeholder="Pega aquí la clave pública en base64"
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={lbl} htmlFor="trust-reason">
            {getUiText(UI_TEXT, "labels.trustReasonLabel", "Motivo")}
          </label>
          <textarea
            id="trust-reason"
            style={{ ...inp, minHeight: 50 }}
            value={addForm.reason}
            onChange={(e) => setAddForm((p) => ({ ...p, reason: e.target.value }))}
            placeholder="Ej: Clave oficial para intercambio entre equipos"
          />
        </div>
        <button style={btn("success")} onClick={handleAdd}>
          {getUiText(UI_TEXT, "misc.trustAddButton", "➕ Agregar a confianza")}
        </button>
      </div>
    </div>
  );
}
