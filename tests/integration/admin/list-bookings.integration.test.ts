import { describe, expect, it } from "vitest";
import { leerReservas } from "../../../src/bookings";
import { createAdminTestContext } from "../../helpers/admin";
import { reserva, seedBookings } from "../../helpers/bookings";

describe("integración del listado administrativo", () => {
  it("lee el documento compartido sin filtrar usuarios ni estados", () => {
    const ctx = createAdminTestContext();
    const bookings = [
      reserva({ id: "activa", userId: "ana" }),
      reserva({
        id: "cancelada",
        userId: "beto",
        start: "2026-11-02T12:00",
        end: "2026-11-02T13:00",
        status: "cancelada",
        cancelledAt: "2026-11-01T10:00",
      }),
    ];
    seedBookings(ctx.storage, bookings);

    const result = ctx.admin.listarReservas();
    const persisted = leerReservas(ctx.storage);

    expect(result).toEqual({ ok: true, value: bookings });
    expect(persisted.ok && persisted.value.bookings).toEqual(bookings);
  });
});
