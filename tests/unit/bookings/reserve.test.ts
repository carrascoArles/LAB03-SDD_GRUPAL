import { describe, expect, it } from "vitest";
import { err } from "../../../src/shared/result";
import { bookingError, mensajes } from "../../../src/bookings/model";
import { createBookingTestContext, storedBookings } from "../../helpers/bookings";

const solicitud = { spaceId: "sala-1", date: "2026-11-02", startTime: "10:00", durationHours: 2 };

// Código del resultado o "OK".
function codigo(result: { ok: boolean; error?: { code: string } }): string {
  return result.ok ? "OK" : (result.error?.code ?? "");
}

describe("reservar (RF-002–RF-007)", () => {
  it("guarda una reserva activa con el usuario de la sesión", async () => {
    const ctx = createBookingTestContext();
    const result = await ctx.service.reservar(solicitud);
    expect(result).toEqual({
      ok: true,
      value: {
        id: "reserva-1",
        userId: "ana",
        spaceId: "sala-1",
        start: "2026-11-02T10:00",
        end: "2026-11-02T12:00",
        status: "activa",
        createdAt: "2026-11-01T09:00",
      },
    });
  });

  it("acepta una reserva adyacente y rechaza una solapada", async () => {
    const ctx = createBookingTestContext();
    await ctx.service.reservar(solicitud);
    expect(codigo(await ctx.service.reservar({ ...solicitud, startTime: "12:00", durationHours: 1 }))).toBe("OK");
    const solapada = await ctx.service.reservar({ ...solicitud, startTime: "11:00", durationHours: 1 });
    expect(solapada).toEqual({ ok: false, error: { code: "OVERLAP", message: mensajes.OVERLAP } });
  });

  it("rechaza espacios inexistentes o desactivados", async () => {
    const ctx = createBookingTestContext();
    expect(codigo(await ctx.service.reservar({ ...solicitud, spaceId: "no-existe" }))).toBe("SPACE_NOT_AVAILABLE");
    ctx.spaces.active.delete("sala-1");
    expect(codigo(await ctx.service.reservar(solicitud))).toBe("SPACE_NOT_AVAILABLE");
    expect(storedBookings(ctx.storage)).toBeUndefined();
  });

  it("no oculta un fallo del catálogo de espacios", async () => {
    const ctx = createBookingTestContext();
    ctx.spaces.fail = true;
    expect(codigo(await ctx.service.reservar(solicitud))).toBe("SPACES_UNAVAILABLE");
  });

  it("rechaza reservar en el pasado y acepta un inicio igual a la hora actual", async () => {
    const ctx = createBookingTestContext();
    ctx.time.now = "2026-11-02T10:01";
    expect(codigo(await ctx.service.reservar(solicitud))).toBe("PAST_DATETIME");
    ctx.time.now = "2026-11-02T10:00";
    expect(codigo(await ctx.service.reservar(solicitud))).toBe("OK");
  });

  it("exige sesión y no confía en un estado de sesión ilegible (RF-001)", async () => {
    const ctx = createBookingTestContext();
    ctx.auth.current = null;
    expect(codigo(await ctx.service.reservar(solicitud))).toBe("NOT_AUTHENTICATED");
    ctx.auth.unavailable = true;
    expect(codigo(await ctx.service.reservar(solicitud))).toBe("AUTH_STATE_UNAVAILABLE");
  });

  it("comprueba el espacio dentro del bloqueo compartido con 002", async () => {
    const ctx = createBookingTestContext();
    await ctx.service.reservar(solicitud);
    expect(ctx.lock.names).toEqual(["reservalocal.spaces.v1"]);
  });

  it("no reserva si el reloj o el generador de ids fallan", async () => {
    const reloj = createBookingTestContext();
    reloj.time.now = "mañana";
    expect(codigo(await reloj.service.reservar(solicitud))).toBe("CLOCK_UNAVAILABLE");

    const ids = createBookingTestContext({ newId: () => err(bookingError("ID_UNAVAILABLE")) });
    expect(codigo(await ids.service.reservar(solicitud))).toBe("ID_UNAVAILABLE");
    expect(storedBookings(ids.storage)).toBeUndefined();
  });
});
