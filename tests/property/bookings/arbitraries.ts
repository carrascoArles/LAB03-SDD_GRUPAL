import fc from "fast-check";
import type { Booking } from "../../../src/bookings/model";
import { hayChoque } from "../../../src/bookings/rules";

export const usuarios = ["ana", "beto", "carla"] as const;
export const espacios = ["sala-1", "cancha-1"] as const;
export const fechas = ["2026-11-02", "2026-11-03"] as const;

// Requisito: RF-005; hora con dos dígitos.
export function hh(hora: number): string {
  return String(hora).padStart(2, "0");
}

/** Reserva con forma válida (horario, duración y estado), sin garantizar no solapamiento. */
export const bookingShapeArb = fc
  .record({
    userId: fc.constantFrom(...usuarios),
    spaceId: fc.constantFrom(...espacios),
    date: fc.constantFrom(...fechas),
    hour: fc.integer({ min: 8, max: 21 }),
    duration: fc.integer({ min: 1, max: 3 }),
    cancelled: fc.boolean(),
  })
  .map((r) => {
    const end = Math.min(r.hour + r.duration, 22);
    return {
      userId: r.userId,
      spaceId: r.spaceId,
      start: `${r.date}T${hh(r.hour)}:00`,
      end: `${r.date}T${hh(end)}:00`,
      status: r.cancelled ? ("cancelada" as const) : ("activa" as const),
      createdAt: "2026-11-01T08:00",
      ...(r.cancelled ? { cancelledAt: "2026-11-01T08:30" } : {}),
    };
  });

/** Documento válido: ids únicos y sin reservas activas solapadas en el mismo espacio. */
export const validBookingsArb = fc
  .array(bookingShapeArb, { maxLength: 25 })
  .map((shapes) => {
    const kept: Booking[] = [];
    shapes.forEach((shape, index) => {
      const booking: Booking = { id: `r${index}`, ...shape };
      if (booking.status === "cancelada" || !hayChoque(kept, booking)) {
        kept.push(booking);
      }
    });
    return kept;
  });

// Requisito: RF-007; comprobación independiente de solapamiento por horas enteras.
export function solapanIndependiente(a: Booking, b: Booking): boolean {
  if (a.spaceId !== b.spaceId || a.start.slice(0, 10) !== b.start.slice(0, 10)) return false;
  const ai = Number(a.start.slice(11, 13));
  const af = Number(a.end.slice(11, 13));
  const bi = Number(b.start.slice(11, 13));
  const bf = Number(b.end.slice(11, 13));
  return ai < bf && bi < af;
}
