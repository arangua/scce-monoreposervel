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
