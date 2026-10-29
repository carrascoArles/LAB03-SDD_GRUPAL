import { err, ok, type Result } from "../shared/result";
import type { StorageError, StoragePort } from "../shared/storage-port";
import { bookingError, emptyBookingState } from "./model";
import type { BookingError, BookingState } from "./model";
import { decodeBookingState, serializeBookingState } from "./state";

export const BOOKINGS_STORAGE_KEY = "reservalocal.bookings.v1";
export const BOOKINGS_BACKUP_KEY = "reservalocal.bookings.v1.respaldo";

// Requisito: RF-016; conservar el código y mensaje del adaptador de almacenamiento.
function storageError(error: StorageError): BookingError {
  return bookingError(error.code, error.message);
}

// Requisito: RF-014; leer y validar el documento de reservas.
export function leerReservas(
  storage: StoragePort,
): Result<BookingState, BookingError> {
  const stored = storage.get(BOOKINGS_STORAGE_KEY);
  if (!stored.ok) return err(storageError(stored.error));
  if (stored.value === null) return ok(emptyBookingState());
  return decodeBookingState(stored.value);
}

// Requisito: RF-016; guardar el documento y no informar éxito si falla.
export function guardarReservas(
  storage: StoragePort,
  state: BookingState,
): Result<void, BookingError> {
  const saved = storage.set(BOOKINGS_STORAGE_KEY, serializeBookingState(state));
  return saved.ok ? ok(undefined) : err(storageError(saved.error));
}

// Requisito: RF-014; copiar el valor dañado al respaldo y reiniciar sin reservas.
// Si la copia falla, no se toca el documento original.
export function respaldarYReiniciar(
  storage: StoragePort,
): Result<void, BookingError> {
  const stored = storage.get(BOOKINGS_STORAGE_KEY);
  if (!stored.ok) return err(storageError(stored.error));
  if (stored.value !== null) {
    const backup = storage.set(BOOKINGS_BACKUP_KEY, stored.value);
    if (!backup.ok) return err(storageError(backup.error));
  }
  return guardarReservas(storage, emptyBookingState());
}
