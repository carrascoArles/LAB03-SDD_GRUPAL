import fc from "fast-check";
import { describe, it } from "vitest";
import { createSpaceService } from "../../../src/spaces/service";
import { createSpaceTestDependencies } from "../../helpers/spaces";

describe("propiedades de gestión de espacios", () => {
  it("rechaza toda capacidad entera inválida sin persistir cambios", () => {
    fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.integer({ max: 0 }),
          fc.integer({ min: 101 }),
          fc.double({ min: 1.01, max: 99.99 }).filter(
            (capacity) => !Number.isInteger(capacity),
          ),
        ),
        async (capacity) => {
          const dependencies = createSpaceTestDependencies("admin");
          const service = createSpaceService(dependencies);
          service.initialize();
          const before = dependencies.storage.values.get(
            "reservalocal.spaces.v1",
          );
          const result = await service.createSpace({
            name: "Capacidad inválida",
            type: "sala",
            capacity,
          });
          return (
            !result.ok &&
            result.error.code === "INVALID_CAPACITY" &&
            dependencies.storage.values.get("reservalocal.spaces.v1") ===
              before
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rechaza toda mutación de usuario sin cambiar el almacenamiento", () => {
    fc.assert(
      fc.asyncProperty(fc.constantFrom("create", "update", "deactivate"), async (operation) => {
        const dependencies = createSpaceTestDependencies("usuario");
        const service = createSpaceService(dependencies);
        service.initialize();
        const before = [...dependencies.storage.values.entries()];
        const result =
          operation === "create"
            ? await service.createSpace({
                name: "Sala protegida",
                type: "sala",
                capacity: 4,
              })
            : operation === "update"
              ? await service.updateSpace("space-id", {
                  name: "Sala protegida",
                  type: "sala",
                  capacity: 4,
                })
              : await service.deactivateSpace("space-id");
        return (
          !result.ok &&
          result.error.code === "PERMISSION_DENIED" &&
          [...dependencies.storage.values.entries()].every(
            ([key, value]) => before.some(([oldKey, oldValue]) =>
              oldKey === key && oldValue === value,
            ),
          )
        );
      }),
      { numRuns: 100 },
    );
  });
});
