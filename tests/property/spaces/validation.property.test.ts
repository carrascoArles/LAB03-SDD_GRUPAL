import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  validateSpaceCapacity,
  validateSpaceDescription,
  validateSpaceName,
} from "../../../src/spaces/validation";

describe("propiedades de validación de espacios", () => {
  it("acepta cualquier nombre ASCII entre 3 y 50 caracteres", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 50 }),
        (name) => {
          expect(validateSpaceName(name).ok).toBe(true);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rechaza nombres con menos de 3 o más de 50 caracteres", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string({ maxLength: 2 }), fc.string({ minLength: 51, maxLength: 80 })),
        (name) => {
          expect(validateSpaceName(name).ok).toBe(false);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("acepta capacidades enteras de 1 a 100", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (capacity) => {
        expect(validateSpaceCapacity(capacity)).toEqual({
          ok: true,
          value: capacity,
        });
        return true;
      }),
      { numRuns: 100 },
    );
  });

  it("rechaza capacidades fuera de rango y decimales", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ max: 0 }),
          fc.integer({ min: 101 }),
          fc.double({ min: 1.01, max: 99.99, noNaN: true }).filter(
            (value) => !Number.isInteger(value),
          ),
        ),
        (capacity) => {
          expect(validateSpaceCapacity(capacity).ok).toBe(false);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it("acepta descripción de hasta 200 caracteres y rechaza las mayores", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 200 }), (description) => {
        expect(validateSpaceDescription(description).ok).toBe(true);
        return true;
      }),
      { numRuns: 100 },
    );
    fc.assert(
      fc.property(
        fc.string({ minLength: 201, maxLength: 300 }),
        (description) => {
          expect(validateSpaceDescription(description).ok).toBe(false);
          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
