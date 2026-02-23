import React from "react";
import { sortCasesForTerrain, pendingInstructionsCountForUser, totalPendingInstructionsForUser } from "../../domain/cases/terrainSort";
import { getRecommendation } from "../../domain/recommendation";

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

type CaseLike = { id: string; summary: string; commune: string; status: string; criticalityScore?: number; criticality?: string; updatedAt?: string | null; createdAt?: string | null; instructions?: { ackRequired?: boolean; acks?: { userId?: string }[]; to?: { role?: string; userId?: string }; cc?: { role?: string; userId?: string }[]; status?: string }[]; communeName?: string; communeCode?: string | null; local?: string | null; localName?: string | null };

function formatPlace(c: { commune?: string; communeName?: string; communeCode?: string | null; local?: string | null; localName?: string | null }): string {
  const communeName = c?.communeName || c?.commune || "—";
  const communeCode = c?.communeCode ?? null;
  const local = c?.localName || c?.local || "—";
  const commune = communeCode ? `${communeName} (${communeCode})` : communeName;
  return `${commune} · ${local}`;
}

function Row({
  c,
  right,
  onOpen,
}: {
  c: CaseLike;
  right?: string;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(c.id)}
      style={{
        width: "100%",
        textAlign: "left",
        background: "transparent",
        border: "0",
        padding: 0,
        cursor: "pointer",
      }}
      title="Abrir detalle"
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          padding: "6px 0",
          borderTop: "1px solid #1f2a44",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: "12px",
              color: "#e2e8f0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {c.summary || "—"}
          </div>
          <div style={{ fontSize: "11px", color: "#94a3b8" }}>
            {formatPlace(c)}
          </div>
        </div>
        <div style={{ fontSize: "11px", color: "#cbd5e1", whiteSpace: "nowrap" }}>
          {right ?? ""}
        </div>
      </div>
    </button>
  );
}

function OpCyclePanel({
  cases,
  onOpenCase,
}: {
  cases: CaseLike[];
  onOpenCase: (id: string) => void;
}) {
  const recs = cases.map((c) => ({ c, rec: getRecommendation({ ...c, createdAt: c.createdAt ?? undefined }, "OP") }));
  const high = recs.filter(({ rec }) => rec.level === "high");
  const medium = recs.filter(({ rec }) => rec.level === "medium");
  const low = recs.filter(({ rec }) => rec.level === "low");

  return (
    <div>
      {high.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 900, margin: "8px 0", color: "#e2e8f0", letterSpacing: 0.3, fontSize: 11, textTransform: "uppercase" }}>
            Prioridad inmediata
          </div>
          {high.map(({ c, rec }) => (
            <Row key={c.id} c={c} right={`${rec.icon} ${rec.label}`} onOpen={onOpenCase} />
          ))}
        </div>
      )}
      {medium.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 900, margin: "8px 0", color: "#e2e8f0", letterSpacing: 0.3, fontSize: 11, textTransform: "uppercase" }}>
            En seguimiento
          </div>
          {medium.map(({ c, rec }) => (
            <Row key={c.id} c={c} right={`${rec.icon} ${rec.label}`} onOpen={onOpenCase} />
          ))}
        </div>
      )}
      {low.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 900, margin: "8px 0", color: "#e2e8f0", letterSpacing: 0.3, fontSize: 11, textTransform: "uppercase" }}>
            Confirmaciones recientes
          </div>
          {low.map(({ c, rec }) => (
            <Row key={c.id} c={c} right={`${rec.icon} ${rec.label}`} onOpen={onOpenCase} />
          ))}
        </div>
      )}
    </div>
  );
}

type Props = {
  currentUser: { id: string; name: string; role: string };
  cases: CaseLike[];
  selectedCaseId: string | null;
  setSelectedCaseId: (id: string) => void;
  onGoToDashboard?: () => void;
  onLogout?: () => void;
  isCrisisMode?: boolean;
  children?: React.ReactNode;
};

export function TerrainShell({
  currentUser,
  cases,
  selectedCaseId: _selectedCaseId,
  setSelectedCaseId,
  onGoToDashboard,
  onLogout,
  isCrisisMode = false,
  children,
}: Props) {
  const [filterPendingOnly, setFilterPendingOnly] = React.useState(false);

  const pendingCount = React.useMemo(
    () => totalPendingInstructionsForUser(cases, currentUser),
    [cases, currentUser]
  );

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

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ opacity: 0.6, fontSize: 12, color: "#94a3b8" }}>Elección 2026</span>
          {!isCrisisMode && onGoToDashboard && (
            <button
              type="button"
              onClick={onGoToDashboard}
              style={{
                background: "#1e293b",
                color: "white",
                border: "1px solid rgba(255,255,255,0.10)",
                padding: "6px 10px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
              }}
              title="Ir al panel general"
            >
              Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={() => (onLogout ? onLogout() : window.location.reload())}
            style={{
              background: "#334155",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
            }}
            title="Cambiar usuario/rol"
          >
            Cambiar usuario
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12, padding: 12, flex: 1 }}>
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 12 }}>
              Modo Operativo · {currentUser.name}
            </span>
            <Chip tone={pendingCount > 0 ? "warning" : "neutral"} title="Instrucciones dirigidas a ti no cerradas">
              Con pendientes: {pendingCount}
            </Chip>
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

        <OpCyclePanel
          cases={activeCases}
          onOpenCase={(id) => setSelectedCaseId(id)}
        />
      </section>

      <section>{children}</section>
      </div>
    </div>
  );
}
