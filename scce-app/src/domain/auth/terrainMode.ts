export type TerrainRole = "PESE" | "DELEGADO_JE" | "ADMIN_PILOTO" | "DR";

export function isTerrainRole(role: string | undefined | null): boolean {
  return role === "PESE" || role === "DELEGADO_JE" || role === "ADMIN_PILOTO" || role === "DR";
}
