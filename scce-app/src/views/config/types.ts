import type { LocalCatalogEntry } from "../../domain/types";

export interface ElectionConfigShape {
  name: string;
  date: string;
  year: number;
}

export interface ConfigGate {
  electionConfig: ElectionConfigShape;
  applyConfig: (draft: ElectionConfigShape, confirmYear: boolean) => void;
  localCatalog: LocalCatalogEntry[];
  chainResult: { ok: boolean; failIndex: number };
  divergencias: { caseId: string }[];
  APP_VERSION: string;
  MIN_ELECTION_YEAR: number;
  doReset: () => void;
  S: Record<string, unknown>;
  themeColor: (key: string) => string;
}
