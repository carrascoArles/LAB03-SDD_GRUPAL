import { describe, expect, it } from "vitest";
import { createAuthService } from "../../../src/auth/service";
import { MemoryLock, MemoryStorage } from "../../helpers/auth";

// Requisitos RF-009–RF-012: sesión persistente y consultas de identidad/rol.
describe("sesión", () => {
  it("cierra sesión y devuelve estado anónimo", async () => {
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
    await auth.login({ email: "ana@example.com", password: "password1" });

    expect(auth.getSession()).toMatchObject({ ok: true, value: { userId: expect.any(String) } });
    expect(await auth.logout()).toEqual({ ok: true, value: undefined });
    expect(auth.getSession()).toEqual({ ok: true, value: null });
    expect(auth.getCurrentUser()).toEqual({ ok: true, value: null });
    expect(auth.isAdmin()).toEqual({ ok: true, value: false });
  });

  it("no declara éxito al cerrar sesión si no puede guardar", async () => {
    const storage = new MemoryStorage();
    const auth = createAuthService({ storage, lock: new MemoryLock() });
    auth.initialize();
    await auth.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });
    await auth.login({ email: "ana@example.com", password: "password1" });
    storage.failWrites = true;

    const result = await auth.logout();
    expect(result).toMatchObject({
      ok: false,
      error: { code: "STORAGE_WRITE_FAILED" },
    });
    expect(auth.getCurrentUser()).toMatchObject({
      ok: true,
      value: { email: "ana@example.com" },
    });
  });

  it("restaura usuario y sesión tras reinicializar el servicio", async () => {
    const storage = new MemoryStorage();
    const lock = new MemoryLock();
    const first = createAuthService({ storage, lock });
    first.initialize();
    await first.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });
    await first.login({ email: "ana@example.com", password: "password1" });

    const restored = createAuthService({ storage, lock });
    expect(restored.initialize().ok).toBe(true);
    expect(restored.getCurrentUser()).toMatchObject({
      ok: true,
      value: { email: "ana@example.com" },
    });
  });
});
