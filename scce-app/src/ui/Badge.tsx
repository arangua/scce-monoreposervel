// src/ui/Badge.tsx
import * as React from "react";

type BadgeSize = "xs" | "sm" | "md";

const SIZE_STYLE: Record<BadgeSize, React.CSSProperties> = {
  xs: { fontSize: "9px", padding: "2px 6px", borderRadius: "999px" },
  sm: { fontSize: "11px", padding: "3px 8px", borderRadius: "999px" },
  md: { fontSize: "13px", padding: "4px 10px", borderRadius: "999px" },
};

type Props = {
  children: React.ReactNode;
  size?: BadgeSize;
  style?: React.CSSProperties;
  className?: string;
  title?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
} & React.HTMLAttributes<HTMLElement>;

export function Badge({
  children,
  size = "xs",
  style,
  className,
  title,
  onClick,
  ...rest
}: Props) {
  const clickable = !!onClick;

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    lineHeight: 1,
    fontWeight: 800,
    userSelect: "none",
    outline: "none",
    border: "none",
    background: "none",
    ...(clickable ? { cursor: "pointer" } : null),
    ...SIZE_STYLE[size],
    ...style,
  };

  if (clickable) {
    return (
      <button
        type="button"
        title={title}
        className={className}
        onClick={onClick}
        style={baseStyle}
        {...rest}
      >
        {children}
      </button>
    );
  }

  return (
    <span title={title} className={className} style={baseStyle} {...rest}>
      {children}
    </span>
  );
}
