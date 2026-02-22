// src/components/HelpDrawer.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { HelpBlock } from "../helpContent";

type Props = {
  open: boolean;
  onClose: () => void;
  content: HelpBlock;
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

export function HelpDrawer({ open, onClose, content }: Props) {
  const isMobile = useIsMobile(768);

  // Estilos mínimos (CSS-in-JS inline) para no depender de Tailwind
  const S = useMemo(() => {
    const overlay: React.CSSProperties = {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: open ? "block" : "none",
      zIndex: 999
    };

    const panelBase: React.CSSProperties = {
      position: "fixed",
      top: 0,
      right: 0,
      height: "100vh",
      width: isMobile ? "100vw" : 380,
      background: "#fff",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
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
      borderBottom: "1px solid rgba(0,0,0,0.08)"
    };

    const body: React.CSSProperties = {
      padding: "12px 14px",
      overflowY: "auto"
    };

    const h1: React.CSSProperties = {
      margin: 0,
      fontSize: 17,
      fontWeight: 800,
      color: "#0f172a"
    };
    const h2: React.CSSProperties = {
      margin: "18px 0 8px",
      fontSize: 13,
      fontWeight: 800,
      color: "#1e293b",
      letterSpacing: 0.3
    };
    const p: React.CSSProperties = {
      margin: "6px 0 0",
      fontSize: 13,
      lineHeight: 1.45,
      color: "#334155"
    };
    const ul: React.CSSProperties = {
      margin: "8px 0 0",
      paddingLeft: 18,
      fontSize: 13,
      lineHeight: 1.45,
      color: "#334155"
    };
    const closeBtn: React.CSSProperties = {
      border: "1px solid rgba(0,0,0,0.15)",
      background: "#fff",
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
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
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
