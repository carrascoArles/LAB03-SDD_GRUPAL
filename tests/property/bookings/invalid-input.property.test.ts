import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { mensajes } from "../../../src/bookings/model";
import type { ReservaInput } from "../../../src/bookings/model";
import { validarSolicitud } from "../../../src/bookings/validation";
import { createBookingTestContext, storedBookings } from "../../helpers/bookings";

const validacion = new Set([
  "INVALID_SPACE",
  "INVALID_DATE",
  "INVALID_START_TIME",
  "INVALID_DURATION",
  "OUTSIDE_OPENING_HOURS",
  "PAST_DATETIME",
  "SPACE_NOT_AVAILABLE",
  "OVERLAP",
  "BOOKING_NOT_FOUND",
]);

const casiValidaArb = fc.record({
  spaceId: fc.oneof(fc.constant("sala-1"), fc.anything()),
  date: fc.oneof(fc.constant("2026-11-02"), fc.string(), fc.anything()),
  startTime: fc.oneof(fc.constantFrom("07:00", "10:00", "21:00", "10:30"), fc.anything()),
  durationHours: fc.oneof(fc.integer({ min: -2, max: 6 }), fc.double(), fc.anything()),
});

describe("propiedad: las entradas inválidas devuelven error y nunca lanzan (RF-013, RF-016)", () => {
  it("validarSolicitud no lanza con ningún valor", () => {
    fc.assert(
      fc.property(fc.anything(), (valor) => {
        expect(() => validarSolicitud(valor)).not.toThrow();
        expect(validarSolicitud(valor).ok).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("reservar, cancelar y horasLibres devuelven un error del catálogo y no cambian datos", async () => {
    await fc.assert(
      fc.asyncProperty(fc.anything(), fc.anything(), async (a, b) => {
        const ctx = createBookingTestContext();
        const resultados = [
          await ctx.service.reservar(a as ReservaInput),
          await ctx.service.cancelar(a as string),
          ctx.service.horasLibres(a as string, b as string),
        ];
        for (const result of resultados) {
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(validacion.has(result.error.code)).toBe(true);
            expect(result.error.message).toBe(mensajes[result.error.code]);
          }
        }
        expect(storedBookings(ctx.storage)).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  it("con solicitudes casi válidas, todo error usa el mensaje en español del catálogo", async () => {
    await fc.assert(
      fc.asyncProperty(casiValidaArb, async (input) => {
        const ctx = createBookingTestContext();
        const result = await ctx.service.reservar(input as ReservaInput);
        if (!result.ok) {
          expect(result.error.message).toBe(mensajes[result.error.code]);
          expect(storedBookings(ctx.storage)).toBeUndefined();
        }
      }),
      { numRuns: 100 },
    );
  });
});
