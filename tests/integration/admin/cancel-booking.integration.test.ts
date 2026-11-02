import { describe, expect, it } from "vitest";
import { leerReservas } from "../../../src/bookings";
import { createAdminTestContext } from "../../helpers/admin";
import { reserva, seedBookings } from "../../helpers/bookings";

describe("integración de cancelación administrativa", () => {
  it("relee bajo el bloqueo de bookings y persiste una cancelación ajena", async () => {
    const ctx = createAdminTestContext();
    ctx.time.now = "2026-11-02T09:00";
    seedBookings(ctx.storage, [reserva({ id: "ajena", userId: "beto" })]);

    const result = await ctx.admin.cancelarReserva("ajena");
    expect(ctx.storage.reads).toBe(1);
    expect(ctx.storage.writes).toBe(1);
    const persisted = leerReservas(ctx.storage);

    expect(result.ok && result.value.status).toBe("cancelada");
    expect(persisted.ok && persisted.value.bookings[0]?.status).toBe("cancelada");
    expect(ctx.lock.names).toEqual(["reservalocal.spaces.v1"]);
    expect(ctx.storage.reads).toBe(2);
  });

  it("propaga errores de bloqueo y escritura sin informar éxito", async () => {
    const lockFailure = createAdminTestContext();
    seedBookings(lockFailure.storage, [reserva({ id: "r1" })]);
    lockFailure.lock.fail = true;
    expect(await lockFailure.admin.cancelarReserva("r1")).toMatchObject({
      ok: false,
      error: { code: "LOCK_FAILED" },
    });
    expect(lockFailure.storage.reads).toBe(0);

    const writeFailure = createAdminTestContext();
    seedBookings(writeFailure.storage, [reserva({ id: "r2" })]);
    writeFailure.storage.failWritesFor.add("*");
    expect(await writeFailure.admin.cancelarReserva("r2")).toMatchObject({
      ok: false,
      error: { code: "STORAGE_WRITE_FAILED" },
    });
  });
});
