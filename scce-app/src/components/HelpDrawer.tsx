// src/components/HelpDrawer.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { HelpBlock } from "../helpContent";
import type { CaseItem } from "../domain/types";
import { themeColor, type ThemeColorKey } from "../theme";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "").trim();
  const full = normalized.length === 3
    ? normalized.split("").map((c) => c + c).join("")
    : normalized;
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbaFromKey(key: ThemeColorKey, alpha: number): string {
  const { r, g, b } = hexToRgb(themeColor(key));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type Props = {
  open: boolean;
  onClose: () => void;
  content: HelpBlock;
  caseContext?: CaseItem | null;
};

function useIsMobile(breakpointPx = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= breakpointPx;
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpointPx);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpointPx]);

  return isMobile;
}

function getStepDone(checkKey: string, caseItem: CaseItem | null | undefined): boolean {
  if (!caseItem) return false;
  if (checkKey === "operational_validation") {
    return (caseItem.timeline ?? []).some((ev) => ev.type === "OPERATIONAL_VALIDATION");
  }
  return false;
}

export function HelpDrawer({ open, onClose, content, caseContext }: Props) {
  const isMobile = useIsMobile(768);

  // Estilos mínimos (CSS-in-JS inline) para no depender de Tailwind
  const S = useMemo(() => {
    const overlay: React.CSSProperties = {
      position: "fixed",
      inset: 0,
      background: rgbaFromKey("legacyDark1", 0.35),
      display: open ? "block" : "none",
      zIndex: 999
    };

    const panelBase: React.CSSProperties = {
      position: "fixed",
      top: 0,
      right: 0,
      height: "100vh",
      width: isMobile ? "100vw" : 380,
      background: themeColor("white"),
      boxShadow: `0 10px 30px ${rgbaFromKey("legacyDark1", 0.25)}`,
      zIndex: 1000,
      transform: open ? "translateX(0)" : "translateX(110%)",
      transition: "transform 180ms ease-out",
      display: "flex",
      flexDirection: "column"
    };

    const header: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 14px",
      borderBottom: `1px solid ${rgbaFromKey("legacyDark1", 0.08)}`
    };

    const body: React.CSSProperties = {
      padding: "12px 14px",
      overflowY: "auto"
    };

    const h1: React.CSSProperties = {
      margin: 0,
      fontSize: 17,
      fontWeight: 800,
      color: themeColor("legacyDark1")
    };
    const h2: React.CSSProperties = {
      margin: "18px 0 8px",
      fontSize: 13,
      fontWeight: 800,
      color: themeColor("legacyDark4"),
      letterSpacing: 0.3
    };
    const p: React.CSSProperties = {
      margin: "6px 0 0",
      fontSize: 13,
      lineHeight: 1.45,
      color: themeColor("mutedDarker")
    };
    const ul: React.CSSProperties = {
      margin: "8px 0 0",
      paddingLeft: 18,
      fontSize: 13,
      lineHeight: 1.45,
      color: themeColor("mutedDarker")
    };
    const closeBtn: React.CSSProperties = {
      border: `1px solid ${rgbaFromKey("legacyDark1", 0.15)}`,
      background: themeColor("white"),
      padding: "6px 10px",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 700
    };

    return { overlay, panelBase, header, body, h1, h2, p, ul, closeBtn };
  }, [open, isMobile]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div style={S.overlay} onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Ayuda contextual"
        style={S.panelBase}
      >
        <div style={S.header}>
          <div>
            <div style={S.h1}>Ayuda — {content.title}</div>
            <div style={{ fontSize: 11, color: themeColor("muted"), marginTop: 2 }}>
              {isMobile ? "Modo móvil" : "Modo escritorio"}
            </div>
          </div>

          <button type="button" onClick={onClose} style={S.closeBtn} aria-label="Cerrar ayuda">
            Cerrar
          </button>
        </div>

        <div style={S.body}>
          <div style={S.h2}>Qué haces aquí</div>
          <div style={S.p}>{content.purpose}</div>

          <div style={S.h2}>Pasos rápidos</div>
          <ul style={S.ul}>
            {content.quickSteps.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>

          {content.flowSteps?.length ? (
            <>
              <div style={S.h2}>Guía SCCE — Pasos</div>
              {content.flowSteps.map((fs) => {
                const done = getStepDone(fs.checkKey, caseContext);
                return (
                  <div key={fs.step} style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{done ? "✅" : "○"}</span>
                    <span style={{ flex: 1 }}>Paso {fs.step}: {fs.label}</span>
                    {fs.scrollToId && fs.actionLabel && (
                      <button
                        type="button"
                        style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid #e5e7eb", background: themeColor("white"), cursor: "pointer", fontWeight: 600 }}
                        onClick={() => {
                          onClose();
                          const el = document.getElementById(fs.scrollToId!);
                          el?.scrollIntoView({ behavior: "smooth", block: "center" });
                        }}
                      >
                        {fs.actionLabel}
                      </button>
                    )}
                  </div>
                );
              })}
            </>
          ) : null}

          {content.commonIssues?.length ? (
            <>
              <div style={S.h2}>Problemas típicos</div>
              <ul style={S.ul}>
                {content.commonIssues.map((x, i) => (
                  <li key={i}>{x}</li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
