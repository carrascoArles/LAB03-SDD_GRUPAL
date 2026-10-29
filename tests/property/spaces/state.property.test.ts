import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Space, SpaceState, SpaceType } from "../../../src/spaces/model";
import { decodeSpaceState, serializeSpaceState } from "../../../src/spaces/state";

describe("propiedad de serialización de espacios", () => {
  it("conserva los datos de espacios activos e inactivos en el round-trip", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            type: fc.constantFrom<SpaceType>(
              "cancha",
              "sala",
              "consultorio",
            ),
            capacity: fc.integer({ min: 1, max: 100 }),
            description: fc.option(fc.string({ maxLength: 200 }), {
              nil: undefined,
            }),
            active: fc.boolean(),
          }),
          { maxLength: 20 },
        ),
        (records) => {
          const spaces: Space[] = records.map((record, index) => ({
            ...record,
            id: `space-${index}`,
            name: `Espacio ${index}`,
          }));
          const state: SpaceState = { schemaVersion: 1, spaces };
          const decoded = decodeSpaceState(serializeSpaceState(state));
          expect(decoded).toEqual({ ok: true, value: state });
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
