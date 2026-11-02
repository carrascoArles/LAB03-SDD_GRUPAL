import { describe, expect, it } from "vitest";
import { mensajes } from "../../../src/bookings";
import {
  createAdminTestContext,
} from "../../helpers/admin";
import {
  reserva,
  seedBookings,
  storedBookings,
} from "../../helpers/bookings";

describe("cancelación administrativa", () => {
  it("cancela reservas de otra persona justo 60 minutos antes", async () => {
    const ctx = createAdminTestContext();
    ctx.time.now = "2026-11-02T09:00";
    seedBookings(ctx.storage, [reserva({ id: "ajena", userId: "beto" })]);

    const result = await ctx.admin.cancelarReserva("ajena");

    expect(result).toMatchObject({
      ok: true,
      value: { id: "ajena", userId: "beto", status: "cancelada", cancelledAt: "2026-11-02T09:00" },
    });
    expect(ctx.storage.writes).toBe(1);
  });

  it("rechaza a 59 minutos sin escribir", async () => {
    const ctx = createAdminTestContext();
    ctx.time.now = "2026-11-02T09:01";
    seedBookings(ctx.storage, [reserva({ id: "r1" })]);
    const before = storedBookings(ctx.storage);

    const result = await ctx.admin.cancelarReserva("r1");

    expect(result).toEqual({
      ok: false,
      error: { code: "CANCELLATION_TOO_LATE", message: mensajes.CANCELLATION_TOO_LATE },
    });
    expect(storedBookings(ctx.storage)).toBe(before);
    expect(ctx.storage.writes).toBe(0);
  });

  it("rechaza ids vacíos y reservas inexistentes con errores claros", async () => {
    const ctx = createAdminTestContext();
    expect(await ctx.admin.cancelarReserva("  ")).toMatchObject({
      ok: false,
      error: { code: "INVALID_BOOKING_ID" },
    });
    expect(await ctx.admin.cancelarReserva("no-existe")).toMatchObject({
      ok: false,
      error: { code: "BOOKING_NOT_FOUND" },
    });
  });

  it("repetir una cancelación no depende del reloj ni vuelve a escribir", async () => {
    const ctx = createAdminTestContext({
      clock: () => {
        throw new Error("No debe consultarse el reloj para una cancelada");
      },
    });
    const cancelled = reserva({
      id: "cancelada",
      status: "cancelada",
      cancelledAt: "2026-11-02T08:30",
    });
    seedBookings(ctx.storage, [cancelled]);
    const before = storedBookings(ctx.storage);

    const result = await ctx.admin.cancelarReserva("cancelada");

    expect(result).toEqual({ ok: true, value: cancelled });
    expect(storedBookings(ctx.storage)).toBe(before);
    expect(ctx.storage.writes).toBe(0);
  });

  it("no presenta éxito ante un reloj o escritura fallidos", async () => {
    const badClock = createAdminTestContext({ clock: () => "fecha-inválida" });
    seedBookings(badClock.storage, [reserva({ id: "r1" })]);
    expect(await badClock.admin.cancelarReserva("r1")).toMatchObject({
      ok: false,
      error: { code: "CLOCK_UNAVAILABLE" },
    });

    const badWrite = createAdminTestContext();
    seedBookings(badWrite.storage, [reserva({ id: "r2" })]);
    badWrite.storage.failWritesFor.add("*");
    expect(await badWrite.admin.cancelarReserva("r2")).toMatchObject({
      ok: false,
      error: { code: "STORAGE_WRITE_FAILED" },
    });

    const badRead = createAdminTestContext();
    badRead.storage.failReads = true;
    expect(await badRead.admin.cancelarReserva("r3")).toMatchObject({
      ok: false,
      error: { code: "STORAGE_READ_FAILED" },
    });
  });
});
