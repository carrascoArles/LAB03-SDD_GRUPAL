import type { Result } from "../shared/result";

/** Fecha local con formato `AAAA-MM-DD`. */
export type LocalDate = string;
/** Fecha y hora local con formato `AAAA-MM-DDTHH:mm`, sin zona horaria. */
export type LocalDateTime = string;
/** Devuelve la hora local actual; se inyecta para poder probar. */
export type Clock = () => LocalDateTime;

export type BookingStatus = "activa" | "cancelada";

export interface Booking {
  readonly id: string;
  readonly userId: string;
  readonly spaceId: string;
  readonly start: LocalDateTime;
  readonly end: LocalDateTime;
  readonly status: BookingStatus;
  readonly createdAt: LocalDateTime;
  readonly cancelledAt?: LocalDateTime;
}

export interface ReservaInput {
  readonly spaceId: string;
  readonly date: LocalDate;
  readonly startTime: string;
  readonly durationHours: number;
}

/** Intervalo semiabierto [start, end) de un espacio. */
export interface Franja {
  readonly spaceId: string;
  readonly start: LocalDateTime;
  readonly end: LocalDateTime;
}

export interface BookingState {
  readonly schemaVersion: 1;
  readonly bookings: readonly Booking[];
}

export type BookingErrorCode =
  | "NOT_AUTHENTICATED"
  | "AUTH_STATE_UNAVAILABLE"
  | "INVALID_SPACE"
  | "SPACE_NOT_AVAILABLE"
  | "SPACES_UNAVAILABLE"
  | "INVALID_DATE"
  | "INVALID_START_TIME"
  | "INVALID_DURATION"
  | "OUTSIDE_OPENING_HOURS"
  | "PAST_DATETIME"
  | "OVERLAP"
  | "BOOKING_NOT_FOUND"
  | "CANCELLATION_TOO_LATE"
  | "CLOCK_UNAVAILABLE"
  | "CORRUPT_STORAGE"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "LOCK_UNAVAILABLE"
  | "LOCK_FAILED"
  | "ID_UNAVAILABLE";

export interface BookingError {
  readonly code: BookingErrorCode;
  readonly message: string;
}

// Requisitos: RF-001–RF-016; contrato público del servicio de reservas.
export interface BookingService {
  initialize(): Result<void, BookingError>;
  reservar(input: ReservaInput): Promise<Result<Booking, BookingError>>;
  cancelar(bookingId: string): Promise<Result<Booking, BookingError>>;
  listarMisReservas(): Result<readonly Booking[], BookingError>;
  horasLibres(
    spaceId: string,
    date: LocalDate,
  ): Result<readonly string[], BookingError>;
}

export const HORA_APERTURA = 8;
export const HORA_CIERRE = 22;
export const DURACION_MINIMA = 1;
export const DURACION_MAXIMA = 3;
export const MARGEN_CANCELACION_MINUTOS = 60;

/** Catálogo de mensajes en español (RF-013): regla incumplida y cómo corregirla. */
export const mensajes: Readonly<Record<BookingErrorCode, string>> = {
  NOT_AUTHENTICATED: "Debes iniciar sesión para gestionar tus reservas.",
  AUTH_STATE_UNAVAILABLE: "No se pudo comprobar la sesión actual.",
  INVALID_SPACE: "Elige un espacio para reservar.",
  SPACE_NOT_AVAILABLE:
    "El espacio no existe o no está disponible para reservas. Elige un espacio activo.",
  SPACES_UNAVAILABLE:
    "No se pudo comprobar el catálogo de espacios. Inténtalo de nuevo.",
  INVALID_DATE:
    "La fecha no es válida. Usa una fecha que exista con el formato AAAA-MM-DD.",
  INVALID_START_TIME:
    "La hora de inicio debe ser una hora en punto, por ejemplo 10:00.",
  INVALID_DURATION: "La duración debe ser de 1, 2 o 3 horas.",
  OUTSIDE_OPENING_HOURS:
    "El local atiende de 08:00 a 22:00: la reserva debe empezar a las 08:00 o después y terminar a las 22:00 o antes.",
  PAST_DATETIME:
    "No se puede reservar en el pasado. Elige una fecha y hora posteriores a la actual.",
  OVERLAP:
    "Ese horario ya está reservado para este espacio. Consulta las horas libres y elige otra hora.",
  BOOKING_NOT_FOUND: "La reserva no existe o no te pertenece.",
  CANCELLATION_TOO_LATE:
    "Solo puedes cancelar hasta 1 hora antes del inicio de la reserva.",
  CLOCK_UNAVAILABLE: "No se pudo leer la hora actual del dispositivo.",
  CORRUPT_STORAGE:
    "Los datos de reservas estaban dañados: se guardó una copia de respaldo y se empezó sin reservas.",
  STORAGE_UNAVAILABLE: "El almacenamiento local no está disponible.",
  STORAGE_READ_FAILED: "No se pudieron leer las reservas guardadas.",
  STORAGE_WRITE_FAILED:
    "No se pudo guardar la reserva. Comprueba el espacio disponible.",
  LOCK_UNAVAILABLE:
    "Este navegador no permite completar la operación de forma segura.",
  LOCK_FAILED:
    "No se pudo coordinar la operación de reservas de forma segura. Inténtalo de nuevo.",
  ID_UNAVAILABLE: "No se pudo generar un identificador seguro para la reserva.",
};

// Requisito: RF-013; construir un error tipado con el mensaje del catálogo.
export function bookingError(
  code: BookingErrorCode,
  message: string = mensajes[code],
): BookingError {
  return { code, message };
}

// Requisito: RF-014; documento inicial sin reservas.
export function emptyBookingState(): BookingState {
  return { schemaVersion: 1, bookings: [] };
}
