export type TerrainRole = "PESE" | "DELEGADO_JE";

export function isTerrainRole(role: string | undefined | null): boolean {
  return role === "PESE" || role === "DELEGADO_JE";
}
