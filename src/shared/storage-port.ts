import type { Result } from "./result";

export type StorageErrorCode =
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED";

export interface StorageError {
  readonly code: StorageErrorCode;
  readonly message: string;
}

export interface StoragePort {
  get(key: string): Result<string | null, StorageError>;
  set(key: string, value: string): Result<void, StorageError>;
  remove(key: string): Result<void, StorageError>;
}
