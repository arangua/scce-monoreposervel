import { isTerrainRole } from "./terrainMode";

export function isTerrainMode(currentUser: { role?: string } | null | undefined): boolean {
  return isTerrainRole(currentUser?.role ?? null);
}

export function shouldHideNonOperationalPanels(currentUser: { role?: string } | null | undefined): boolean {
  return isTerrainMode(currentUser);
}
