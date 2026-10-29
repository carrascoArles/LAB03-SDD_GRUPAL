import { err, ok, type Result } from "../shared/result";
import {
  bookingError,
  DURACION_MAXIMA,
  DURACION_MINIMA,
  HORA_APERTURA,
  HORA_CIERRE,
} from "./model";
import type { BookingError, Franja, LocalDateTime } from "./model";
import { esPasado } from "./rules";
import { componerFechaHora, esFechaValida } from "./time";

const horaPattern = /^(\d{2}):(\d{2})$/u;

// Requisito: RF-016; comprobar el contenedor del formulario antes de leerlo.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Requisito: RF-005; leer una hora en punto HH:00 y devolver la hora entera.
function horaEnPunto(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = horaPattern.exec(value);
  if (!match || match[2] !== "00") return null;
  const hora = Number(match[1]);
  return hora >= 0 && hora <= 23 ? hora : null;
}

// Requisito: RF-016; aceptar solo ids de espacio no vacíos.
export function esIdValido(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

// Requisitos: RF-002, RF-004, RF-005 y RF-013; validar la solicitud completa y
// convertirla en una franja. El orden fija qué mensaje ve la persona.
export function validarSolicitud(input: unknown): Result<Franja, BookingError> {
  if (!isRecord(input) || !esIdValido(input.spaceId)) {
    return err(bookingError("INVALID_SPACE"));
  }
  if (!esFechaValida(input.date)) return err(bookingError("INVALID_DATE"));
  const hora = horaEnPunto(input.startTime);
  if (hora === null) return err(bookingError("INVALID_START_TIME"));
  const duracion = input.durationHours;
  if (
    typeof duracion !== "number" ||
    !Number.isInteger(duracion) ||
    duracion < DURACION_MINIMA ||
    duracion > DURACION_MAXIMA
  ) {
    return err(bookingError("INVALID_DURATION"));
  }
  if (hora < HORA_APERTURA || hora + duracion > HORA_CIERRE) {
    return err(bookingError("OUTSIDE_OPENING_HOURS"));
  }
  return ok({
    spaceId: input.spaceId,
    start: componerFechaHora(input.date, hora),
    end: componerFechaHora(input.date, hora + duracion),
  });
}

// Requisito: RF-006; rechazar inicios anteriores al momento actual.
export function validarNoPasado(
  franja: Franja,
  ahora: LocalDateTime,
): Result<void, BookingError> {
  return esPasado(franja.start, ahora)
    ? err(bookingError("PAST_DATETIME"))
    : ok(undefined);
}
