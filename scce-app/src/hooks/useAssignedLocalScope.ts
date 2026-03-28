/**
 * hooks/useAssignedLocalScope.ts
 * Computa el local y la comuna efectiva para roles de terreno
 * (PESE, DELEGADO_JE). Retorna null en todos los campos para roles
 * que no tienen local fijo.
 *
 * Elimina duplicacion entre DashboardView, NewCaseView y CaseDetailContent.
 * R-4 refactor - 2026-03-27.
 */
import { useMemo } from "react";
import type { LocalCatalogEntry } from "../domain/types";
import { useAppStore } from "../store/useAppStore";

function isFixedLocalRole(u: { role?: string } | null | undefined): boolean {
  const r = String(u?.role ?? "").toUpperCase();
  return r === "PESE" || r === "DELEGADO_JE";
}

export interface AssignedLocalScope {
  /** true si el usuario tiene un local fijo (PESE / DELEGADO_JE) */
  fixedLocalRole: boolean;
  /** idLocal efectivo, o null si no aplica */
  assignedLocalIdEffective: string | null;
  /** Entrada completa del catalogo, o null si no hay local valido */
  assignedLocal: LocalCatalogEntry | null;
  /** Codigo de comuna efectiva, o "" */
  assignedCommuneEffective: string;
  /** Map idLocal -> entrada (para busquedas O(1)) */
  localCatalogById: Map<string, LocalCatalogEntry>;
}

export function useAssignedLocalScope(): AssignedLocalScope {
  const { currentUser, localCatalog } = useAppStore();

  const localCatalogById = useMemo(
    () => new Map(localCatalog.map((e) => [e.idLocal, e])),
    [localCatalog]
  );

  const fixedLocalRole = isFixedLocalRole(currentUser);

  const assignedLocalIdEffective = useMemo(() => {
    if (!fixedLocalRole) return null;
    const explicit =
      currentUser?.assignedLocalId != null ? String(currentUser.assignedLocalId) : null;
    if (explicit && localCatalogById.has(explicit)) return explicit;
    const fallback =
      localCatalog.find(
        (e) =>
          e.activoGlobal &&
          e.region === currentUser?.region &&
          e.commune === currentUser?.commune
      )?.idLocal ?? null;
    return fallback && localCatalogById.has(fallback) ? fallback : null;
  }, [fixedLocalRole, currentUser, localCatalog, localCatalogById]);

  const assignedLocal = useMemo(
    () =>
      assignedLocalIdEffective
        ? (localCatalogById.get(assignedLocalIdEffective) as LocalCatalogEntry | undefined) ?? null
        : null,
    [assignedLocalIdEffective, localCatalogById]
  );

  const assignedCommuneEffective = assignedLocal?.commune ?? "";

  return {
    fixedLocalRole,
    assignedLocalIdEffective,
    assignedLocal,
    assignedCommuneEffective,
    localCatalogById,
  };
}
