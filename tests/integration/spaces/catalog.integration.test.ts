import { describe, expect, it } from "vitest";
import { createSpaceService } from "../../../src/spaces/service";
import { createSpaceTestDependencies } from "../../helpers/spaces";

describe("integración del catálogo", () => {
  it("expone solo activos y detalles de 20 espacios a una persona autenticada", async () => {
    const adminDependencies = createSpaceTestDependencies("admin");
    const admin = createSpaceService(adminDependencies);
    admin.initialize();
    const ids: string[] = [];
    for (let index = 0; index < 20; index += 1) {
      const created = await admin.createSpace({
        name: `Espacio ${index}`,
        type: index % 3 === 0 ? "cancha" : index % 3 === 1 ? "sala" : "consultorio",
        capacity: (index % 100) + 1,
        description: `Detalle ${index}`,
      });
      if (!created.ok) throw new Error(created.error.message);
      ids.push(created.value.id);
      if (index % 2 === 1) await admin.deactivateSpace(created.value.id);
    }

    const user = createSpaceService({
      ...adminDependencies,
      auth: createSpaceTestDependencies("usuario").auth,
    });
    user.initialize();
    const catalog = user.listActiveSpaces();
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) return;
    expect(catalog.value).toHaveLength(10);
    expect(catalog.value.every((space) => space.active)).toBe(true);
    for (let index = 0; index < 20; index += 1) {
      const detail = user.getActiveSpace(ids[index] ?? "");
      expect(detail.ok).toBe(index % 2 === 0);
      if (detail.ok) {
        expect(detail.value.description).toBe(`Detalle ${index}`);
      }
    }
  });
});
