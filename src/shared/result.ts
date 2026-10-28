export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

// Requisitos: RF-013 y RF-016; representar un éxito sin lanzar excepciones.
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

// Requisitos: RF-013 y RF-016; representar errores explícitamente.
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
