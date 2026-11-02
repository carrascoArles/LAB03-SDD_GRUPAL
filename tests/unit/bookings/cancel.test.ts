import { describe, expect, it } from "vitest";
import { mensajes } from "../../../src/bookings/model";
import {
  createBookingTestContext,
  reserva,
  seedBookings,
  storedBookings,
  usuario,
} from "../../helpers/bookings";

// Contexto con una reserva de Ana de 10:00 a 12:00 del 2 de noviembre.
function contexto() {
  const ctx = createBookingTestContext();
  seedBookings(ctx.storage, [reserva({ id: "r1" })]);
  return ctx;
}

describe("cancelar reservas (RF-009–RF-011)", () => {
  it("cancela justo 1 hora antes del inicio", async () => {
    const ctx = contexto();
    ctx.time.now = "2026-11-02T09:00";
    const result = await ctx.service.cancelar("r1");
    expect(result).toEqual({
      ok: true,
      value: reserva({ id: "r1", status: "cancelada", cancelledAt: "2026-11-02T09:00" }),
    });
  });

  it("rechaza cancelar 59 minutos antes sin cambiar nada", async () => {
    const ctx = contexto();
    ctx.time.now = "2026-11-02T09:01";
    const antes = storedBookings(ctx.storage);
    const result = await ctx.service.cancelar("r1");
    expect(result).toEqual({
      ok: false,
      error: { code: "CANCELLATION_TOO_LATE", message: mensajes.CANCELLATION_TOO_LATE },
    });
    expect(storedBookings(ctx.storage)).toBe(antes);
  });

  it("da el mismo mensaje para una reserva ajena y una inexistente", async () => {
    const ctx = contexto();
    ctx.auth.current = usuario("beto");
    const ajena = await ctx.service.cancelar("r1");
    const inexistente = await ctx.service.cancelar("no-existe");
    expect(ajena).toEqual(inexistente);
    expect(ajena).toEqual({
      ok: false,
      error: { code: "BOOKING_NOT_FOUND", message: "La reserva no existe o no te pertenece." },
    });
  });

  it("cancelar dos veces no da error ni vuelve a escribir", async () => {
    const ctx = contexto();
    const primera = await ctx.service.cancelar("r1");
    const guardado = storedBookings(ctx.storage);
    ctx.time.now = "2026-11-02T11:30";
    const segunda = await ctx.service.cancelar("r1");
    expect(segunda).toEqual(primera);
    expect(storedBookings(ctx.storage)).toBe(guardado);
  });

  it("exige sesión para cancelar (RF-001)", async () => {
    const ctx = contexto();
    ctx.auth.current = null;
    const result = await ctx.service.cancelar("r1");
    expect(result.ok ? "" : result.error.code).toBe("NOT_AUTHENTICATED");
  });

  it("rechaza ids vacíos o que no son texto sin lanzar", async () => {
    const ctx = contexto();
    expect((await ctx.service.cancelar("")).ok).toBe(false);
    expect((await ctx.service.cancelar(42 as unknown as string)).ok).toBe(false);
  });
});
