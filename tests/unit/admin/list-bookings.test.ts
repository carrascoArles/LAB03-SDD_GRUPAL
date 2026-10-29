import { describe, expect, it } from "vitest";
import {
  createAdminTestContext,
} from "../../helpers/admin";
import { reserva, seedBookings } from "../../helpers/bookings";

describe("listado administrativo de reservas", () => {
  it("incluye reservas activas y canceladas de todos los usuarios ordenadas por inicio e id", () => {
    const ctx = createAdminTestContext();
    seedBookings(ctx.storage, [
      reserva({ id: "z", userId: "beto", start: "2026-11-02T11:00", end: "2026-11-02T12:00" }),
      reserva({ id: "b", userId: "ana", start: "2026-11-02T10:00", end: "2026-11-02T11:00" }),
      reserva({
        id: "a",
        userId: "carla",
        start: "2026-11-02T10:00",
        end: "2026-11-02T11:00",
        status: "cancelada",
        cancelledAt: "2026-11-01T10:00",
      }),
    ]);

    const result = ctx.admin.listarReservas();

    expect(result.ok && result.value.map((booking) => booking.id)).toEqual([
      "a",
      "b",
      "z",
    ]);
  });

  it("devuelve una lista vacía y no oculta errores de lectura", () => {
    const ctx = createAdminTestContext();
    expect(ctx.admin.listarReservas()).toEqual({ ok: true, value: [] });
    ctx.storage.failReads = true;
    expect(ctx.admin.listarReservas()).toMatchObject({
      ok: false,
      error: { code: "STORAGE_READ_FAILED" },
    });
  });

  it("propaga un documento corrupto en vez de mostrar una lista vacía", () => {
    const ctx = createAdminTestContext();
    ctx.storage.values.set("reservalocal.bookings.v1", "{");
    expect(ctx.admin.listarReservas()).toMatchObject({
      ok: false,
      error: { code: "CORRUPT_STORAGE" },
    });
  });
});
