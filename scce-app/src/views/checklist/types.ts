import type React from "react";

export interface ChecklistItem {
  id: string;
  cat: string;
  text: string;
}

export interface ChecklistGate {
  S: Record<string, unknown>;
  themeColor: (key: string) => string;
  Badge: React.ComponentType<Record<string, unknown>>;
}
