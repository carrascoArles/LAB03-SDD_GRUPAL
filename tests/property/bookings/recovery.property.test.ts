import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { mensajes } from "../../../src/bookings/model";
import { BOOKINGS_BACKUP_KEY, BOOKINGS_STORAGE_KEY } from "../../../src/bookings/repository";
import { decodeBookingState } from "../../../src/bookings/state";
import { createBookingTestContext } from "../../helpers/bookings";

const corruptoArb = fc
  .oneof(fc.string(), fc.json(), fc.constant("{roto"), fc.constant('{"schemaVersion":1,"bookings":[{}]}'))
  .filter((texto) => !decodeBookingState(texto).ok);

describe("propiedad: datos corruptos → respaldo, arranque vacío y aviso (RF-014)", () => {
  it("cualquier texto inválido se respalda tal cual y la app sigue sin reservas", () => {
    fc.assert(
      fc.property(corruptoArb, (texto) => {
        const ctx = createBookingTestContext();
        ctx.storage.values.set(BOOKINGS_STORAGE_KEY, texto);

        const init = ctx.service.initialize();

        expect(init).toEqual({ ok: false, error: { code: "CORRUPT_STORAGE", message: mensajes.CORRUPT_STORAGE } });
        expect(ctx.storage.values.get(BOOKINGS_BACKUP_KEY)).toBe(texto);
        expect(ctx.service.listarMisReservas()).toEqual({ ok: true, value: [] });
      }),
      { numRuns: 100 },
    );
  });
});
