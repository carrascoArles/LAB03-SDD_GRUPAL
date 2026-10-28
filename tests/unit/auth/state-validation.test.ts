import { describe, expect, it } from "vitest";
import {
  decodeAuthState,
  emptyAuthState,
  serializeAuthState,
} from "../../../src/auth/model";

const firstAdmin = {
  id: "user-1",
  name: "Ana",
  email: "ana@example.com",
  role: "admin",
  passwordAlgorithm: "sha256-salt-v1",
  salt: "0123456789abcdef0123456789abcdef",
  passwordHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
} as const;

// Requisitos RF-013–RF-016: validar esquema, campos y relaciones persistidas.
describe("validación del estado persistido", () => {
  it("acepta un estado válido y restaura la referencia de sesión", () => {
    const state = {
      schemaVersion: 1,
      users: [firstAdmin],
      sessionUserId: "user-1",
    };
    expect(decodeAuthState(JSON.stringify(state))).toMatchObject({
      ok: true,
      value: state,
    });
  });

  it("rechaza datos JSON corruptos y campos desconocidos", () => {
    expect(decodeAuthState("{")).toMatchObject({ ok: false });
    expect(
      decodeAuthState({
        schemaVersion: 1,
        users: [{ ...firstAdmin, plaintextPassword: "secret123" }],
        sessionUserId: null,
      }),
    ).toMatchObject({ ok: false });
  });

  it("rechaza roles inválidos, correos duplicados y sesión sin cuenta", () => {
    expect(
      decodeAuthState({
        schemaVersion: 1,
        users: [{ ...firstAdmin, role: "owner" }],
        sessionUserId: null,
      }).ok,
    ).toBe(false);
    expect(
      decodeAuthState({
        schemaVersion: 1,
        users: [firstAdmin, { ...firstAdmin, id: "user-2", role: "usuario" }],
        sessionUserId: null,
      }).ok,
    ).toBe(false);
    expect(
      decodeAuthState({
        schemaVersion: 1,
        users: [firstAdmin],
        sessionUserId: "missing",
      }).ok,
    ).toBe(false);
  });

  it("conserva los datos al serializar y deserializar", () => {
    const state = {
      ...emptyAuthState(),
      users: [firstAdmin],
      sessionUserId: "user-1",
    };
    expect(decodeAuthState(serializeAuthState(state))).toEqual({
      ok: true,
      value: state,
    });
  });
});
