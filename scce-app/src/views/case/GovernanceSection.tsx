/**
 * Bloque "Gobernanza del incidente": criticidad, etapa, nivel de mando, responsable, escalamiento.
 * Vista presentacional; solo depende de dominio/config/theme.
 */
import React from "react";
import type { CaseItem } from "../../domain/types";
import { themeColor } from "../../theme";
import { UI_TEXT_GOVERNANCE } from "../../config/uiTextGovernance";

const STATUS_TO_STAGE: Record<string, keyof typeof UI_TEXT_GOVERNANCE.governanceStage> = {
  Nuevo: "OPEN",
  "Recepcionado por DR": "IN_ASSESSMENT",
  "En gestión": "IN_PROGRESS",
  Escalado: "ESCALATED",
  Mitigado: "IN_PROGRESS",
  Resuelto: "RESOLVED",
  Cerrado: "CLOSED",
};

const ROLE_TO_LEVEL: Record<string, keyof typeof UI_TEXT_GOVERNANCE.commandLevel> = {
  DIRECTOR_REGIONAL: "REGIONAL",
  NIVEL_CENTRAL: "CENTRAL",
  REGISTRO_SCCE: "TERRITORIAL",
  JEFE_OPS: "TERRITORIAL",
  PESE: "LOCAL",
  DELEGADO_JE: "LOCAL",
  DR_EVENTUAL: "TERRITORIAL",
};

export interface GovernanceSectionProps {
  c: CaseItem;
  /** Estado normalizado del caso (ej. "Resuelto", "En gestión") */
  normalizedStatus: string;
  /** Responsable actual: usuario con name y opcionalmente role */
  assignee: { name: string; role?: string } | null;
}

const cardStyle = (): React.CSSProperties => ({
  background: themeColor("bgSurface"),
  border: `1px solid ${themeColor("border")}`,
  borderRadius: 6,
  padding: 12,
  marginBottom: 10,
});

export function GovernanceSection({ c, normalizedStatus, assignee }: Readonly<GovernanceSectionProps>) {
  const G = UI_TEXT_GOVERNANCE;
  const critKey = { CRITICA: "C4_CRITICAL", ALTA: "C3_HIGH", MEDIA: "C2_MEDIUM", BAJA: "C1_LOW" }[c.criticality] ?? c.criticality;
  const critLabel = (G.criticality as Record<string, string>)[critKey] ?? c.criticality;
  const stageKey = STATUS_TO_STAGE[normalizedStatus] ?? "OPEN";
  const stageLabel = G.governanceStage[stageKey];
  const levelKey = assignee ? (ROLE_TO_LEVEL[assignee.role ?? ""] ?? "TERRITORIAL") : null;
  const levelLabel = levelKey != null ? G.commandLevel[levelKey] : null;
  const responsibleRoleLabel = assignee
    ? (G.institutionalRole as Record<string, string>)[assignee.role ?? ""] ?? assignee.name
    : null;
  const requiresEscalation = normalizedStatus === "Escalado" ? G.yesNo.yes : G.yesNo.no;

  return (
    <div style={cardStyle()}>
      <div style={{ fontSize: "11px", fontWeight: 700, color: themeColor("textSecondary"), textTransform: "uppercase", marginBottom: 8 }}>
        {G.sections.governance}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
        <div><span style={{ color: themeColor("muted") }}>{G.fields.criticality}:</span> {critLabel}</div>
        <div><span style={{ color: themeColor("muted") }}>{G.fields.governanceStage}:</span> {stageLabel}</div>
        {levelKey != null && levelLabel != null ? (
          <div><span style={{ color: themeColor("muted") }}>{G.fields.activeCommandLevel}:</span> {levelLabel}</div>
        ) : null}
        <div><span style={{ color: themeColor("muted") }}>{G.fields.activeCommanderRole}:</span> {responsibleRoleLabel ?? assignee?.name ?? G.emptyStates.noCommandAssigned}</div>
        <div><span style={{ color: themeColor("muted") }}>{G.fields.requiresEscalation}:</span> {requiresEscalation}</div>
      </div>
    </div>
  );
}
