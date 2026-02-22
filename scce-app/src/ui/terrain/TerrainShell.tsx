import React from "react";
import { sortCasesForTerrain, pendingInstructionsCountForUser } from "../../domain/cases/terrainSort";

type CaseLike = { id: string; summary: string; commune: string; status: string; criticalityScore?: number; criticality?: string; updatedAt?: string | null; instructions?: { ackRequired?: boolean; acks?: { userId?: string }[] }[] };

type Props = {
  currentUser: { id: string; name: string; role: string };
  cases: CaseLike[];
  selectedCaseId: string | null;
  setSelectedCaseId: (id: string) => void;
  children?: React.ReactNode;
};

export function TerrainShell({
  currentUser,
  cases,
  selectedCaseId,
  setSelectedCaseId,
  children,
}: Props) {
  const activeCasesRaw = cases.filter((c) => c.status !== "Cerrado");
  const activeCases = sortCasesForTerrain(activeCasesRaw, currentUser);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 12, padding: 12, minHeight: "100vh", background: "#0f172a" }}>
      <section>
        <div style={{ fontWeight: 700, marginBottom: 8, color: "#e2e8f0", fontSize: 12 }}>
          Vista terreno · {currentUser.name}
        </div>
        <div style={{ fontWeight: 700, marginBottom: 8, color: "#94a3b8", fontSize: 14 }}>
          Casos activos ({activeCases.length})
        </div>

        {activeCases.map((c) => {
          const pending = pendingInstructionsCountForUser(c, currentUser);
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
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                Pendientes: <b>{pending}</b>
              </div>
            </div>
          );
        })}
      </section>

      <section>{children}</section>
    </div>
  );
}
