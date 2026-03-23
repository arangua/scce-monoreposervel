import type { Criticality } from "./types";

export type CalcCriticalityResult = {
  criticality: Criticality;
  score: number;
  recommendation: string;
};

export function calcCriticality(ev: Record<string, number> | null | undefined): CalcCriticalityResult {
  const vals = Object.values(ev ?? {});
  const max = vals.length ? Math.max(...vals) : 0;
  const sum = vals.reduce((a: number, b: number) => a + b, 0);

  if (max >= 3) return { criticality: "CRITICA", score: sum, recommendation: "⚠️ Escalamiento INMEDIATO al Director Regional y Nivel Central." };
  if (sum >= 8) return { criticality: "ALTA", score: sum, recommendation: "Notificar Director Regional. SLA máx. 30 min." };
  if (sum >= 4) return { criticality: "MEDIA", score: sum, recommendation: "Gestionar a través de Registro SCCE. SLA máx. 60 min." };
  return { criticality: "BAJA", score: sum, recommendation: "Gestión local. Registrar y monitorear." };
}
