import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { ordenarPorInicio } from "../../../src/bookings/rules";
import { createAdminTestContext } from "../../helpers/admin";
import { reserva, seedBookings } from "../../helpers/bookings";

const bookingsArbitrary = fc.array(fc.integer({ min: 8, max: 19 }), {
  maxLength: 20,
}).map((hours) =>
  hours.map((hour, index) => {
    const start = `2026-11-02T${String(hour).padStart(2, "0")}:00`;
    const end = `2026-11-02T${String(hour + 1).padStart(2, "0")}:00`;
    return reserva({
      id: `booking-${index}`,
      userId: `user-${index}`,
      spaceId: `space-${index}`,
      start,
      end,
      ...(index % 2 === 0
        ? { status: "cancelada" as const, cancelledAt: "2026-11-01T09:00" }
        : {}),
    });
  }),
);

describe("propiedades del listado administrativo", () => {
  it("conserva todos los ids y aplica el orden por inicio e id (RF-001, RF-008)", () => {
    fc.assert(
      fc.property(bookingsArbitrary, (bookings) => {
        const ctx = createAdminTestContext();
        seedBookings(ctx.storage, bookings);
        const result = ctx.admin.listarReservas();
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value).toEqual(ordenarPorInicio(bookings));
        expect(result.value.map((booking) => booking.id).sort()).toEqual(
          bookings.map((booking) => booking.id).sort(),
        );
      }),
      { numRuns: 100 },
    );
  });
});
