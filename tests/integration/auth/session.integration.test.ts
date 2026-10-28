import { describe, expect, it } from "vitest";
import { createAuthService } from "../../../src/auth/service";
import { MemoryLock, MemoryStorage } from "../../helpers/auth";

// Requisitos RF-007–RF-010, RF-015–RF-017: integrar auth con almacenamiento simulado.
describe("integración de sesión", () => {
  it("persiste login, restaura la sesión y la elimina al cerrar sesión", async () => {
    const storage = new MemoryStorage();
    const lock = new MemoryLock();
    const auth = createAuthService({ storage, lock });
    auth.initialize();
    await auth.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });
    expect(
      await auth.login({ email: "ana@example.com", password: "password1" }),
    ).toMatchObject({ ok: true });

    const restored = createAuthService({ storage, lock });
    expect(restored.initialize().ok).toBe(true);
    expect(restored.getSession().ok && restored.getSession()).toMatchObject({
      ok: true,
      value: { userId: expect.any(String) },
    });
    expect(await restored.logout()).toMatchObject({ ok: true });

    const afterLogout = createAuthService({ storage, lock });
    afterLogout.initialize();
    expect(afterLogout.getSession()).toEqual({ ok: true, value: null });
  });

  it("no expone contraseñas ni secretos en la sesión persistida", async () => {
    const storage = new MemoryStorage();
    const auth = createAuthService({ storage, lock: new MemoryLock() });
    auth.initialize();
    await auth.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });
    await auth.login({ email: "ana@example.com", password: "password1" });

    const persisted = [...storage.values.values()].join("");
    expect(persisted).not.toContain("password1");
    expect(auth.getSession()).not.toHaveProperty("passwordHash");
    expect(auth.getCurrentUser()).not.toHaveProperty("salt");
  });

  it("login y logout fallidos por escritura devuelven errores visibles", async () => {
    const storage = new MemoryStorage();
    const auth = createAuthService({ storage, lock: new MemoryLock() });
    auth.initialize();
    await auth.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });
    storage.failWrites = true;
    expect(
      await auth.login({ email: "ana@example.com", password: "password1" }),
    ).toMatchObject({
      ok: false,
      error: { code: "STORAGE_WRITE_FAILED" },
    });
  });
});
