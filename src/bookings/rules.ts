// Lógica pura de reservas: sin almacenamiento, sin DOM y sin leer el reloj.
import {
  HORA_APERTURA,
  HORA_CIERRE,
  MARGEN_CANCELACION_MINUTOS,
} from "./model";
import type {
  Booking,
  BookingState,
  Franja,
  LocalDate,
  LocalDateTime,
} from "./model";
import { aMinutos, fechaDe, formatearHora, horaDe } from "./time";

// Requisito: RF-007; dos franjas del mismo espacio se solapan si sus intervalos
// semiabiertos se cruzan. Terminar a la hora en que empieza la otra no es solapar.
export function seSolapan(a: Franja, b: Franja): boolean {
  return a.spaceId === b.spaceId && a.start < b.end && b.start < a.end;
}

// Requisito: RF-007; una franja choca si se solapa con alguna reserva activa.
export function hayChoque(
  bookings: readonly Booking[],
  franja: Franja,
): boolean {
  return bookings.some(
    (booking) => booking.status === "activa" && seSolapan(booking, franja),
  );
}

// Requisito: RF-012; los 14 bloques de una hora del horario de atención.
export function bloquesDelHorario(): readonly string[] {
  const bloques: string[] = [];
  for (let hora = HORA_APERTURA; hora < HORA_CIERRE; hora += 1) {
    bloques.push(formatearHora(hora));
  }
  return bloques;
}

// Requisito: RF-012; bloques ocupados por reservas activas de un espacio y fecha.
export function horasReservadas(
  bookings: readonly Booking[],
  spaceId: string,
  date: LocalDate,
): readonly string[] {
  const ocupadas = new Set<string>();
  for (const booking of bookings) {
    if (
      booking.status !== "activa" ||
      booking.spaceId !== spaceId ||
      fechaDe(booking.start) !== date
    ) {
      continue;
    }
    for (let hora = horaDe(booking.start); hora < horaDe(booking.end); hora += 1) {
      ocupadas.add(formatearHora(hora));
    }
  }
  return bloquesDelHorario().filter((bloque) => ocupadas.has(bloque));
}

// Requisitos: RF-010 y RF-012; horas libres = horario − horas reservadas.
export function calcularHorasLibres(
  bookings: readonly Booking[],
  spaceId: string,
  date: LocalDate,
): readonly string[] {
  const reservadas = new Set(horasReservadas(bookings, spaceId, date));
  return bloquesDelHorario().filter((bloque) => !reservadas.has(bloque));
}

// Requisito: RF-006; un inicio anterior al momento actual está en el pasado.
export function esPasado(start: LocalDateTime, ahora: LocalDateTime): boolean {
  return aMinutos(start) < aMinutos(ahora);
}

// Requisito: RF-009; se puede cancelar con 60 minutos o más de antelación.
export function puedeCancelar(booking: Booking, ahora: LocalDateTime): boolean {
  return aMinutos(booking.start) - aMinutos(ahora) >= MARGEN_CANCELACION_MINUTOS;
}

// Requisitos: RF-009 y RF-010; marcar una reserva como cancelada.
export function marcarCancelada(
  booking: Booking,
  ahora: LocalDateTime,
): Booking {
  return { ...booking, status: "cancelada", cancelledAt: ahora };
}

// Requisito: RF-008; ordenar por inicio y, a igual inicio, por id.
export function ordenarPorInicio(
  bookings: readonly Booking[],
): readonly Booking[] {
  return [...bookings].sort((a, b) => {
    if (a.start !== b.start) return a.start < b.start ? -1 : 1;
    if (a.id === b.id) return 0;
    return a.id < b.id ? -1 : 1;
  });
}

// Requisito: RF-002; añadir una reserva al documento sin mutarlo.
export function agregarReserva(
  state: BookingState,
  booking: Booking,
): BookingState {
  return { schemaVersion: 1, bookings: [...state.bookings, booking] };
}

// Requisito: RF-009; reemplazar una reserva por id sin mutar el documento.
export function reemplazarReserva(
  state: BookingState,
  booking: Booking,
): BookingState {
  return {
    schemaVersion: 1,
    bookings: state.bookings.map((candidate) =>
      candidate.id === booking.id ? booking : candidate,
    ),
  };
}
