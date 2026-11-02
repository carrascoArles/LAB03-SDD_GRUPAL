import { describe, expect, it } from "vitest";
import {
  validateSpaceCapacity,
  validateSpaceDescription,
  validateSpaceInput,
  validateSpaceName,
  validateSpaceType,
} from "../../../src/spaces/validation";

describe("validación de espacios", () => {
  it.each([
    ["ab", false],
    ["abc", true],
    ["a".repeat(50), true],
    ["a".repeat(51), false],
    ["á😀", false],
    ["á😀a", true],
  ])("valida nombre %j", (name, valid) => {
    expect(validateSpaceName(name).ok).toBe(valid);
  });

  it.each([
    [0, false],
    [1, true],
    [100, true],
    [101, false],
    [1.5, false],
    ["1", false],
    [Number.NaN, false],
  ])("valida capacidad %j", (capacity, valid) => {
    expect(validateSpaceCapacity(capacity).ok).toBe(valid);
  });

  it.each(["cancha", "sala", "consultorio"])(
    "acepta el tipo %s",
    (type) => {
      expect(validateSpaceType(type).ok).toBe(true);
    },
  );

  it("rechaza tipos no admitidos", () => {
    expect(validateSpaceType("piscina").ok).toBe(false);
    expect(validateSpaceType(null).ok).toBe(false);
  });

  it("permite descripción ausente, vacía y de 200 caracteres", () => {
    expect(validateSpaceDescription(undefined)).toEqual({
      ok: true,
      value: undefined,
    });
    expect(validateSpaceDescription("")).toMatchObject({ ok: true });
    expect(validateSpaceDescription("x".repeat(200)).ok).toBe(true);
  });

  it("rechaza descripción de más de 200 caracteres", () => {
    expect(validateSpaceDescription("x".repeat(201))).toMatchObject({
      ok: false,
      error: { code: "INVALID_DESCRIPTION" },
    });
  });

  it("rechaza un objeto si cualquiera de sus campos no es válido", () => {
    expect(
      validateSpaceInput({
        name: "Sala",
        type: "sala",
        capacity: 101,
        description: "",
      }),
    ).toMatchObject({ ok: false, error: { code: "INVALID_CAPACITY" } });
  });
});
