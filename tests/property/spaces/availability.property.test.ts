import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { serializeSpaceState } from "../../../src/spaces/state";
import { createSpaceService } from "../../../src/spaces/service";
import type { Space, SpaceState } from "../../../src/spaces/model";
import { createSpaceTestDependencies } from "../../helpers/spaces";

describe("propiedades de disponibilidad", () => {
  it("desactivar cualquier espacio conserva sus datos y elimina disponibilidad", () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc
            .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz"), {
              minLength: 3,
              maxLength: 40,
            })
            .map((characters) => characters.join("")),
          capacity: fc.integer({ min: 1, max: 100 }),
          description: fc.string({ maxLength: 200 }),
          type: fc.constantFrom("cancha", "sala", "consultorio"),
        }),
        async (input) => {
          const dependencies = createSpaceTestDependencies("admin");
          const original: Space = {
            id: "space-property-id",
            ...input,
            active: true,
          };
          const state: SpaceState = {
            schemaVersion: 1,
            spaces: [original],
          };
          dependencies.storage.values.set(
            "reservalocal.spaces.v1",
            serializeSpaceState(state),
          );
          const service = createSpaceService(dependencies);
          if (!service.initialize().ok) return false;
          const deactivated = await service.deactivateSpace(original.id);
          const available = service.existeYEstaActivo(original.id);
          if (!deactivated.ok || !available.ok) return false;
          expect(deactivated.value).toEqual({ ...original, active: false });
          return available.value === false;
        },
      ),
      { numRuns: 100 },
    );
  });
});
