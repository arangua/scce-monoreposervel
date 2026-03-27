/**
 * TrustView.tsx
 * Vista de Firma y Confianza (4.3.b) — gestión de llaves de firma Ed25519.
 * Extraída de App.tsx — R-4b refactor 2026-03-27.
 * Dependencias recibidas por props (sin closure sobre App state).
 */
import React, { useState, useEffect } from "react";
import { themeColor } from "../theme";
import {
  hasSigningKey,
  getTrustedEntries,
  addTrustedKey,
  removeTrustedKey,
  publicKeyFingerprintShort,
} from "../domain/signingVault";
import { appendEvent } from "../domain/audit";
import { UI_TEXT } from "../config/uiTextStandard";
import type { AuditLogEntry } from "../domain/types";
import type { PolicyUser } from "../domain/policyEngine";

export type TrustViewProps = {
  currentUser: PolicyUser | null;
  setAuditLog: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
  notify: (msg: string, type?: string) => void;
  onBack: () => void;
};

type TrustEntry = {
  alias: string;
  addedAt: string;
  reason: string;
  publicKeyB64: string;
  fingerprint: string;
};

type Status = {
  cryptoAvailable: boolean;
  hasKey: boolean;
  trustedCount: number;
};

const S = {
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "10px 12px",
  } as React.CSSProperties,
  btn: (variant: string) =>
    ({
      padding: "6px 14px",
      borderRadius: 4,
      border: "none",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
      background:
        variant === "success" ? themeColor("success") :
        variant === "danger"  ? themeColor("danger") :
        "#374151",
      color: "#fff",
    }) as React.CSSProperties,
  inp: {
    width: "100%",
    padding: "6px 8px",
    borderRadius: 4,
    border: "1px solid #e5e7eb",
    fontSize: 12,
    boxSizing: "border-box",
  } as React.CSSProperties,
  lbl: {
    display: "block",
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
    fontWeight: 600,
  } as React.CSSProperties,
};

