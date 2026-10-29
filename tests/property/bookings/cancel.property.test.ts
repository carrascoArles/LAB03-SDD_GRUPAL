import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { puedeCancelar } from "../../../src/bookings/rules";
import { aMinutos, formatearFechaHoraLocal } from "../../../src/bookings/time";
import { createBookingTestContext, reserva, seedBookings, storedBookings } from "../../helpers/bookings";
import { validBookingsArb } from "./arbitraries";

describe("propiedades de cancelación (RF-009, RF-010)", () => {
  it("cancelar dos veces equivale a cancelar una vez", async () => {
    await fc.assert(
      fc.asyncProperty(validBookingsArb, fc.nat(), async (bookings, pick) => {
        const propias = bookings.filter((b) => b.userId === "ana");
        fc.pre(propias.length > 0);
        const elegida = propias[pick % propias.length];
        if (!elegida) return;
        const ctx = createBookingTestContext();
        seedBookings(ctx.storage, bookings);

        const primera = await ctx.service.cancelar(elegida.id);
        const trasUna = storedBookings(ctx.storage);
        const segunda = await ctx.service.cancelar(elegida.id);

        expect(primera.ok).toBe(true);
        expect(segunda).toEqual(primera);
        expect(storedBookings(ctx.storage)).toBe(trasUna);
      }),
      { numRuns: 100 },
    );
  });

  it("se puede cancelar si y solo si faltan 60 minutos o más", () => {
    const booking = reserva({ id: "r1", start: "2026-11-02T10:00", end: "2026-11-02T11:00" });
    const inicio = aMinutos(booking.start);
    fc.assert(
      fc.property(fc.integer({ min: -600, max: 600 }), (antelacion) => {
        const ahora = formatearFechaHoraLocal(new Date(2026, 10, 2, 10, -antelacion));
        expect(inicio - aMinutos(ahora)).toBe(antelacion);
        expect(puedeCancelar(booking, ahora)).toBe(antelacion >= 60);
      }),
      { numRuns: 100 },
    );
  });
});
