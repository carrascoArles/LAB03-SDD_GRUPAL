import { describe, expect, it } from "vitest";
import { mensajesAdmin } from "../../../src/admin/model";
import { createAdminTestContext } from "../../helpers/admin";
import { reserva, seedBookings } from "../../helpers/bookings";

describe("autorización administrativa", () => {
  it("niega listar y cancelar antes de leer o bloquear para usuario normal", async () => {
    const ctx = createAdminTestContext({ role: "usuario" });
    seedBookings(ctx.storage, [reserva({ id: "ajena" })]);

    expect(ctx.admin.listarReservas()).toEqual({
      ok: false,
      error: { code: "PERMISSION_DENIED", message: mensajesAdmin.PERMISSION_DENIED },
    });
    expect(await ctx.admin.cancelarReserva("ajena")).toMatchObject({
      ok: false,
      error: { code: "PERMISSION_DENIED", message: mensajesAdmin.PERMISSION_DENIED },
    });
    expect(ctx.storage.reads).toBe(0);
    expect(ctx.lock.names).toHaveLength(0);
    expect(ctx.storage.writes).toBe(0);
  });

  it("deniega de forma segura si no puede verificarse el rol", async () => {
    const ctx = createAdminTestContext();
    ctx.auth.unavailable = true;

    expect(ctx.admin.listarReservas()).toMatchObject({
      ok: false,
      error: { code: "AUTH_STATE_UNAVAILABLE" },
    });
    expect(await ctx.admin.cancelarReserva("r1")).toMatchObject({
      ok: false,
      error: { code: "AUTH_STATE_UNAVAILABLE" },
    });
    expect(ctx.storage.reads).toBe(0);
    expect(ctx.lock.names).toHaveLength(0);
  });
});
