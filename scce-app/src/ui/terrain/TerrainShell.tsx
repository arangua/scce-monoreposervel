import React from "react";
import { sortCasesForTerrain, pendingInstructionsCountForUser, totalPendingInstructionsForUser } from "../../domain/cases/terrainSort";
import { getRecommendation } from "../../domain/recommendation";
import { themeColor, type ThemeColorKey } from "../../theme";

function hexToRgb(hex: string) {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

function rgbaFromKey(key: ThemeColorKey, alpha: number) {
  const c = themeColor(key).trim();
  const rgb = c.startsWith("#") ? hexToRgb(c) : null;
  if (!rgb) return c;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

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
    border: `1px solid ${rgbaFromKey("white", 0.12)}`,
    whiteSpace: "nowrap",
  };

  const tones: Record<ChipTone, React.CSSProperties> = {
    neutral: {
      background: rgbaFromKey("mutedAlt", 0.15),
      color: themeColor("mutedAlt"),
    },
    info: {
      background: rgbaFromKey("primary", 0.2),
      border: `1px solid ${rgbaFromKey("primary", 0.4)}`,
      color: themeColor("infoBorder"),
    },
    warning: {
      background: rgbaFromKey("warning", 0.2),
      border: `1px solid ${rgbaFromKey("warning", 0.4)}`,
      color: themeColor("legacyAmberBadge"),
    },
    danger: {
      background: rgbaFromKey("danger", 0.2),
      border: `1px solid ${rgbaFromKey("danger", 0.4)}`,
      color: themeColor("legacyRedText"),
    },
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
          borderTop: "1px solid #334155",
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
        <div style={{ fontSize: "11px", color: themeColor("mutedAlt"), whiteSpace: "nowrap" }}>
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
          <div style={{ fontWeight: 700, margin: "8px 0 4px", color: "#ef4444", letterSpacing: 0.5, fontSize: 10, textTransform: "uppercase" as const }}>
            🚨 Prioridad inmediata
          </div>
          {high.map(({ c, rec }) => (
            <Row key={c.id} c={c} right={`${rec.icon} ${rec.label}`} onOpen={onOpenCase} />
          ))}
        </div>
      )}
      {medium.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, margin: "8px 0 4px", color: "#f59e0b", letterSpacing: 0.5, fontSize: 10, textTransform: "uppercase" as const }}>
            ⚠️ En seguimiento
          </div>
          {medium.map(({ c, rec }) => (
            <Row key={c.id} c={c} right={`${rec.icon} ${rec.label}`} onOpen={onOpenCase} />
          ))}
        </div>
      )}
      {low.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, margin: "8px 0 4px", color: "#4ade80", letterSpacing: 0.5, fontSize: 10, textTransform: "uppercase" as const }}>
            ✅ En gestión
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
  /** Si > 1, se muestra botón "Cambiar contexto" para volver al selector de roles sin cerrar sesión */
  membershipsCount?: number;
  onSwitchContext?: () => void;
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
  membershipsCount = 0,
  onSwitchContext,
  isCrisisMode = false,
  children,
}: Props) {
  void _selectedCaseId;
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
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", flexDirection: "column", fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* Navbar modo terreno */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 16px", background: "#1e293b",
        borderBottom: "1px solid #334155", minHeight: 48,
      }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontWeight: 800, color: "#60a5fa", fontSize: 15, letterSpacing: 0.5 }}>SCCE</span>
          <span style={{ width: 1, height: 18, background: "#334155" }} />
          <span style={{ color: "#94a3b8", fontSize: 12 }}>{roleLabel}</span>
          {pendingCount > 0 && (
            <span style={{ background: "#f59e0b", color: "#fff", fontWeight: 700, fontSize: 11, padding: "2px 8px", borderRadius: 99 }}>
              {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "#64748b", fontSize: 11 }}>Elección 2026</span>
          {!isCrisisMode && onGoToDashboard && (
            <button type="button" onClick={onGoToDashboard}
              style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
              title="Ir al panel general de operaciones">
              Panel general
            </button>
          )}
          {membershipsCount > 1 && onSwitchContext && (
            <button type="button" onClick={onSwitchContext}
              style={{ background: "#1e40af", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
              title="Cambiar a otro contexto o rol sin cerrar sesión">
              Cambiar contexto
            </button>
          )}
          <button type="button" onClick={() => (onLogout ? onLogout() : window.location.reload())}
            style={{ background: "#475569", color: "#fff", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            title="Cerrar sesión">
            Salir
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 0, flex: 1, minHeight: 0 }}>
        {/* Sidebar de casos */}
        <section style={{ background: "#1e293b", borderRight: "1px solid #334155", padding: "12px 14px", overflowY: "auto" as const }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 13 }}>
              Incidentes activos ({activeCases.length})
            </span>
          </div>

        {filterPendingOnly && (
          <div style={{
            marginBottom: 12,
            padding: "6px 10px",
            background: themeColor("legacyRedDark"),
            color: themeColor("white"),
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
                background: themeColor("legacyRedDarkText"),
                border: "none",
                color: themeColor("white"),
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

        {/* Contenido principal */}
        <section style={{ padding: "16px", overflowY: "auto" as const, background: "#0f172a" }}>
          {children}
        </section>
      </div>
    </div>
  );
}
