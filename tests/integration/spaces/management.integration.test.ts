import { describe, expect, it } from "vitest";
import { createSpaceService } from "../../../src/spaces/service";
import { createSpaceTestDependencies } from "../../helpers/spaces";

describe("integración de gestión de espacios", () => {
  it("persiste los cambios confirmados y conserva reservas históricas", async () => {
    const dependencies = createSpaceTestDependencies("admin");
    const service = createSpaceService(dependencies);
    service.initialize();
    const existingReservations = JSON.stringify([
      { id: "booking-1", spaceId: "space-1", status: "confirmed" },
    ]);
    dependencies.storage.values.set(
      "reservalocal.reservations.v1",
      existingReservations,
    );

    const created = await service.createSpace({
      name: "Consultorio Uno",
      type: "consultorio",
      capacity: 3,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const deactivated = await service.deactivateSpace(created.value.id);
    expect(deactivated).toMatchObject({
      ok: true,
      value: { id: created.value.id, active: false },
    });
    expect(
      dependencies.storage.values.get("reservalocal.reservations.v1"),
    ).toBe(existingReservations);
    expect(dependencies.lock.names).toEqual([
      "reservalocal.spaces.v1",
      "reservalocal.spaces.v1",
    ]);
    expect(service.existeYEstaActivo(created.value.id)).toEqual({
      ok: true,
      value: false,
    });
  });

  it("no persiste el catálogo cuando StoragePort falla al escribir", async () => {
    const dependencies = createSpaceTestDependencies("admin");
    const service = createSpaceService(dependencies);
    service.initialize();
    dependencies.storage.failWrites = true;
    const result = await service.createSpace({
      name: "Sala de prueba",
      type: "sala",
      capacity: 10,
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "STORAGE_WRITE_FAILED" },
    });
    expect(dependencies.storage.values.has("reservalocal.spaces.v1")).toBe(
      false,
    );
  });
});
