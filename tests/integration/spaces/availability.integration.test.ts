import { describe, expect, it } from "vitest";
import { createSpaceService } from "../../../src/spaces/service";
import { createSpaceTestDependencies } from "../../helpers/spaces";

describe("integración de disponibilidad con consumidor de reservas", () => {
  it("no persiste una nueva reserva si el espacio está inactivo", async () => {
    const dependencies = createSpaceTestDependencies("admin");
    const service = createSpaceService(dependencies);
    service.initialize();
    const created = await service.createSpace({
      name: "Cancha no disponible",
      type: "cancha",
      capacity: 10,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(service.existeYEstaActivo(created.value.id)).toEqual({
      ok: true,
      value: true,
    });
    expect(service.existeYEstaActivo("missing-space")).toEqual({
      ok: true,
      value: false,
    });
    await service.deactivateSpace(created.value.id);

    const reservationResult = await dependencies.lock.runExclusive(
      "reservalocal.spaces.v1",
      async () => {
        const active = service.existeYEstaActivo(created.value.id);
        if (!active.ok) return active;
        if (!active.value) {
          return {
            ok: false as const,
            error: {
              code: "SPACE_NOT_FOUND" as const,
              message: "El espacio no existe o no está disponible.",
            },
          };
        }
        const saved = dependencies.storage.set(
          "reservalocal.reservations.v1",
          JSON.stringify([{ spaceId: created.value.id }]),
        );
        return saved.ok
          ? { ok: true as const, value: undefined }
          : {
              ok: false as const,
              error: {
                code: "STORAGE_WRITE_FAILED" as const,
                message: saved.error.message,
              },
            };
      },
    );

    expect(reservationResult.ok).toBe(true);
    if (reservationResult.ok) {
      expect(reservationResult.value.ok).toBe(false);
    }
    expect(
      dependencies.storage.values.has("reservalocal.reservations.v1"),
    ).toBe(false);
    expect(dependencies.lock.names).toEqual([
      "reservalocal.spaces.v1",
      "reservalocal.spaces.v1",
      "reservalocal.spaces.v1",
    ]);
  });
});
