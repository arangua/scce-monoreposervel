import type React from "react";
import { themeColor, THEME } from "../theme";

type Props = Readonly<{
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}>;

export function IconButton({ onClick, children, title }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        height: THEME.controlHeight,
        width: THEME.controlHeight,
        borderRadius: THEME.controlRadius,
        border: `1px solid ${themeColor("strongBorder")}`,
        background: themeColor("mutedBg"),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = themeColor("border");
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = themeColor("mutedBg");
      }}
    >
      {children}
    </button>
  );
}
