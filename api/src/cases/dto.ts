import {
  IsArray,
  IsInt,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

// FASE 1: valores válidos para dataConfidence
export const DATA_CONFIDENCE_VALUES = [
  "VERIFIED",
  "HIGH",
  "MEDIUM",
  "LOW",
  "UNKNOWN",
] as const;
export type DataConfidenceValue = (typeof DATA_CONFIDENCE_VALUES)[number];

// FASE 1: estructura de orientation
export type OrientationPayload = {
  operationalMeaning: string;
  legalRisk: string;
  reputationalRisk: string;
  orientedBy: string;
  orientedAt: string;
};

export class CreateCaseDto {
  @IsString()
  @MinLength(1, { message: "summary no puede estar vacío" })
  summary!: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  criticality?: string;

  @IsString()
  @MinLength(1, { message: "regionCode es requerido" })
  regionCode!: string;

  @IsString()
  @MinLength(1, { message: "communeCode es requerido" })
  communeCode!: string;

  @IsString()
  @MinLength(1, { message: "localCode es requerido" })
  localCode!: string;

  @IsOptional()
  @IsObject()
  localSnapshot?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  assignedTo?: string | null;

  @IsOptional()
  @IsObject()
  evaluation?: Record<string, number>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  completeness?: number;

  @IsOptional()
  @IsArray()
  actions?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  decisions?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  instructions?: Array<Record<string, unknown>>;

  // FASE 1: nivel de confianza del dato
  @IsOptional()
  @IsIn(DATA_CONFIDENCE_VALUES)
  dataConfidence?: DataConfidenceValue;

  // FASE 1: orientación (3 dimensiones)
  @IsOptional()
  @IsObject()
  orientation?: OrientationPayload;
}

// --- FASE 4: DTO para actualizar campos mutables de un caso ---
export class UpdateCaseDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  criticality?: string;

  @IsOptional()
  @IsArray()
  actions?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  decisions?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  instructions?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsArray()
  timeline?: Array<Record<string, unknown>>;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  assignedTo?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  closingMotivo?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  completeness?: number;

  @IsOptional()
  @IsIn(DATA_CONFIDENCE_VALUES)
  dataConfidence?: DataConfidenceValue;

  @IsOptional()
  @IsObject()
  orientation?: OrientationPayload;

  @IsOptional()
  @IsObject()
  evaluation?: Record<string, number>;
}

// --- NUEVO: DTO para agregar eventos a un caso (append-only) ---

export const ALLOWED_EVENT_TYPES = [
  "COMMENT_ADDED",
  "INSTRUCTION_CREATED",
  "CASE_CLOSED",
] as const;

export type AllowedEventType = (typeof ALLOWED_EVENT_TYPES)[number];

export class CreateCaseEventDto {
  @IsIn(ALLOWED_EVENT_TYPES)
  eventType!: AllowedEventType;

  @IsObject()
  @IsOptional()
  payloadJson?: Record<string, any>;

  @ValidateIf((o) => o.eventType === "CASE_CLOSED")
  @IsString()
  reason!: string;

  @ValidateIf((o) => o.eventType === "CASE_CLOSED" && o.note !== undefined)
  @IsString()
  note?: string;
}
