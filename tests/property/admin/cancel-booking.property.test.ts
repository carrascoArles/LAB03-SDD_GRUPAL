import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { puedeCancelar } from "../../../src/bookings/rules";
import { createAdminTestContext } from "../../helpers/admin";
import {
  reserva,
  seedBookings,
  storedBookings,
} from "../../helpers/bookings";

function localDateTimeFromMinutes(minutes: number): string {
  return new Date(Date.UTC(2026, 10, 2, 10, 0) - minutes * 60_000)
    .toISOString()
    .slice(0, 16);
}

describe("propiedades de cancelación administrativa", () => {
  it("permite cancelar exactamente cuando quedan al menos 60 minutos (RF-003, RF-004)", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 180 }), async (leadMinutes) => {
        const ctx = createAdminTestContext({
          clock: () => localDateTimeFromMinutes(leadMinutes),
        });
        const booking = reserva({ id: "r1", userId: "otro-usuario" });
        seedBookings(ctx.storage, [booking]);
        const result = await ctx.admin.cancelarReserva("r1");
        const expected = puedeCancelar(booking, localDateTimeFromMinutes(leadMinutes));
        expect(result.ok).toBe(expected);
        expect(ctx.storage.writes).toBe(expected ? 1 : 0);
      }),
      { numRuns: 100 },
    );
  });

  it("es idempotente para toda hora del reloj cuando la reserva ya está cancelada (RF-005)", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 1439 }), async (minute) => {
        const ctx = createAdminTestContext({
          clock: () => {
            throw new Error(`Reloj inesperado en minuto ${minute}`);
          },
        });
        const booking = reserva({
          id: "r1",
          status: "cancelada",
          cancelledAt: "2026-11-02T08:45",
        });
        seedBookings(ctx.storage, [booking]);
        const before = storedBookings(ctx.storage);
        const result = await ctx.admin.cancelarReserva("r1");
        expect(result).toEqual({ ok: true, value: booking });
        expect(storedBookings(ctx.storage)).toBe(before);
        expect(ctx.storage.writes).toBe(0);
      }),
      { numRuns: 100 },
    );
  });
});
