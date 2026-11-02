import { describe, expect, it } from "vitest";
import { BOOKINGS_BACKUP_KEY, BOOKINGS_STORAGE_KEY } from "../../../src/bookings/repository";
import { createBookingTestContext, reserva, seedBookings } from "../../helpers/bookings";

describe("recuperación ante datos corruptos (RF-014)", () => {
  it("sin datos guardados arranca sin aviso", () => {
    const ctx = createBookingTestContext();
    expect(ctx.service.initialize()).toEqual({ ok: true, value: undefined });
    expect(ctx.storage.values.has(BOOKINGS_BACKUP_KEY)).toBe(false);
  });

  it("con datos válidos arranca sin tocarlos", () => {
    const ctx = createBookingTestContext();
    seedBookings(ctx.storage, [reserva({ id: "r1" })]);
    const antes = ctx.storage.values.get(BOOKINGS_STORAGE_KEY);
    expect(ctx.service.initialize().ok).toBe(true);
    expect(ctx.storage.values.get(BOOKINGS_STORAGE_KEY)).toBe(antes);
  });

  it("con datos corruptos guarda respaldo, arranca vacío, avisa y permite reservar", async () => {
    const ctx = createBookingTestContext();
    ctx.storage.values.set(BOOKINGS_STORAGE_KEY, "{roto");
    const init = ctx.service.initialize();
    expect(init.ok ? "" : init.error.message).toBe(
      "Los datos de reservas estaban dañados: se guardó una copia de respaldo y se empezó sin reservas.",
    );
    expect(ctx.storage.values.get(BOOKINGS_BACKUP_KEY)).toBe("{roto");
    expect(ctx.service.listarMisReservas()).toEqual({ ok: true, value: [] });
    const nueva = await ctx.service.reservar({
      spaceId: "sala-1",
      date: "2026-11-02",
      startTime: "10:00",
      durationHours: 1,
    });
    expect(nueva.ok).toBe(true);
  });

  it("si no se puede guardar el respaldo, no sobrescribe el documento dañado", () => {
    const ctx = createBookingTestContext();
    ctx.storage.values.set(BOOKINGS_STORAGE_KEY, "{roto");
    ctx.storage.failWritesFor.add(BOOKINGS_BACKUP_KEY);
    const init = ctx.service.initialize();
    expect(init.ok ? "" : init.error.code).toBe("STORAGE_WRITE_FAILED");
    expect(ctx.storage.values.get(BOOKINGS_STORAGE_KEY)).toBe("{roto");
    const lista = ctx.service.listarMisReservas();
    expect(lista.ok ? "" : lista.error.code).toBe("CORRUPT_STORAGE");
  });

  it("informa un fallo de lectura sin presentarlo como lista vacía", () => {
    const ctx = createBookingTestContext();
    ctx.storage.failReads = true;
    const init = ctx.service.initialize();
    expect(init.ok ? "" : init.error.code).toBe("STORAGE_READ_FAILED");
  });
});
