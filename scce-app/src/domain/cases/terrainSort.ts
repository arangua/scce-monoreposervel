/**
 * Orden táctico para vista terreno: pendientes → severidad → recencia.
 * Campos reales: criticalityScore, criticality, updatedAt.
 */

type AnyUser = { id?: string } | null | undefined;

function toTimeMs(iso: string | null | undefined): number {
  if (iso == null || typeof iso !== "string") return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function toNumCriticalityLabel(s: unknown): number {
  const v = String(s ?? "").trim().toUpperCase();
  if (v === "CRITICA" || v === "CRÍTICA") return 4;
  if (v === "ALTA") return 3;
  if (v === "MEDIA") return 2;
  if (v === "BAJA") return 1;
  return 0;
}

function pendingInstructionsCountForUser(c: { instructions?: { ackRequired?: boolean; acks?: { userId?: string }[] }[] } | null | undefined, currentUser: AnyUser): number {
  const userId = currentUser?.id;
  if (!userId || !c?.instructions?.length) return 0;
  return c.instructions.filter((ins) => {
    if (!ins.ackRequired) return false;
    const acked = (ins.acks ?? []).some((a) => a.userId === userId);
    return !acked;
  }).length;
}

export function terrainCaseSortKey(c: {
  criticalityScore?: number;
  criticality?: unknown;
  updatedAt?: string | null;
  instructions?: { ackRequired?: boolean; acks?: { userId?: string }[] }[];
}, currentUser: AnyUser) {
  const pending = pendingInstructionsCountForUser(c, currentUser);

  const score =
    typeof c?.criticalityScore === "number" && Number.isFinite(c.criticalityScore)
      ? c.criticalityScore
      : 0;

  const label = toNumCriticalityLabel(c?.criticality);

  const sev = score > 0 ? score : label;

  const t = toTimeMs(c?.updatedAt);

  return { pending, sev, t };
}

type CaseSortable = { id: string; criticalityScore?: number; criticality?: unknown; updatedAt?: string | null; instructions?: { ackRequired?: boolean; acks?: { userId?: string }[] }[] };

export function sortCasesForTerrain<T extends CaseSortable>(cases: T[], currentUser: AnyUser): T[] {
  return [...cases].sort((a, b) => {
    const ka = terrainCaseSortKey(a, currentUser);
    const kb = terrainCaseSortKey(b, currentUser);
    if (kb.pending !== ka.pending) return kb.pending - ka.pending;
    if (kb.sev !== ka.sev) return kb.sev - ka.sev;
    return kb.t - ka.t;
  });
}

export { pendingInstructionsCountForUser };
