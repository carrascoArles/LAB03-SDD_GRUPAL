import type { Booking, BookingErrorCode, Clock } from "../bookings";
import type { AuthService } from "../auth";
import type { LockErrorCode, LockPort } from "../shared/lock-port";
import type { Result } from "../shared/result";
import type { StoragePort } from "../shared/storage-port";

export type AdminErrorCode =
  | "PERMISSION_DENIED"
  | "AUTH_STATE_UNAVAILABLE"
  | "INVALID_BOOKING_ID"
  | "BOOKING_NOT_FOUND"
  | BookingErrorCode
  | LockErrorCode;

export interface AdminError {
  readonly code: AdminErrorCode;
  readonly message: string;
}

export interface AdminService {
  /** RF-001–RF-003: lista todas las reservas ordenadas por inicio. */
  listarReservas(): Result<readonly Booking[], AdminError>;
  /** RF-004–RF-006: cancela con el margen compartido e idempotencia. */
  cancelarReserva(
    bookingId: string,
  ): Promise<Result<Booking, AdminError>>;
}

export interface AdminDependencies {
  readonly storage: StoragePort;
  readonly lock: LockPort;
  readonly auth: AuthService;
  readonly clock: Clock;
}

export const mensajesAdmin = {
  PERMISSION_DENIED: "No tienes permiso para administrar las reservas.",
  AUTH_STATE_UNAVAILABLE: "No se pudo comprobar el permiso administrativo.",
  INVALID_BOOKING_ID: "El identificador de la reserva no es válido.",
  BOOKING_NOT_FOUND: "La reserva no existe.",
} as const;

// Requisito: RF-007; crear un error administrativo tipado y visible en español.
export function adminError(code: keyof typeof mensajesAdmin): AdminError {
  const message = mensajesAdmin[code];
  return { code, message };
}
