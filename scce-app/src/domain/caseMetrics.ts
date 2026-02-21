// src/domain/caseMetrics.ts
import type { CaseItem } from "./types";

export function calcCompleteness(c: CaseItem) {
  let f = 0;
  if (c.summary) f++;
  if (c.detail) f++;
  if (c.evidence?.length) f++;
  if (c.evaluation && Object.keys(c.evaluation).length === 5) f++;
  if (c.assignedTo) f++;
  if (c.actions?.length) f++;
  if (c.decisions?.length) f++;
  if ((c.timeline?.length ?? 0) >= 3) f++;
  return Math.round((f / 8) * 100);
}
