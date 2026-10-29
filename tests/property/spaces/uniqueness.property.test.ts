import fc from "fast-check";
import { describe, it } from "vitest";
import { createSpaceService } from "../../../src/spaces/service";
import { createSpaceTestDependencies } from "../../helpers/spaces";

const nameArbitrary = fc
  .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789"), {
    minLength: 3,
    maxLength: 30,
  })
  .map((characters) => characters.join(""));

describe("propiedades de unicidad de espacios", () => {
  it("rechaza al crear nombres equivalentes sin distinguir mayúsculas", () => {
    fc.assert(
      fc.asyncProperty(nameArbitrary, async (name) => {
        const dependencies = createSpaceTestDependencies("admin");
        const service = createSpaceService(dependencies);
        service.initialize();
        const created = await service.createSpace({
          name,
          type: "sala",
          capacity: 1,
        });
        if (!created.ok) return false;
        const duplicate = await service.createSpace({
          name: name.toUpperCase(),
          type: "sala",
          capacity: 1,
        });
        return (
          !duplicate.ok && duplicate.error.code === "DUPLICATE_NAME"
        );
      }),
      { numRuns: 100 },
    );
  });

  it("rechaza duplicados contra registros inactivos y al editar otro id", () => {
    fc.assert(
      fc.asyncProperty(nameArbitrary, async (name) => {
        const dependencies = createSpaceTestDependencies("admin");
        const service = createSpaceService(dependencies);
        service.initialize();
        const first = await service.createSpace({
          name,
          type: "sala",
          capacity: 1,
        });
        const second = await service.createSpace({
          name: `otra ${name}`,
          type: "cancha",
          capacity: 2,
        });
        if (!first.ok || !second.ok) return false;
        await service.deactivateSpace(first.value.id);
        const duplicate = await service.updateSpace(second.value.id, {
          name: name.toUpperCase(),
          type: "cancha",
          capacity: 2,
        });
        return !duplicate.ok && duplicate.error.code === "DUPLICATE_NAME";
      }),
      { numRuns: 100 },
    );
  });
});
