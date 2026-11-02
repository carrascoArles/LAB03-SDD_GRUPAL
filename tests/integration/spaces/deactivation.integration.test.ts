import { describe, expect, it } from "vitest";
import { createSpaceService } from "../../../src/spaces/service";
import { createSpaceTestDependencies } from "../../helpers/spaces";

describe("integración de desactivación", () => {
  it("conserva el espacio y no altera reservas existentes", async () => {
    const dependencies = createSpaceTestDependencies("admin");
    const service = createSpaceService(dependencies);
    service.initialize();
    const created = await service.createSpace({
      name: "Sala con historial",
      type: "sala",
      capacity: 8,
      description: "Datos históricos",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const reservations = JSON.stringify([
      { id: "booking-existing", spaceId: created.value.id },
    ]);
    dependencies.storage.values.set(
      "reservalocal.reservations.v1",
      reservations,
    );

    const result = await service.deactivateSpace(created.value.id);
    expect(result).toMatchObject({
      ok: true,
      value: {
        ...created.value,
        active: false,
      },
    });
    expect(
      dependencies.storage.values.get("reservalocal.reservations.v1"),
    ).toBe(reservations);
    expect(service.listManagedSpaces()).toMatchObject({
      ok: true,
      value: [{ ...created.value, active: false }],
    });
  });
});
