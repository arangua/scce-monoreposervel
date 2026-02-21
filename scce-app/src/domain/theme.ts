import type { RecLevel } from "./recommendation";

export function recColor(l: RecLevel): string {
  const map = {
    high: "#ef4444",
    medium: "#f97316",
    low: "#94a3b8",
  } as const;

  return map[l] ?? "#94a3b8";
}
