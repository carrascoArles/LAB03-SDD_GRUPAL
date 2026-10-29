import { describe, expect, it } from "vitest";
import { createSpaceService } from "../../../src/spaces/service";
import { createSpaceTestDependencies } from "../../helpers/spaces";

describe("disponibilidad de espacios", () => {
  it("refleja activación y desactivación sin borrar el espacio", async () => {
    const dependencies = createSpaceTestDependencies("admin");
    const service = createSpaceService(dependencies);
    service.initialize();
    const created = await service.createSpace({
      name: "Sala reservable",
      type: "sala",
      capacity: 5,
      description: "Con proyector",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    expect(service.existeYEstaActivo(created.value.id)).toEqual({
      ok: true,
      value: true,
    });
    expect(service.existeYEstaActivo("desconocido")).toEqual({
      ok: true,
      value: false,
    });
    const deactivated = await service.deactivateSpace(created.value.id);
    expect(deactivated).toMatchObject({
      ok: true,
      value: { ...created.value, active: false },
    });
    expect(service.existeYEstaActivo(created.value.id)).toEqual({
      ok: true,
      value: false,
    });
    expect(service.listManagedSpaces()).toMatchObject({
      ok: true,
      value: [{ ...created.value, active: false }],
    });
  });

  it("propaga fallos de lectura al comprobar disponibilidad", () => {
    const dependencies = createSpaceTestDependencies("admin");
    const service = createSpaceService(dependencies);
    service.initialize();
    dependencies.storage.failReads = true;
    expect(service.existeYEstaActivo("id")).toMatchObject({
      ok: false,
      error: { code: "STORAGE_READ_FAILED" },
    });
  });
});
