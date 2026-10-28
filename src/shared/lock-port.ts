import type { Result } from "./result";

export type LockErrorCode = "LOCK_UNAVAILABLE" | "LOCK_FAILED";

export interface LockError {
  readonly code: LockErrorCode;
  readonly message: string;
}

export interface LockPort {
  runExclusive<T>(
    name: string,
    operation: () => Promise<T>,
  ): Promise<Result<T, LockError>>;
}
