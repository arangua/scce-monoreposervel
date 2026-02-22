import React from "react";
import { sortCasesForTerrain, pendingInstructionsCountForUser } from "../../domain/cases/terrainSort";

// --- Fase 3.2: Chips tácticos (Pendientes / Severidad / Actualizado) ---
type ChipTone = "neutral" | "danger" | "warning" | "info";

function Chip({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  title?: string;
}) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    lineHeight: "14px",
    fontWeight: 600,
    border: "1px solid rgba(255,255,255,0.12)",
    whiteSpace: "nowrap",
  };

  const tones: Record<ChipTone, React.CSSProperties> = {
    neutral: { background: "rgba(148, 163, 184, 0.15)", color: "#94a3b8" },
    info: { background: "rgba(59, 130, 246, 0.2)", border: "1px solid rgba(59, 130, 246, 0.4)", color: "#93c5fd" },
    warning: { background: "rgba(245, 158, 11, 0.2)", border: "1px solid rgba(245, 158, 11, 0.4)", color: "#fcd34d" },
    danger: { background: "rgba(239, 68, 68, 0.2)", border: "1px solid rgba(239, 68, 68, 0.4)", color: "#fca5a5" },
  };

  return (
    <span title={title} style={{ ...base, ...tones[tone] }}>
      {children}
    </span>
  );
}

function toTimeHHmm(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normalizeCriticalityLabel(s?: string | null): "CRITICA" | "ALTA" | "MEDIA" | "BAJA" | null {
  if (!s) return null;
  const up = String(s).trim().toUpperCase();
  if (up === "CRÍTICA" || up === "CRITICA") return "CRITICA";
  if (up === "ALTA") return "ALTA";
  if (up === "MEDIA") return "MEDIA";
  if (up === "BAJA") return "BAJA";
  return null;
}

function severityFromCase(c: { criticalityScore?: number; criticality?: unknown }): { label: string; tone: ChipTone } {
  const score = typeof c?.criticalityScore === "number" && Number.isFinite(c.criticalityScore) ? c.criticalityScore : null;
  const fallback = normalizeCriticalityLabel(c?.criticality as string | null);

  const label =
    score !== null
      ? `Score ${score}`
      : fallback ?? "—";

  if (score !== null) {
    if (score >= 4) return { label, tone: "danger" };
    if (score === 3) return { label, tone: "warning" };
    if (score === 2) return { label, tone: "info" };
    return { label, tone: "neutral" };
  }
  if (fallback === "CRITICA") return { label, tone: "danger" };
  if (fallback === "ALTA") return { label, tone: "warning" };
  if (fallback === "MEDIA") return { label, tone: "info" };
  if (fallback === "BAJA") return { label, tone: "neutral" };
  return { label, tone: "neutral" };
}

type CaseLike = { id: string; summary: string; commune: string; status: string; criticalityScore?: number; criticality?: string; updatedAt?: string | null; instructions?: { ackRequired?: boolean; acks?: { userId?: string }[] }[] };

type Props = {
  currentUser: { id: string; name: string; role: string };
  cases: CaseLike[];
  selectedCaseId: string | null;
  setSelectedCaseId: (id: string) => void;
  onLogout?: () => void;
  children?: React.ReactNode;
};

export function TerrainShell({
  currentUser,
  cases,
  selectedCaseId,
  setSelectedCaseId,
  onLogout,
  children,
}: Props) {
  const [filterPendingOnly, setFilterPendingOnly] = React.useState(false);

  const activeCasesRaw = cases.filter((c) => c.status !== "Cerrado");
  let activeCases = sortCasesForTerrain(activeCasesRaw, currentUser);
  if (filterPendingOnly) {
    activeCases = activeCases.filter((c) => pendingInstructionsCountForUser(c, currentUser) > 0);
  }

  const roleLabel =
    currentUser?.role === "PESE"
      ? "PESE Local"
      : currentUser?.role === "DELEGADO_JE"
        ? "Delegado JE"
        : currentUser?.role ?? "—";

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          background: "#0f172a",
          borderBottom: "1px solid #1e293b",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 14 }}>SCCE</span>
          <span style={{ opacity: 0.7, color: "#94a3b8", fontSize: 13 }}>{roleLabel}</span>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ opacity: 0.6, fontSize: 12, color: "#94a3b8" }}>Elección 2026</span>
          <button
            type="button"
            onClick={() => (onLogout ? onLogout() : (window.location.reload()))}
            style={{
              background: "#334155",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Salir
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12, padding: 12, flex: 1 }}>
        <section>
          <div style={{ fontWeight: 700, marginBottom: 8, color: "#e2e8f0", fontSize: 12 }}>
            Vista terreno · {currentUser.name}
          </div>
          <div style={{ fontWeight: 700, marginBottom: 8, color: "#94a3b8", fontSize: 14 }}>
            Casos activos ({activeCases.length})
          </div>

        {filterPendingOnly && (
          <div style={{
            marginBottom: 12,
            padding: "6px 10px",
            background: "#7f1d1d",
            color: "white",
            borderRadius: 6,
            fontSize: 13,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span>Filtro activo: solo casos con pendientes</span>
            <button
              type="button"
              onClick={() => setFilterPendingOnly(false)}
              style={{
                background: "#991b1b",
                border: "none",
                color: "white",
                padding: "4px 8px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Quitar filtro
            </button>
          </div>
        )}

        {activeCases.map((c) => {
          const pending = pendingInstructionsCountForUser(c, currentUser);
          const sev = severityFromCase(c);
          const hhmm = toTimeHHmm(c.updatedAt);
          return (
            <div
              key={c.id}
              onClick={() => setSelectedCaseId(c.id)}
              style={{
                padding: 8,
                marginBottom: 6,
                cursor: "pointer",
                border: c.id === selectedCaseId ? "2px solid #2563eb" : "1px solid #334155",
                borderRadius: 6,
                background: c.id === selectedCaseId ? "#1e3a5f22" : "#1e293b",
              }}
            >
              <div style={{ fontWeight: 600, color: "#e2e8f0", fontSize: 12 }}>{c.summary}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.commune}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                <span
                  role="button"
                  tabIndex={0}
                  title="Filtrar solo casos con pendientes"
                  onClick={(e) => { e.stopPropagation(); setFilterPendingOnly(true); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFilterPendingOnly(true); } }}
                  style={{ cursor: "pointer", display: "inline-flex" }}
                >
                  <Chip tone={pending > 0 ? "danger" : "neutral"} title="Filtrar solo casos con pendientes">
                    Pendientes: {pending}
                  </Chip>
                </span>
                <Chip tone={sev.tone} title="Severidad (criticalityScore o fallback criticality)">
                  Severidad: {sev.label}
                </Chip>
                <Chip tone="neutral" title={c.updatedAt ? `updatedAt: ${c.updatedAt}` : "Sin updatedAt"}>
                  Actualizado: {hhmm}
                </Chip>
              </div>
            </div>
          );
        })}
      </section>

      <section>{children}</section>
      </div>
    </div>
  );
}
