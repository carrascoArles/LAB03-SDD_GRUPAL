import { describe, expect, it } from "vitest";
import { createSpaceService } from "../../../src/spaces/service";
import { createSpaceTestDependencies } from "../../helpers/spaces";

const validInput = {
  name: "Cancha central",
  type: "cancha" as const,
  capacity: 20,
  description: "Pasto sintético",
};

// Requisito: RF-003; crear un servicio listo con almacenamiento en memoria.
function initializedService(
  role: "admin" | "usuario" | null = "admin",
) {
  const dependencies = createSpaceTestDependencies(role);
  const service = createSpaceService(dependencies);
  expect(service.initialize().ok).toBe(true);
  return { ...dependencies, service };
}

describe("gestión de espacios", () => {
  it("crea, edita y desactiva conservando el registro", async () => {
    const { service, storage, lock } = initializedService();
    const created = await service.createSpace(validInput);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.active).toBe(true);

    const renamed = await service.updateSpace(created.value.id, {
      ...validInput,
      name: "CANCHA CENTRAL",
    });
    expect(renamed).toMatchObject({
      ok: true,
      value: { id: created.value.id, name: "CANCHA CENTRAL", active: true },
    });

    const deactivated = await service.deactivateSpace(created.value.id);
    expect(deactivated).toMatchObject({
      ok: true,
      value: { id: created.value.id, name: "CANCHA CENTRAL", active: false },
    });
    expect(lock.names).toEqual([
      "reservalocal.spaces.v1",
      "reservalocal.spaces.v1",
      "reservalocal.spaces.v1",
    ]);
    expect(JSON.stringify([...storage.values.values()])).toContain(
      "CANCHA CENTRAL",
    );
  });

  it("rechaza nombres duplicados ignorando mayúsculas, incluso inactivos", async () => {
    const { service } = initializedService();
    const created = await service.createSpace(validInput);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await service.deactivateSpace(created.value.id);
    expect(
      await service.createSpace({ ...validInput, name: "CANCHA CENTRAL" }),
    ).toMatchObject({ ok: false, error: { code: "DUPLICATE_NAME" } });
  });

  it("permite conservar el nombre propio y rechaza colisiones al editar", async () => {
    const { service } = initializedService();
    const first = await service.createSpace(validInput);
    const second = await service.createSpace({
      ...validInput,
      name: "Sala reuniones",
      type: "sala",
    });

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;

    expect(
      await service.updateSpace(first.value.id, {
        ...validInput,
        name: validInput.name,
      }),
    ).toMatchObject({ ok: true });
    expect(
      await service.updateSpace(second.value.id, {
        ...validInput,
        name: "CANCHA CENTRAL",
      }),
    ).toMatchObject({ ok: false, error: { code: "DUPLICATE_NAME" } });
  });

  it("elimina una descripción anterior cuando la actualización la omite", async () => {
    const { service } = initializedService();
    const created = await service.createSpace(validInput);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const updated = await service.updateSpace(created.value.id, {
      name: validInput.name,
      type: validInput.type,
      capacity: validInput.capacity,
    });
    expect(updated).toMatchObject({
      ok: true,
      value: {
        id: created.value.id,
        active: true,
      },
    });
    if (updated.ok) expect("description" in updated.value).toBe(false);
  });

  it("deniega la gestión a usuario y no modifica el almacenamiento", async () => {
    const { service, storage } = initializedService("usuario");
    const before = [...storage.values.entries()];
    const created = await service.createSpace(validInput);
    expect(created).toMatchObject({
      ok: false,
      error: {
        code: "PERMISSION_DENIED",
        message: "No tienes permiso para gestionar espacios",
      },
    });
    expect(await service.updateSpace("id", validInput)).toMatchObject({
      ok: false,
      error: { code: "PERMISSION_DENIED" },
    });
    expect(await service.deactivateSpace("id")).toMatchObject({
      ok: false,
      error: { code: "PERMISSION_DENIED" },
    });
    expect([...storage.values.entries()]).toEqual(before);
  });

  it("no presenta éxito si falla la escritura", async () => {
    const { service, storage } = initializedService();
    storage.failWrites = true;
    expect(await service.createSpace(validInput)).toMatchObject({
      ok: false,
      error: { code: "STORAGE_WRITE_FAILED" },
    });
    storage.failWrites = false;
    expect(service.listManagedSpaces()).toMatchObject({
      ok: true,
      value: [],
    });
  });
});
