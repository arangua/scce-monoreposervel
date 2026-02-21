// src/domain/localDivergence.ts
import type { LocalCatalog } from "./types";
import { fmtDate } from "./date";

export function checkLocalDivergence(
  caseObj: { localSnapshot?: { idLocal: string; nombre: string } | null },
  catalog: LocalCatalog
): { type: string; msg: string } | null {
  if (!caseObj.localSnapshot) return null;

  const cur = catalog.find((l) => l.idLocal === caseObj.localSnapshot!.idLocal);

  if (!cur) return { type: "deleted", msg: "Local eliminado del catálogo tras creación" };
  if (!cur.activoGlobal)
    return { type: "deactivated", msg: `Local desactivado (SD) el ${fmtDate(cur.fechaDesactivacion)}` };
  if (!cur.activoEnEleccionActual) return { type: "election_off", msg: "Local desactivado para la elección actual" };
  if (cur.nombre !== caseObj.localSnapshot.nombre)
    return { type: "renamed", msg: `Local renombrado a "${cur.nombre}"` };

  return null;
}
