/**
 * Roles simulados de sesión (solo en SIMULACION). Fuente única para id/label y resolución.
 * Ver política §5, §10. No cambia membership.role real.
 */
export const SIMULATED_ROLES = [
  { id: "PESE", label: "PESE" },
  { id: "DELEGADO_JE", label: "Delegado JE" },
  { id: "FUNCIONARIO_TERRENO", label: "Funcionario en terreno" },
  { id: "APOYO_REGIONAL", label: "Apoyo regional" },
  { id: "DIRECTOR_REGIONAL", label: "Director Regional" },
  { id: "NIVEL_CENTRAL", label: "Nivel Central" },
] as const;

export type SimulatedRoleId = (typeof SIMULATED_ROLES)[number]["id"];

/** Resuelve el rol simulado activo a partir del id. Devuelve id y label (label con fallback al id). */
export function getSimulatedRole(id: SimulatedRoleId): { id: string; label: string } {
  const r = SIMULATED_ROLES.find((r) => r.id === id);
  return { id, label: r?.label ?? id };
}