export function TrustView({ currentUser, setAuditLog, notify, onBack }: TrustViewProps) {
  const [status, setStatus] = useState<Status | null>(null);
  const [entriesWithFp, setEntriesWithFp] = useState<TrustEntry[]>([]);
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
    void load();
  }, []);

  const recommendation =
    status == null
      ? ""
      : !status.cryptoAvailable
        ? (UI_TEXT.misc.trustRecommendationNoSupport ?? "Usar sin firma.")
        : !status.hasKey
          ? (UI_TEXT.misc.trustRecommendationNoKey ?? "Crear llave para firmar exports.")
          : (UI_TEXT.misc.trustRecommendationOk ?? "Puedes firmar y verificar autoría.");

  const handleAdd = async () => {
    const alias = addForm.alias.trim();
    const pub = addForm.publicKeyB64.trim();
    const reason = addForm.reason.trim();
    if (alias.length < 3)
      return notify(UI_TEXT.errors.trustAddInvalid ?? "Revisa alias, clave pública y motivo.", "error");
    if (reason.length < 5)
      return notify(UI_TEXT.errors.trustAddInvalid ?? "Revisa alias, clave pública y motivo.", "error");
    let validB64 = false;
    try {
      atob(pub.replace(/\s/g, ""));
      if (pub.length >= 40 && pub.length <= 500) validB64 = true;
    } catch {
      validB64 = false;
    }
    if (!validB64)
      return notify(UI_TEXT.errors.trustAddInvalid ?? "Revisa alias, clave pública y motivo.", "error");
    try {
      await addTrustedKey({ publicKeyB64: pub, alias, reason });
      const fp = await publicKeyFingerprintShort(pub);
      if (currentUser?.id)
        setAuditLog((prev) =>
          appendEvent(prev, "TRUST_KEY_ADDED", currentUser.id, currentUser.role, null, `${alias} – ${fp}`)
        );
      notify(UI_TEXT.misc.trustAddedOk ?? "Firmante agregado a confianza.", "success");
      setAddForm({ alias: "", publicKeyB64: "", reason: "" });
      void load();
    } catch {
      notify(UI_TEXT.errors.trustAddFailed ?? "No se pudo agregar el firmante.", "error");
    }
  };

  const handleRemove = async (publicKeyB64: string, alias: string, fingerprint: string) => {
    if (!globalThis.confirm(`¿Quitar a "${alias}" de la lista de confianza?`)) return;
    try {
      await removeTrustedKey(publicKeyB64);
      if (currentUser?.id)
        setAuditLog((prev) =>
          appendEvent(prev, "TRUST_KEY_REMOVED", currentUser.id, currentUser.role, null, `${alias} – ${fingerprint}`)
        );
      notify(UI_TEXT.misc.trustRemovedOk ?? "Firmante eliminado de confianza.", "success");
      void load();
    } catch {
      notify(UI_TEXT.errors.trustRemoveFailed ?? "No se pudo quitar el firmante.", "error");
    }
  };

  if (loading && status == null) return <div style={S.card}>Cargando…</div>;

  return (
    <div>
      <h2 style={{ margin: "0 0 12px", fontSize: "16px" }}>
        {UI_TEXT.labels.trustPanelTitle ?? "Firma y confianza"}
      </h2>
      <button style={{ ...S.btn("dark"), marginBottom: 12 }} onClick={onBack}>
        ← Volver
      </button>

      <div style={{ ...S.card, marginBottom: 10 }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>
          {UI_TEXT.labels.trustStatusTitle ?? "Estado de verificación"}
        </div>
        <div style={{ fontSize: "12px", color: themeColor("legacySlate") }}>
          <div style={{ marginBottom: 4 }}>
            La verificación de autoría está:{" "}
            <strong>
              {status?.cryptoAvailable
                ? (UI_TEXT.misc.trustVerificationAvailable ?? "Disponible")
                : (UI_TEXT.misc.trustVerificationUnavailable ?? "No disponible")}
            </strong>
          </div>
          <div style={{ marginBottom: 4 }}>
            Llave local:{" "}
            <strong>
              {status?.hasKey
                ? (UI_TEXT.misc.trustLocalKeyConfigured ?? "Configurada")
                : (UI_TEXT.misc.trustLocalKeyNotConfigured ?? "No configurada")}
            </strong>
          </div>
          <div style={{ marginBottom: 4 }}>
            Firmantes confiables: <strong>{status?.trustedCount ?? 0}</strong>
          </div>
          <div style={{ marginTop: 6, color: themeColor("mutedAlt") }}>{recommendation}</div>
        </div>
      </div>

      <div style={{ ...S.card, marginBottom: 10 }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>
          {UI_TEXT.labels.trustTrustedListTitle ?? "Firmantes confiables"}
        </div>
        {entriesWithFp.length === 0 ? (
          <div style={{ color: themeColor("muted"), fontSize: "12px" }}>
            Ninguno. Agrega uno más abajo.
          </div>
        ) : (
          <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "6px 8px" }}>{UI_TEXT.labels.trustAliasLabel ?? "Alias"}</th>
                <th style={{ padding: "6px 8px" }}>{UI_TEXT.labels.trustFingerprintLabel ?? "Huella"}</th>
                <th style={{ padding: "6px 8px" }}>Agregada</th>
                <th style={{ padding: "6px 8px" }}></th>
              </tr>
            </thead>
            <tbody>
              {entriesWithFp.map((e) => (
                <tr key={e.publicKeyB64} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "6px 8px" }}>{e.alias}</td>
                  <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: "11px" }}>
                    {e.fingerprint}
                  </td>
                  <td style={{ padding: "6px 8px", color: themeColor("muted") }}>
                    {e.addedAt.slice(0, 10)}
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <button
                      type="button"
                      style={{ ...S.btn("danger"), fontSize: "10px", padding: "2px 8px" }}
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

      <div style={{ ...S.card, marginBottom: 10 }}>
        <div style={{ color: themeColor("mutedAlt"), fontSize: "11px", fontWeight: 600, marginBottom: 8 }}>
          {UI_TEXT.labels.trustAddTitle ?? "Agregar firmante confiable"}
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={S.lbl}>{UI_TEXT.labels.trustAliasLabel ?? "Alias"}</label>
          <input
            style={S.inp}
            value={addForm.alias}
            onChange={(e) => setAddForm((p) => ({ ...p, alias: e.target.value }))}
            placeholder="Ej: SERVEL Tarapacá – Piloto"
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={S.lbl}>{UI_TEXT.labels.trustPublicKeyLabel ?? "Clave pública"}</label>
          <textarea
            style={{ ...S.inp, minHeight: 80 }}
            value={addForm.publicKeyB64}
            onChange={(e) => setAddForm((p) => ({ ...p, publicKeyB64: e.target.value }))}
            placeholder="Pega aquí la clave pública en base64"
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={S.lbl}>{UI_TEXT.labels.trustReasonLabel ?? "Motivo"}</label>
          <textarea
            style={{ ...S.inp, minHeight: 50 }}
            value={addForm.reason}
            onChange={(e) => setAddForm((p) => ({ ...p, reason: e.target.value }))}
            placeholder="Ej: Clave oficial para intercambio entre equipos"
          />
        </div>
        <button style={S.btn("success")} onClick={handleAdd}>
          {UI_TEXT.misc.trustAddButton ?? "➕ Agregar a confianza"}
        </button>
      </div>
    </div>
  );
}
