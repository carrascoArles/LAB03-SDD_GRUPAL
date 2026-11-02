import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ordenarPorInicio } from "../../../src/bookings/rules";
import { createBookingTestContext, seedBookings, storedBookings, usuario } from "../../helpers/bookings";
import { usuarios, validBookingsArb } from "./arbitraries";

const camposPermitidos = ["id", "userId", "spaceId", "start", "end", "status", "createdAt", "cancelledAt"];

describe("propiedad: cada persona solo ve y cancela lo suyo (RF-001, RF-008, RF-011, RF-015)", () => {
  it("listarMisReservas devuelve exactamente las reservas de la sesión", () => {
    fc.assert(
      fc.property(validBookingsArb, fc.constantFrom(...usuarios), (bookings, quien) => {
        const ctx = createBookingTestContext();
        seedBookings(ctx.storage, bookings);
        ctx.auth.current = usuario(quien);
        const result = ctx.service.listarMisReservas();
        expect(result).toEqual({
          ok: true,
          value: ordenarPorInicio(bookings.filter((b) => b.userId === quien)),
        });
      }),
      { numRuns: 100 },
    );
  });

  it("cancelar una reserva ajena siempre falla igual que una inexistente y no cambia nada", async () => {
    await fc.assert(
      fc.asyncProperty(validBookingsArb, fc.constantFrom(...usuarios), fc.nat(), async (bookings, quien, pick) => {
        const ajenas = bookings.filter((b) => b.userId !== quien);
        fc.pre(ajenas.length > 0);
        const objetivo = ajenas[pick % ajenas.length];
        if (!objetivo) return;
        const ctx = createBookingTestContext();
        seedBookings(ctx.storage, bookings);
        const antes = storedBookings(ctx.storage);
        ctx.auth.current = usuario(quien);
        const result = await ctx.service.cancelar(objetivo.id);
        expect(result.ok ? "" : result.error.code).toBe("BOOKING_NOT_FOUND");
        expect(storedBookings(ctx.storage)).toBe(antes);
      }),
      { numRuns: 100 },
    );
  });

  it("sin sesión, todas las operaciones devuelven NOT_AUTHENTICATED", async () => {
    await fc.assert(
      fc.asyncProperty(validBookingsArb, fc.string(), async (bookings, id) => {
        const ctx = createBookingTestContext();
        seedBookings(ctx.storage, bookings);
        ctx.auth.current = null;
        const codigos = [
          await ctx.service.reservar({ spaceId: "sala-1", date: "2026-11-02", startTime: "10:00", durationHours: 1 }),
          await ctx.service.cancelar(id),
          ctx.service.listarMisReservas(),
          ctx.service.horasLibres("sala-1", "2026-11-02"),
        ].map((r) => (r.ok ? "OK" : r.error.code));
        expect(codigos).toEqual(["NOT_AUTHENTICATED", "NOT_AUTHENTICATED", "NOT_AUTHENTICATED", "NOT_AUTHENTICATED"]);
      }),
      { numRuns: 100 },
    );
  });

  it("lo guardado contiene ids y nunca nombres ni correos", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...usuarios), fc.integer({ min: 8, max: 21 }), async (quien, hora) => {
        const ctx = createBookingTestContext();
        ctx.auth.current = usuario(quien);
        const result = await ctx.service.reservar({
          spaceId: "sala-1",
          date: "2026-11-02",
          startTime: `${String(hora).padStart(2, "0")}:00`,
          durationHours: 1,
        });
        expect(result.ok).toBe(true);
        const texto = storedBookings(ctx.storage) ?? "";
        expect(texto).not.toContain(`Persona ${quien}`);
        expect(texto).not.toContain("@example.com");
        const documento = JSON.parse(texto) as { bookings: Record<string, unknown>[] };
        for (const booking of documento.bookings) {
          expect(Object.keys(booking).every((k) => camposPermitidos.includes(k))).toBe(true);
          expect(booking.userId).toBe(quien);
        }
      }),
      { numRuns: 100 },
    );
  });
});
