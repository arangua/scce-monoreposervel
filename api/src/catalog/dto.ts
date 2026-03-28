/**
 * catalog/dto.ts
 * Data Transfer Objects para el módulo de catálogo de locales.
 */

export class ImportLocalDto {
  regionCode!:  string;
  communeCode!: string;
  nombre!:      string;
  direccion?:   string;
  mesas?:       number;
}

export class ImportBulkDto {
  modo!:   "eleccion" | "simulacion";
  items!:  ImportLocalDto[];
}
