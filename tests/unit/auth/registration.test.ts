import { describe, expect, it } from "vitest";
import { createAuthService } from "../../../src/auth/service";
import { MemoryLock, MemoryStorage } from "../../helpers/auth";

// Requisitos RF-001–RF-006 y RF-015–RF-017: registro, roles, privacidad y errores.
describe("registro de cuenta", () => {
  it("asigna admin a la primera cuenta y usuario a las siguientes", async () => {
    const auth = createAuthService({
      storage: new MemoryStorage(),
      lock: new MemoryLock(),
    });
    expect(auth.initialize().ok).toBe(true);

    const first = await auth.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });
    const second = await auth.registerUser({
      name: "Luis",
      email: "luis@example.com",
      password: "password2",
    });

    expect(first.ok && first.value.role).toBe("admin");
    expect(second.ok && second.value.role).toBe("usuario");
  });

  it("rechaza correos duplicados sin distinguir mayúsculas", async () => {
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

    const result = await auth.registerUser({
      name: "Otra",
      email: "ANA@EXAMPLE.COM",
      password: "password2",
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("EMAIL_ALREADY_USED");
  });

  it("no persiste contraseñas ni devuelve sal o hash en User", async () => {
    const storage = new MemoryStorage();
    const auth = createAuthService({ storage, lock: new MemoryLock() });
    auth.initialize();
    const result = await auth.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });

    expect(result.ok).toBe(true);
    expect(JSON.stringify([...storage.values.values()])).not.toContain("password1");
    expect(JSON.stringify(result)).not.toContain("passwordHash");
    expect(JSON.stringify(result)).not.toContain("salt");
  });

  it("no declara éxito si la persistencia falla", async () => {
    const storage = new MemoryStorage();
    const auth = createAuthService({ storage, lock: new MemoryLock() });
    auth.initialize();
    storage.failWrites = true;
    const result = await auth.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("STORAGE_WRITE_FAILED");
  });

  it("no lanza ante datos de registro inválidos", async () => {
    const auth = createAuthService({
      storage: new MemoryStorage(),
      lock: new MemoryLock(),
    });
    auth.initialize();
    await expect(
      auth.registerUser({
        name: "",
        email: "invalid",
        password: "short",
      }),
    ).resolves.toMatchObject({ ok: false });
  });
});
