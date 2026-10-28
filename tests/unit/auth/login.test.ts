import { describe, expect, it } from "vitest";
import { createAuthService } from "../../../src/auth/service";
import { MemoryLock, MemoryStorage } from "../../helpers/auth";

// Requisitos RF-007–RF-008: verificar credenciales y evitar enumeración por mensaje.
describe("inicio de sesión", () => {
  it("autentica una cuenta registrada y conserva el usuario público", async () => {
    const auth = createAuthService({
      storage: new MemoryStorage(),
      lock: new MemoryLock(),
    });
    auth.initialize();
    await auth.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });

    const result = await auth.login({
      email: "ANA@example.com",
      password: "password1",
    });
    expect(result).toMatchObject({
      ok: true,
      value: { email: "ana@example.com", role: "admin" },
    });
    expect(auth.getCurrentUser()).toMatchObject({
      ok: true,
      value: { email: "ana@example.com" },
    });
  });

  it("devuelve el mismo error genérico para correo inexistente y contraseña incorrecta", async () => {
    const auth = createAuthService({
      storage: new MemoryStorage(),
      lock: new MemoryLock(),
    });
    auth.initialize();
    await auth.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });

    const wrongPassword = await auth.login({
      email: "ana@example.com",
      password: "incorrect1",
    });
    const missingEmail = await auth.login({
      email: "missing@example.com",
      password: "incorrect1",
    });
    expect(wrongPassword).toEqual(missingEmail);
    expect(wrongPassword).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "El correo o la contraseña no son correctos.",
      },
    });
  });

  it("no modifica la sesión tras un error de acceso", async () => {
    const auth = createAuthService({
      storage: new MemoryStorage(),
      lock: new MemoryLock(),
    });
    auth.initialize();
    const result = await auth.login({
      email: "missing@example.com",
      password: "incorrect1",
    });
    expect(result.ok).toBe(false);
    expect(auth.getSession()).toEqual({ ok: true, value: null });
  });
});
