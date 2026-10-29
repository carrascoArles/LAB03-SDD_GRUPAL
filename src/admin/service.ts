import { err, ok, type Result } from "../shared/result";
import { mensajes } from "../bookings";
import type { Booking, LocalDateTime } from "../bookings";
import {
  guardarReservas,
  leerReservas,
} from "../bookings/repository";
import {
  marcarCancelada,
  ordenarPorInicio,
  puedeCancelar,
  reemplazarReserva,
} from "../bookings/rules";
import { adminError } from "./model";
import type { AdminDependencies, AdminError, AdminService } from "./model";

const BOOKINGS_LOCK_NAME = "reservalocal.spaces.v1";

// Requisito: RF-007; negar el acceso antes de consultar reservas.
function authorize(
  auth: AdminDependencies["auth"],
): Result<void, AdminError> {
  const result = auth.isAdmin();
  if (!result.ok) {
    return err(adminError("AUTH_STATE_UNAVAILABLE"));
  }
  return result.value
    ? ok(undefined)
    : err(adminError("PERMISSION_DENIED"));
}

function isValidBookingId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDateTime(value: unknown): value is LocalDateTime {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/u.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];
  return (
    daysInMonth !== undefined &&
    day >= 1 &&
    day <= daysInMonth &&
    hour <= 23 &&
    minute <= 59
  );
}

function readClock(clock: AdminDependencies["clock"]): Result<LocalDateTime, AdminError> {
  let value: unknown;
  try {
    value = clock();
  } catch {
    return err({ code: "CLOCK_UNAVAILABLE", message: mensajes.CLOCK_UNAVAILABLE });
  }
  return isValidDateTime(value)
    ? ok(value)
    : err({ code: "CLOCK_UNAVAILABLE", message: mensajes.CLOCK_UNAVAILABLE });
}

// Requisitos: RF-001–RF-009; crear el servicio administrativo con dependencias inyectadas.
export function createAdminService(
  dependencies: AdminDependencies,
): AdminService {
  const { storage, lock, auth, clock } = dependencies;

  // Requisito: RF-001; consultar el documento común sin filtrar reservas.
  function listarReservas(): Result<readonly Booking[], AdminError> {
    const permission = authorize(auth);
    if (!permission.ok) return err(permission.error);
    const loaded = leerReservas(storage);
    if (!loaded.ok) return err(loaded.error);
    return ok(ordenarPorInicio(loaded.value.bookings));
  }

  // Requisitos: RF-002–RF-006; cancelar con autorización, bloqueo e idempotencia.
  async function cancelarReserva(
    bookingId: string,
  ): Promise<Result<Booking, AdminError>> {
    const permission = authorize(auth);
    if (!permission.ok) return err(permission.error);
    if (!isValidBookingId(bookingId)) {
      return err(adminError("INVALID_BOOKING_ID"));
    }

    const locked = await lock.runExclusive(BOOKINGS_LOCK_NAME, async () => {
      const loaded = leerReservas(storage);
      if (!loaded.ok) return err(loaded.error);
      const booking = loaded.value.bookings.find(
        (candidate) => candidate.id === bookingId,
      );
      if (!booking) return err(adminError("BOOKING_NOT_FOUND"));
      if (booking.status === "cancelada") return ok(booking);

      const now = readClock(clock);
      if (!now.ok) return err(now.error);
      if (!puedeCancelar(booking, now.value)) {
        const error: AdminError = {
          code: "CANCELLATION_TOO_LATE",
          message: mensajes.CANCELLATION_TOO_LATE,
        };
        return err(error);
      }

      const cancelled = marcarCancelada(booking, now.value);
      const saved = guardarReservas(
        storage,
        reemplazarReserva(loaded.value, cancelled),
      );
      return saved.ok ? ok(cancelled) : err(saved.error);
    });

    if (!locked.ok) return err(locked.error);
    return locked.value;
  }

  return { listarReservas, cancelarReserva };
}
