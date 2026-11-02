import type { Result } from "../shared/result";

export type SpaceType = "cancha" | "sala" | "consultorio";

export interface Space {
  readonly id: string;
  readonly name: string;
  readonly type: SpaceType;
  readonly capacity: number;
  readonly description?: string;
  readonly active: boolean;
}

export interface SpaceInput {
  readonly name: string;
  readonly type: SpaceType;
  readonly capacity: number;
  readonly description?: string;
}

export interface SpaceState {
  readonly schemaVersion: 1;
  readonly spaces: readonly Space[];
}

export type SpaceErrorCode =
  | "INVALID_NAME"
  | "DUPLICATE_NAME"
  | "INVALID_TYPE"
  | "INVALID_CAPACITY"
  | "INVALID_DESCRIPTION"
  | "SPACE_NOT_FOUND"
  | "NOT_AUTHENTICATED"
  | "PERMISSION_DENIED"
  | "AUTH_STATE_UNAVAILABLE"
  | "CORRUPT_STORAGE"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "LOCK_UNAVAILABLE"
  | "LOCK_FAILED"
  | "ID_UNAVAILABLE";

export interface SpaceError {
  readonly code: SpaceErrorCode;
  readonly message: string;
}

// Requisito: RF-001–RF-013; representar el contrato de operaciones de espacios.
export interface SpaceService {
  initialize(): Result<void, SpaceError>;
  createSpace(input: SpaceInput): Promise<Result<Space, SpaceError>>;
  updateSpace(
    id: string,
    input: SpaceInput,
  ): Promise<Result<Space, SpaceError>>;
  deactivateSpace(id: string): Promise<Result<Space, SpaceError>>;
  listActiveSpaces(): Result<readonly Space[], SpaceError>;
  listManagedSpaces(): Result<readonly Space[], SpaceError>;
  getActiveSpace(id: string): Result<Space, SpaceError>;
  existeYEstaActivo(id: string): Result<boolean, SpaceError>;
}

// Requisito: RF-004 y RF-010; construir un estado inicial sin espacios.
export function emptySpaceState(): SpaceState {
  return { schemaVersion: 1, spaces: [] };
}
