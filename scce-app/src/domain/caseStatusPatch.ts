import { CASE_STATUS_TIMELINE_EVENT, CASE_STATUS_TIMESTAMP_FIELD } from "./caseStatus";
import type { CaseEvent, CaseItem, CaseStatus } from "./types";

type CaseStatusPatchParams = {
  caseData: CaseItem;
  newStatus: CaseStatus;
  actorId: string;
  eventId: string;
  eventAt: string;
  timestampAt: string;
  updatedAt: string;
};

type CaseStatusTimestampField = "escalatedAt" | "mitigatedAt" | "resolvedAt" | "closedAt";

export function buildCaseStatusPatch({
  caseData,
  newStatus,
  actorId,
  eventId,
  eventAt,
  timestampAt,
  updatedAt,
}: CaseStatusPatchParams): Partial<CaseItem> {
  const timeline: CaseEvent[] = [
    ...(caseData.timeline ?? []),
    {
      eventId,
      type: CASE_STATUS_TIMELINE_EVENT[newStatus] || "STATUS_CHANGED",
      at: eventAt,
      actor: actorId,
      note: `Estado → ${newStatus}`,
    },
  ];
  const tsField = CASE_STATUS_TIMESTAMP_FIELD[newStatus] as CaseStatusTimestampField | undefined;
  const timestampPatch: Partial<Pick<CaseItem, CaseStatusTimestampField>> = tsField
    ? { [tsField]: timestampAt }
    : {};

  return {
    status: newStatus,
    ...timestampPatch,
    timeline,
    updatedAt,
  };
}
