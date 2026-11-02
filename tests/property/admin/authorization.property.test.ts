import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { createAdminTestContext } from "../../helpers/admin";
import {
  reserva,
  seedBookings,
  storedBookings,
} from "../../helpers/bookings";

describe("propiedades de autorización administrativa", () => {
  it("un usuario normal no obtiene datos ni modifica el documento (RF-007)", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (bookingId) => {
        const ctx = createAdminTestContext({ role: "usuario" });
        seedBookings(ctx.storage, [reserva({ id: bookingId })]);
        const before = storedBookings(ctx.storage);

        const list = ctx.admin.listarReservas();
        const cancel = await ctx.admin.cancelarReserva(bookingId);

        expect(list).toMatchObject({
          ok: false,
          error: { code: "PERMISSION_DENIED" },
        });
        expect(cancel).toMatchObject({
          ok: false,
          error: { code: "PERMISSION_DENIED" },
        });
        expect(ctx.storage.reads).toBe(0);
        expect(ctx.storage.writes).toBe(0);
        expect(storedBookings(ctx.storage)).toBe(before);
      }),
      { numRuns: 100 },
    );
  });
});
