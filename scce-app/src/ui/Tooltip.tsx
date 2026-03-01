// src/ui/Tooltip.tsx
import * as React from "react";
import { createPortal } from "react-dom";

type TooltipPlacement = "bottom-start" | "top-start";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function Tooltip({
  children,
  content,
  placement = "bottom-start",
  maxWidth = 280,
  panelStyle,
  openOnClick = true, // clave para móvil
}: Readonly<{
  children: React.ReactElement;
  content: React.ReactNode;
  placement?: TooltipPlacement;
  maxWidth?: number;
  panelStyle?: React.CSSProperties;
  openOnClick?: boolean;
}>) {
  const anchorRef = React.useRef<HTMLSpanElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const computePos = React.useCallback(() => {
    const a = anchorRef.current;
    const p = panelRef.current;
    if (!a || !p) return;

    const ar = a.getBoundingClientRect();
    const pr = p.getBoundingClientRect();

    const gap = 8;

    let top =
      placement === "bottom-start"
        ? ar.bottom + gap
        : ar.top - pr.height - gap;

    let left = ar.left;

    // Mantener dentro de viewport
    left = clamp(left, 8, globalThis.innerWidth - pr.width - 8);
    top = clamp(top, 8, globalThis.innerHeight - pr.height - 8);

    setPos({ top, left });
  }, [placement]);

  React.useLayoutEffect(() => {
    if (!open) return;
    computePos();
    // Recalcular si cambia tamaño/scroll
    const onScroll = () => computePos();
    const onResize = () => computePos();
    globalThis.addEventListener("scroll", onScroll, true);
    globalThis.addEventListener("resize", onResize);
    return () => {
      globalThis.removeEventListener("scroll", onScroll, true);
      globalThis.removeEventListener("resize", onResize);
    };
  }, [open, computePos]);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      const a = anchorRef.current;
      const p = panelRef.current;
      const t = e.target as Node | null;
      if (!a || !p || !t) return;
      if (a.contains(t) || p.contains(t)) return;
      setOpen(false);
    };

    globalThis.addEventListener("keydown", onKeyDown);
    globalThis.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      globalThis.removeEventListener("keydown", onKeyDown);
      globalThis.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  const child = React.cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseEnter?.(e);
      setOpen(true);
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      children.props.onMouseLeave?.(e);
      setOpen(false);
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      children.props.onFocus?.(e);
      setOpen(true);
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      children.props.onBlur?.(e);
      setOpen(false);
    },
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      children.props.onPointerDown?.(e);
      if (!openOnClick) return;
      // Tap/clic: toggle (ideal móvil)
      setOpen((v) => !v);
    },
  });

  return (
    <span
      ref={anchorRef}
      tabIndex={0}
      style={{ position: "relative", display: "inline-flex", outline: "none" }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {child}
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="tooltip"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
              maxWidth,
              padding: "10px 12px",
              borderRadius: "8px",
              fontSize: "11px",
              lineHeight: 1.4,
              boxShadow: "0 10px 28px rgba(0,0,0,.45)",
              ...panelStyle,
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </span>
  );
}
