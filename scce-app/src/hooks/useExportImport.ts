/**
 * R-3 — Export / Import de estado SCCE.
 * Extraído de App.tsx (2026-03-27).
 *
 * Devuelve: { onExportState, onImportStateFile }
 * downloadJson es privado al hook.
 */
import { useCallback } from "react";
import type { CaseItem } from "../domain/types";
import { buildExportBundle, validateImportBundle } from "../domain/exportImport";
import { fmtDate, nowISO } from "../domain/date";
import { checkLocalDivergence } from "../domain/localDivergence";
import { USERS } from "../domain/policyEngine";
import { UI_TEXT } from "../config/uiTextStandard";
import { CONFIG_REGIONS } from "../domain/catalog";
import {
  hasSigningKey,
  initSigningKey,
  signIntegrityHashHex,
  publicKeyFingerprintShort,
} from "../domain/signingVault";
import { appendEvent } from "../domain/audit";
import { useAppStore } from "../store/useAppStore";

const APP_VERSION = "1.9";

function downloadJson(filename: string, jsonText: string) {
  const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CONFIG_REGIONS_MAP = CONFIG_REGIONS as Record<string, { name?: string; communes?: Record<string, { name?: string }> }>;

export function useExportImport() {
  const { cases, setCases, currentUser, auditLog, setAuditLog, localCatalog, electionConfig, setNotification } = useAppStore();

  const notify = useCallback(
    (msg: string, type = "info") => {
      setNotification({ msg, type });
      setTimeout(() => setNotification(null), 4000);
    },
    [setNotification]
  );

  const onExportState = useCallback(async () => {
    const bundle = await buildExportBundle(cases, APP_VERSION);
    let signed = false;

    if (await hasSigningKey()) {
      const passphrase = globalThis.prompt(
        UI_TEXT.misc.signPassphrasePrompt ?? "Ingrese passphrase para firmar el export:"
      );
      if (passphrase && passphrase.trim()) {
        try {
          const sig = await signIntegrityHashHex({
            passphrase,
            hashHex: bundle.integrity!.value,
          });
          bundle.signature = {
            algo: "Ed25519",
            publicKeyB64: sig.publicKeyB64,
            valueB64: sig.signatureB64,
            signedAt: sig.signedAt,
          };
          signed = true;
        } catch {
          notify(
            UI_TEXT.errors.signFailed ??
              "No se pudo firmar (passphrase incorrecta o llave invalida). Se exportara sin firma.",
            "error"
          );
        }
      } else {
        notify(
          UI_TEXT.misc.exportUnsignedWarning ?? "Export sin firma (no se ingreso passphrase).",
          "warning"
        );
      }
    } else {
      const wants = globalThis.confirm(
        UI_TEXT.misc.noSigningKeyConfirm ??
          "No hay llave de firma configurada. Deseas crear una ahora (recomendado)?"
      );
      if (wants) {
        const p1 = globalThis.prompt(
          UI_TEXT.misc.signCreatePassphrase1 ?? "Crea una passphrase (guardala):"
        );
        if (p1 && p1.trim()) {
          const p2 = globalThis.prompt(
            UI_TEXT.misc.signCreatePassphrase2 ?? "Repite la passphrase:"
          );
          if (p2 === p1) {
            try {
              await initSigningKey(p1);
              notify(
                UI_TEXT.misc.signKeyCreated ?? "Llave creada. Reintenta Exportar para firmar.",
                "success"
              );
            } catch {
              notify(
                UI_TEXT.errors.signKeyCreateFailed ?? "No se pudo crear la llave de firma.",
                "error"
              );
            }
          } else {
            notify(
              UI_TEXT.errors.signPassphraseMismatch ??
                "Las passphrases no coinciden. Export se hara sin firma.",
              "error"
            );
          }
        }
      }
      notify(
        UI_TEXT.misc.exportUnsignedWarning ?? "Export sin firma (no hay llave configurada).",
        "warning"
      );
    }

    const text = JSON.stringify(bundle, null, 2);
    const name = `SCCE_APP_export_${new Date().toISOString().replaceAll(":", "-")}.json`;
    downloadJson(name, text);

    if (currentUser?.id) {
      setAuditLog((prev) =>
        appendEvent(
          prev,
          "EXPORT_DONE",
          currentUser.id,
          currentUser.role,
          null,
          signed ? "Export estado v3 (firmado)" : "Export estado v3 (sin firma)"
        )
      );
    }

    notify(UI_TEXT.misc.exportOk ?? "Export listo.", "success");
  }, [cases, currentUser, setAuditLog, notify]);

  const onImportStateFile = useCallback(
    async (file: File) => {
      const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
      if (file.size > MAX_IMPORT_BYTES) {
        notify(
          (
            UI_TEXT.errors.importFileTooLarge ??
            "Archivo demasiado grande (max. {maxMb} MB)."
          ).replace("{maxMb}", String(MAX_IMPORT_BYTES / (1024 * 1024))),
          "error"
        );
        return;
      }
      let raw: unknown;
      try {
        raw = JSON.parse(await file.text());
      } catch {
        notify(UI_TEXT.errors.importInvalidJson ?? "Archivo no es JSON valido.", "error");
        return;
      }
      const v = await validateImportBundle(raw);
      if (!v.ok) {
        notify(v.error, "error");
        if (currentUser?.id) {
          const evType = v.error.includes("Firma invalida")
            ? "IMPORT_SIG_INVALID_BLOCKED"
            : v.error.includes("Integridad fallida")
              ? "IMPORT_INTEGRITY_FAILED_BLOCKED"
              : "IMPORT_FAILED";
          setAuditLog((prev) =>
            appendEvent(prev, evType, currentUser.id, currentUser.role, null, v.error.slice(0, 80))
          );
        }
        return;
      }

      const signerPub =
        (raw as { signature?: { publicKeyB64: string } })?.signature?.publicKeyB64 ?? "";
      const fpForAudit = signerPub ? await publicKeyFingerprintShort(signerPub) : "";

      if (v.signatureStatus === "none") {
        notify(
          UI_TEXT.misc.importUnsignedWarning ??
            "Import sin firma: permitido, pero no hay garantia de autoria.",
          "warning"
        );
        if (currentUser?.id)
          setAuditLog((prev) =>
            appendEvent(prev, "IMPORT_SIG_NONE_ALLOWED", currentUser.id, currentUser.role, null, "Import sin firma permitido")
          );
      } else if (v.signatureStatus === "valid_untrusted") {
        const confirmWord = UI_TEXT.misc.trustConfirmWord ?? "CONFIAR";
        const typed = globalThis.prompt(
          UI_TEXT.misc.importUntrustedTypeToConfirm ??
            "Firma valida, pero no confiable. Para continuar escribe CONFIAR:"
        );
        if (typed?.trim() !== confirmWord) {
          notify(
            UI_TEXT.errors.importUntrustedConfirmFailed ?? "No se confirmo la confianza. Import cancelado.",
            "error"
          );
          if (currentUser?.id)
            setAuditLog((prev) =>
              appendEvent(prev, "IMPORT_SIG_VALID_UNTRUSTED_REJECTED", currentUser.id, currentUser.role, null,
                fpForAudit ? `Rechazado - huella ${fpForAudit}` : "Rechazado")
            );
          return;
        }
        if (currentUser?.id)
          setAuditLog((prev) =>
            appendEvent(prev, "IMPORT_SIG_VALID_UNTRUSTED_ACCEPTED", currentUser.id, currentUser.role, null,
              fpForAudit ? `Aceptado - huella ${fpForAudit}` : "Aceptado")
          );
      } else {
        notify(
          UI_TEXT.misc.importSignedTrustedOk ?? "Import con autoria verificada (confiable).",
          "success"
        );
        if (currentUser?.id)
          setAuditLog((prev) =>
            appendEvent(prev, "IMPORT_SIG_VALID_TRUSTED", currentUser.id, currentUser.role, null,
              fpForAudit ? `Import confiable - huella ${fpForAudit}` : "Import confiable")
          );
      }

      const ok = globalThis.confirm(
        UI_TEXT.misc.importConfirm ?? "Esto reemplazara los casos actuales. Continuar?"
      );
      if (!ok) return;
      setCases(v.cases);
      notify(UI_TEXT.misc.importOk ?? "Import realizado.", "success");
    },
    [currentUser, setCases, setAuditLog, notify]
  );

  const exportCaseTXT = useCallback((c: CaseItem) => {
    if (!currentUser) return;
    const ca = auditLog.filter(e => e.caseId === c.id);
    const div = checkLocalDivergence(c, localCatalog);
    const rm = CONFIG_REGIONS_MAP;
    const txt = [
      `SCCE v${APP_VERSION} — REPORTE DE CASO`,
      `ID: ${c.id}`,
      `Eleccion: ${electionConfig.name} · ${electionConfig.date}`,
      `Region: ${rm[c.region]?.name}`,
      `Comuna: ${rm[c.region]?.communes?.[c.commune]?.name || c.commune}`,
      `Local: ${c.local || "—"}`,
      `Snapshot: ${c.localSnapshot ? `${c.localSnapshot.nombre} [${c.localSnapshot.idLocal}] @ ${fmtDate(c.localSnapshot.snapshotAt)}` : "sin snapshot"}`,
      div ? `DIVERGENCIA: ${div.msg}` : null,
      ``,
      `CRITICIDAD: ${c.criticality} (${c.criticalityScore}/15)`,
      `ESTADO: ${c.status}`,
      `${UI_TEXT.misc.reporteBypassLabel}: ${c.bypass ? `SI — ${c.bypassMotivo}` : "No"}`,
      ``,
      `RESUMEN: ${c.summary}`,
      `DETALLE: ${c.detail || "—"}`,
      ``,
      `ACCIONES:`,
      ...(c.actions as { action?: string; result?: string }[]).map(a => `• ${a.action} → ${a.result || "—"}`),
      ``,
      `DECISIONES:`,
      ...(c.decisions as { who?: string; fundament?: string }[]).map(d => `• ${USERS.find(u => u.id === d.who)?.name}: ${d.fundament}`),
      ``,
      `AUDITORIA (${ca.length} eventos):`,
      ...ca.map(e => `[${e.at}] ${e.type} | ${USERS.find(u => u.id === e.actor)?.name || e.actor} | ${e.summary} | ${e.hash}`),
      ``,
      `Generado: ${nowISO()}`,
      `SCCE v${APP_VERSION} — SERVEL Chile`,
    ].filter(l => l !== null).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/plain" }));
    a.download = `SCCE_${c.id}.txt`;
    a.click();
  }, [currentUser, auditLog, localCatalog, electionConfig]);

  return { onExportState, onImportStateFile, exportCaseTXT };
}
