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
          borderTop: `1px solid ${themeColor("mutedDarker")}`,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: "12px",
              color: themeColor("legacySlate"),
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {c.summary || "—"}
          </div>
          <div style={{ fontSize: "11px", color: themeColor("mutedAlt") }}>
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
          <div style={{ fontWeight: 900, margin: "8px 0", color: themeColor("legacySlate"), letterSpacing: 0.3, fontSize: 11, textTransform: "uppercase" }}>
            Prioridad inmediata
          </div>
          {high.map(({ c, rec }) => (
            <Row key={c.id} c={c} right={`${rec.icon} ${rec.label}`} onOpen={onOpenCase} />
          ))}
        </div>
      )}
      {medium.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 900, margin: "8px 0", color: themeColor("legacySlate"), letterSpacing: 0.3, fontSize: 11, textTransform: "uppercase" }}>
            En seguimiento
          </div>
          {medium.map(({ c, rec }) => (
            <Row key={c.id} c={c} right={`${rec.icon} ${rec.label}`} onOpen={onOpenCase} />
          ))}
        </div>
      )}
      {low.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 900, margin: "8px 0", color: themeColor("legacySlate"), letterSpacing: 0.3, fontSize: 11, textTransform: "uppercase" }}>
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
    <div style={{ minHeight: "100vh", background: themeColor("legacyBlueBlock"), display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          background: themeColor("legacyBlueBlock"),
          borderBottom: `1px solid ${themeColor("legacyDark4")}`,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontWeight: 600, color: themeColor("legacySlate"), fontSize: 14 }}>SCCE</span>
          <span style={{ opacity: 0.7, color: themeColor("mutedAlt"), fontSize: 13 }}>{roleLabel}</span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ opacity: 0.6, fontSize: 12, color: themeColor("mutedAlt") }}>Elección 2026</span>
          {!isCrisisMode && onGoToDashboard && (
            <button
              type="button"
              onClick={onGoToDashboard}
              style={{
                background: themeColor("legacyDark4"),
                color: themeColor("white"),
                border: `1px solid ${rgbaFromKey("white", 0.1)}`,
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
          {membershipsCount > 1 && onSwitchContext && (
            <button
              type="button"
              onClick={onSwitchContext}
              style={{
                background: themeColor("blueDark"),
                color: themeColor("white"),
                border: `1px solid ${rgbaFromKey("primary", 0.4)}`,
                padding: "6px 12px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
              }}
              title="Elegir otro rol/contexto sin cerrar sesión"
            >
              Cambiar contexto
            </button>
          )}
          <button
            type="button"
            onClick={() => (onLogout ? onLogout() : window.location.reload())}
            style={{
              background: themeColor("mutedDarker"),
              color: themeColor("white"),
              border: "none",
              padding: "6px 12px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
            }}
            title="Cerrar sesión e iniciar con otro usuario"
          >
            Cambiar usuario
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12, padding: 12, flex: 1 }}>
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: themeColor("legacySlate"), fontSize: 12 }}>
              Modo Operativo · {currentUser.name}
            </span>
            <Chip tone={pendingCount > 0 ? "warning" : "neutral"} title="Instrucciones dirigidas a ti no cerradas">
              Con pendientes: {pendingCount}
            </Chip>
          </div>
          <div style={{ fontWeight: 700, marginBottom: 8, color: themeColor("mutedAlt"), fontSize: 14 }}>
            Casos activos ({activeCases.length})
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

      <section>{children}</section>
      </div>
    </div>
  );
}
