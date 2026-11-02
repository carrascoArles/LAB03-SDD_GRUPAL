import fc from "fast-check";
import { describe, it } from "vitest";
import type { Space, SpaceState } from "../../../src/spaces/model";
import { createSpaceService } from "../../../src/spaces/service";
import { serializeSpaceState } from "../../../src/spaces/state";
import { validateSpaceName } from "../../../src/spaces/validation";
import { createSpaceTestDependencies } from "../../helpers/spaces";

describe("propiedades del catálogo", () => {
  it("nunca expone espacios inactivos y no entrega datos a una persona anónima", () => {
    fc.assert(
      fc.property(fc.array(fc.boolean(), { maxLength: 40 }), (activeFlags) => {
        const dependencies = createSpaceTestDependencies("usuario");
        const spaces: Space[] = activeFlags.map((active, index) => ({
          id: `catalog-${index}`,
          name: `Espacio ${index}`,
          type: "sala",
          capacity: index + 1,
          active,
        }));
        const state: SpaceState = { schemaVersion: 1, spaces };
        dependencies.storage.values.set(
          "reservalocal.spaces.v1",
          serializeSpaceState(state),
        );
        const user = createSpaceService(dependencies);
        if (!user.initialize().ok) return false;
        const listed = user.listActiveSpaces();
        if (!listed.ok || listed.value.length !== spaces.filter((s) => s.active).length) {
          return false;
        }
        if (!listed.value.every((space) => space.active)) return false;

        const anonymous = createSpaceService({
          ...dependencies,
          auth: createSpaceTestDependencies(null).auth,
        });
        if (!anonymous.initialize().ok) return false;
        const hidden = anonymous.listActiveSpaces();
        return !hidden.ok && hidden.error.code === "NOT_AUTHENTICATED";
      }),
      { numRuns: 100 },
    );
  });

  it("explica en español cuando un nombre incumple los límites", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string({ maxLength: 2 }), fc.string({ minLength: 51 })),
        (name) => {
          const result = validateSpaceName(name);
          return (
            !result.ok &&
            result.error.code === "INVALID_NAME" &&
            result.error.message.includes("nombre")
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
