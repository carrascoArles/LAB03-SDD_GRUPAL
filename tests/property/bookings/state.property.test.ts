import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { decodeBookingState, serializeBookingState } from "../../../src/bookings/state";
import { validBookingsArb } from "./arbitraries";

describe("propiedad constitucional: serializar y deserializar conserva los datos", () => {
  it("cualquier documento válido sobrevive a la ida y vuelta", () => {
    fc.assert(
      fc.property(validBookingsArb, (bookings) => {
        const state = { schemaVersion: 1 as const, bookings };
        expect(decodeBookingState(serializeBookingState(state))).toEqual({ ok: true, value: state });
      }),
      { numRuns: 100 },
    );
  });
});
