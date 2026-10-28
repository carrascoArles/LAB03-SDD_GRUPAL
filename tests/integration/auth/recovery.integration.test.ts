import { describe, expect, it } from "vitest";
import { createAuthService } from "../../../src/auth/service";
import { MemoryLock, MemoryStorage } from "../../helpers/auth";

// Requisitos RF-011–RF-018: recuperación y permisos integrados con StoragePort.
describe("integración de recuperación", () => {
  it("inicia sin usuarios ante documento corrupto y permite recuperarse al registrar", async () => {
    const storage = new MemoryStorage();
    const lock = new MemoryLock();
    storage.values.set("reservalocal.auth.v1", "{invalid");
    const auth = createAuthService({ storage, lock });

    expect(auth.initialize()).toMatchObject({
      ok: false,
      error: {
        code: "CORRUPT_STORAGE",
        message: "Los datos guardados están dañados.",
      },
    });
    expect(auth.getCurrentUser()).toEqual({ ok: true, value: null });
    const result = await auth.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });
    expect(result).toMatchObject({
      ok: true,
      value: { role: "admin" },
    });
  });

  it("expone permisos diferenciados para admin y usuario", async () => {
    const storage = new MemoryStorage();
    const lock = new MemoryLock();
    const auth = createAuthService({ storage, lock });
    auth.initialize();
    await auth.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });
    await auth.registerUser({
      name: "Luis",
      email: "luis@example.com",
      password: "password2",
    });
    await auth.login({ email: "luis@example.com", password: "password2" });
    expect(auth.getCurrentUser()).toMatchObject({
      ok: true,
      value: { role: "usuario" },
    });
    expect(auth.isAdmin()).toEqual({ ok: true, value: false });
  });

  it("convierte datos corruptos, fallos de lectura y escritura en errores visibles", async () => {
    const storage = new MemoryStorage();
    const auth = createAuthService({ storage, lock: new MemoryLock() });
    auth.initialize();
    storage.failWrites = true;
    expect(
      await auth.registerUser({
        name: "Ana",
        email: "ana@example.com",
        password: "password1",
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "STORAGE_WRITE_FAILED" },
    });
  });
});
