import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { decodeBookingState } from "../../../src/bookings/state";
import { createBookingTestContext, storedBookings, usuario } from "../../helpers/bookings";
import { espacios, fechas, hh, solapanIndependiente, usuarios } from "./arbitraries";

const operacionArb = fc.oneof(
  fc.record({
    kind: fc.constant("reservar" as const),
    user: fc.constantFrom(...usuarios),
    space: fc.constantFrom(...espacios),
    date: fc.constantFrom(...fechas),
    hour: fc.integer({ min: 6, max: 22 }),
    duration: fc.integer({ min: 0, max: 4 }),
  }),
  fc.record({
    kind: fc.constant("cancelar" as const),
    user: fc.constantFrom(...usuarios),
    pick: fc.nat(),
  }),
);

describe("propiedad constitucional: nunca hay reservas activas solapadas (RF-007, RF-010)", () => {
  it("tras cualquier secuencia de reservas y cancelaciones de varios usuarios", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(operacionArb, { maxLength: 40 }), async (operaciones) => {
        const ctx = createBookingTestContext();
        const ids: string[] = [];
        for (const op of operaciones) {
          ctx.auth.current = usuario(op.user);
          if (op.kind === "reservar") {
            const result = await ctx.service.reservar({
              spaceId: op.space,
              date: op.date,
              startTime: `${hh(op.hour)}:00`,
              durationHours: op.duration,
            });
            if (result.ok) ids.push(result.value.id);
          } else if (ids.length > 0) {
            await ctx.service.cancelar(ids[op.pick % ids.length] ?? "");
          }
        }

        const decoded = decodeBookingState(storedBookings(ctx.storage) ?? null);
        expect(decoded.ok).toBe(true);
        if (!decoded.ok) return;
        const activas = decoded.value.bookings.filter((b) => b.status === "activa");
        for (let i = 0; i < activas.length; i += 1) {
          for (let j = i + 1; j < activas.length; j += 1) {
            const a = activas[i];
            const b = activas[j];
            if (a && b) expect(solapanIndependiente(a, b)).toBe(false);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
