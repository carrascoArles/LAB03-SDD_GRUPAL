import { describe, expect, it } from "vitest";
import {
  decodeSpaceState,
  serializeSpaceState,
} from "../../../src/spaces/state";
import type { SpaceState } from "../../../src/spaces/model";

const activeSpace = {
  id: "cancha-1",
  name: "Cancha Norte",
  type: "cancha",
  capacity: 20,
  description: "Cancha principal",
  active: true,
} as const;

describe("estado persistido de espacios", () => {
  it("decodifica el estado vacío y una descripción opcional", () => {
    expect(decodeSpaceState(null)).toEqual({
      ok: true,
      value: { schemaVersion: 1, spaces: [] },
    });
    expect(
      decodeSpaceState({
        schemaVersion: 1,
        spaces: [{ ...activeSpace, description: undefined }],
      }).ok,
    ).toBe(true);
  });

  it.each([
    ["JSON inválido", "{", "CORRUPT_STORAGE"],
    [
      "versión desconocida",
      { schemaVersion: 2, spaces: [] },
      "CORRUPT_STORAGE",
    ],
    [
      "clave desconocida",
      { schemaVersion: 1, spaces: [], extra: true },
      "CORRUPT_STORAGE",
    ],
    [
      "identificador duplicado",
      { schemaVersion: 1, spaces: [activeSpace, { ...activeSpace, name: "Sala 1" }] },
      "CORRUPT_STORAGE",
    ],
    [
      "nombre duplicado sin distinguir mayúsculas",
      {
        schemaVersion: 1,
        spaces: [activeSpace, { ...activeSpace, id: "cancha-2", name: "CANCHA NORTE" }],
      },
      "CORRUPT_STORAGE",
    ],
    [
      "capacidad no válida",
      { schemaVersion: 1, spaces: [{ ...activeSpace, capacity: 1.5 }] },
      "CORRUPT_STORAGE",
    ],
    [
      "tipo no permitido",
      { schemaVersion: 1, spaces: [{ ...activeSpace, type: "piscina" }] },
      "CORRUPT_STORAGE",
    ],
    [
      "estado no booleano",
      { schemaVersion: 1, spaces: [{ ...activeSpace, active: "sí" }] },
      "CORRUPT_STORAGE",
    ],
  ])("rechaza %s", (_description, input, code) => {
    const decoded = decodeSpaceState(input);
    expect(decoded).toMatchObject({ ok: false, error: { code } });
  });

  it("conserva espacios activos e inactivos al serializar y decodificar", () => {
    const state: SpaceState = {
      schemaVersion: 1,
      spaces: [activeSpace, { ...activeSpace, id: "cancha-2", name: "Sala Sur", active: false }],
    };
    expect(decodeSpaceState(serializeSpaceState(state))).toEqual({
      ok: true,
      value: state,
    });
  });
});
