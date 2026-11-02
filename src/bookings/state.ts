import { err, ok, type Result } from "../shared/result";
import {
  bookingError,
  DURACION_MAXIMA,
  DURACION_MINIMA,
  emptyBookingState,
  HORA_APERTURA,
  HORA_CIERRE,
} from "./model";
import type { Booking, BookingError, BookingState } from "./model";
import { hayChoque } from "./rules";
import { esFechaHoraValida, fechaDe, horaDe } from "./time";

const stateKeys = new Set(["schemaVersion", "bookings"]);
const bookingKeys = new Set([
  "id",
  "userId",
  "spaceId",
  "start",
  "end",
  "status",
  "createdAt",
  "cancelledAt",
]);

// Requisito: RF-014; comprobar objetos externos antes de leer sus campos.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Requisito: RF-014; rechazar campos desconocidos en datos guardados.
function hasOnlyKeys(
  value: Record<string, unknown>,
  keys: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => keys.has(key));
}

// Requisito: RF-014; texto no vacío para ids.
function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

// Requisitos: RF-004, RF-005 y RF-014; validar una reserva guardada.
function toBooking(value: unknown): Booking | null {
  if (!isRecord(value) || !hasOnlyKeys(value, bookingKeys)) return null;
  const { id, userId, spaceId, start, end, status, createdAt, cancelledAt } =
    value;
  if (!isId(id) || !isId(userId) || !isId(spaceId)) return null;
  if (!esFechaHoraValida(start) || !esFechaHoraValida(end)) return null;
  if (!esFechaHoraValida(createdAt)) return null;
  if (fechaDe(start) !== fechaDe(end)) return null;
  if (!start.endsWith(":00") || !end.endsWith(":00")) return null;
  const duracion = horaDe(end) - horaDe(start);
  if (
    horaDe(start) < HORA_APERTURA ||
    horaDe(end) > HORA_CIERRE ||
    duracion < DURACION_MINIMA ||
    duracion > DURACION_MAXIMA
  ) {
    return null;
  }
  if (status === "activa" && cancelledAt === undefined) {
    return { id, userId, spaceId, start, end, status, createdAt };
  }
  if (status === "cancelada" && esFechaHoraValida(cancelledAt)) {
    return { id, userId, spaceId, start, end, status, createdAt, cancelledAt };
  }
  return null;
}

// Requisito: RF-014; error de documento dañado.
function corrupt(message: string): Result<never, BookingError> {
  return err(bookingError("CORRUPT_STORAGE", message));
}

// Requisitos: RF-007 y RF-014; decodificar el documento sin confiar en su forma.
export function decodeBookingState(
  input: unknown,
): Result<BookingState, BookingError> {
  let value: unknown = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      return corrupt("Los datos guardados de reservas están dañados.");
    }
  }
  if (value === null) return ok(emptyBookingState());
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, stateKeys) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.bookings)
  ) {
    return corrupt("Los datos guardados de reservas no tienen un formato válido.");
  }

  const bookings: Booking[] = [];
  const ids = new Set<string>();
  for (const candidate of value.bookings) {
    const booking = toBooking(candidate);
    if (!booking) {
      return corrupt("Una de las reservas guardadas no es válida.");
    }
    if (ids.has(booking.id)) {
      return corrupt("Las reservas guardadas tienen identificadores repetidos.");
    }
    if (booking.status === "activa" && hayChoque(bookings, booking)) {
      return corrupt("Las reservas guardadas contienen horarios solapados.");
    }
    ids.add(booking.id);
    bookings.push(booking);
  }
  return ok({ schemaVersion: 1, bookings });
}

// Requisito: RF-015; guardar solo los campos del modelo (ids, no copias de datos).
export function serializeBookingState(state: BookingState): string {
  return JSON.stringify({
    schemaVersion: 1,
    bookings: state.bookings.map((booking) => ({
      id: booking.id,
      userId: booking.userId,
      spaceId: booking.spaceId,
      start: booking.start,
      end: booking.end,
      status: booking.status,
      createdAt: booking.createdAt,
      ...(booking.cancelledAt === undefined
        ? {}
        : { cancelledAt: booking.cancelledAt }),
    })),
  });
}
