import type React from "react";
import type { CaseItem } from "../../domain/types";

export interface SimReportShape {
  total: number;
  critica?: number;
  alta?: number;
  avgScore?: number;
}

export interface SimSurveyState {
  claridad: number;
  respaldo: number;
  submitted: boolean;
}

export interface SimulationGate {
  simCases: CaseItem[];
  simReport: SimReportShape | null;
  simSurvey: SimSurveyState;
  setSimSurvey: React.Dispatch<React.SetStateAction<SimSurveyState>>;
  runSimulation: () => void;
  loadSimCases: () => void;
  S: Record<string, unknown>;
  themeColor: (key: string) => string;
  critColor: (criticality: string) => string;
  Badge: React.ComponentType<Record<string, unknown>>;
  /** Solo contexto visual en SIMULACION: tipo de contexto, id y label del rol simulado. */
  contextType?: string;
  simulatedRoleId?: string;
  simulatedRoleLabel?: string;
}
