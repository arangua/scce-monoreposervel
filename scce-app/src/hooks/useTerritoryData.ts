/**
 * Hook intermedio para datos territoriales (regiones, provincias, comunas).
 * Encapsula la carga vía territoryApi; no modifica aún NewCaseForm.
 */

import { useState, useEffect } from "react";
import {
  getRegions,
  getProvinces,
  getCommunes,
  type TerritoryRegion,
  type TerritoryProvince,
  type TerritoryCommune,
} from "../lib/territoryApi";

export type UseTerritoryDataParams = {
  regionCode?: string | null;
  provinceCode?: string | null;
};

export type UseTerritoryDataResult = {
  regions: TerritoryRegion[];
  provinces: TerritoryProvince[];
  communes: TerritoryCommune[];
  loadingRegions: boolean;
  loadingProvinces: boolean;
  loadingCommunes: boolean;
  error: string | null;
};

export function useTerritoryData(params: UseTerritoryDataParams = {}): UseTerritoryDataResult {
  const { regionCode = null, provinceCode = null } = params;

  const [regions, setRegions] = useState<TerritoryRegion[]>([]);
  const [provinces, setProvinces] = useState<TerritoryProvince[]>([]);
  const [communes, setCommunes] = useState<TerritoryCommune[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCommunes, setLoadingCommunes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Regiones: una sola carga al montar
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoadingRegions(true);
    getRegions()
      .then((data) => {
        if (!cancelled) {
          setRegions(data);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar regiones");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRegions(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Provincias: cuando hay regionCode
  useEffect(() => {
    if (!regionCode || regionCode.trim() === "") {
      setProvinces([]);
      setLoadingProvinces(false);
      return;
    }
    let cancelled = false;
    setLoadingProvinces(true);
    setProvinces([]);
    getProvinces(regionCode)
      .then((data) => {
        if (!cancelled) setProvinces(data);
      })
      .catch(() => {
        if (!cancelled) setProvinces([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false);
      });
    return () => {
      cancelled = true;
    };
  }, [regionCode]);

  // Comunas: cuando hay provinceCode
  useEffect(() => {
    if (!provinceCode || provinceCode.trim() === "") {
      setCommunes([]);
      setLoadingCommunes(false);
      return;
    }
    let cancelled = false;
    setLoadingCommunes(true);
    setCommunes([]);
    getCommunes(provinceCode)
      .then((data) => {
        if (!cancelled) setCommunes(data);
      })
      .catch(() => {
        if (!cancelled) setCommunes([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCommunes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [provinceCode]);

  return {
    regions,
    provinces,
    communes,
    loadingRegions,
    loadingProvinces,
    loadingCommunes,
    error,
  };
}
