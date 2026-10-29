import { describe, expect, it } from "vitest";
import { createBookingTestContext, storedBookings, usuario } from "../../helpers/bookings";

const pedido = (startTime: string, date = "2026-11-02", spaceId = "sala-1") => ({
  spaceId,
  date,
  startTime,
  durationHours: 1,
});

describe("ver y cancelar mis reservas (RF-008–RF-011, RF-016)", () => {
  it("cada persona ve solo sus reservas, ordenadas por inicio", async () => {
    const ctx = createBookingTestContext();
    await ctx.service.reservar(pedido("15:00"));
    await ctx.service.reservar(pedido("09:00", "2026-11-03"));
    await ctx.service.reservar(pedido("09:00"));
    ctx.auth.current = usuario("beto");
    await ctx.service.reservar(pedido("12:00"));

    const beto = ctx.service.listarMisReservas();
    expect(beto.ok && beto.value.map((b) => b.start)).toEqual(["2026-11-02T12:00"]);
    ctx.auth.current = usuario("ana");
    const ana = ctx.service.listarMisReservas();
    expect(ana.ok && ana.value.map((b) => b.start)).toEqual([
      "2026-11-02T09:00",
      "2026-11-02T15:00",
      "2026-11-03T09:00",
    ]);
  });

  it("cancelar libera la franja para otra persona", async () => {
    const ctx = createBookingTestContext();
    const ana = await ctx.service.reservar(pedido("10:00"));
    ctx.auth.current = usuario("beto");
    expect((await ctx.service.reservar(pedido("10:00"))).ok).toBe(false);
    ctx.auth.current = usuario("ana");
    if (ana.ok) expect((await ctx.service.cancelar(ana.value.id)).ok).toBe(true);
    ctx.auth.current = usuario("beto");
    expect((await ctx.service.reservar(pedido("10:00"))).ok).toBe(true);
    const lista = ctx.service.listarMisReservas();
    expect(lista.ok && lista.value.map((b) => b.status)).toEqual(["activa"]);
  });

  it("una reserva de un espacio desactivado se conserva y se puede cancelar", async () => {
    const ctx = createBookingTestContext();
    const r = await ctx.service.reservar(pedido("10:00"));
    ctx.spaces.active.delete("sala-1");
    expect(ctx.service.listarMisReservas()).toMatchObject({ ok: true, value: { length: 1 } });
    if (r.ok) expect((await ctx.service.cancelar(r.value.id)).ok).toBe(true);
  });

  it("si falla la escritura o el bloqueo al cancelar, devuelve error y no cambia nada", async () => {
    const ctx = createBookingTestContext();
    const r = await ctx.service.reservar(pedido("10:00"));
    if (!r.ok) throw new Error("reserva previa fallida");
    const antes = storedBookings(ctx.storage);

    ctx.storage.failWritesFor.add("*");
    const escritura = await ctx.service.cancelar(r.value.id);
    expect(escritura.ok ? "" : escritura.error.code).toBe("STORAGE_WRITE_FAILED");
    expect(storedBookings(ctx.storage)).toBe(antes);

    ctx.storage.failWritesFor.clear();
    ctx.lock.fail = true;
    const bloqueo = await ctx.service.cancelar(r.value.id);
    expect(bloqueo.ok ? "" : bloqueo.error.code).toBe("LOCK_FAILED");
    expect(storedBookings(ctx.storage)).toBe(antes);
  });

  it("no oculta un fallo de lectura al listar", () => {
    const ctx = createBookingTestContext();
    ctx.storage.failReads = true;
    const result = ctx.service.listarMisReservas();
    expect(result.ok ? "" : result.error.code).toBe("STORAGE_READ_FAILED");
  });
});
