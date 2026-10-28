import { describe, expect, it } from "vitest";
import { createAuthService } from "../../../src/auth/service";
import { MemoryLock, MemoryStorage } from "../../helpers/auth";

// Requisitos RF-001–RF-006 y RF-015–RF-017: integración usando puertos simulados.
describe("integración de registro", () => {
  it("serializa dos registros concurrentes y crea un solo admin", async () => {
    const storage = new MemoryStorage();
    const auth = createAuthService({ storage, lock: new MemoryLock() });
    auth.initialize();

    const [first, second] = await Promise.all([
      auth.registerUser({
        name: "Ana",
        email: "ana@example.com",
        password: "password1",
      }),
      auth.registerUser({
        name: "Luis",
        email: "luis@example.com",
        password: "password2",
      }),
    ]);

    expect(first.ok && first.value.role).toBe("admin");
    expect(second.ok && second.value.role).toBe("usuario");
  });

  it("rechaza duplicados sin modificar el registro persistido", async () => {
    const storage = new MemoryStorage();
    const auth = createAuthService({ storage, lock: new MemoryLock() });
    auth.initialize();
    await auth.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });
    const before = [...storage.values.values()];

    const result = await auth.registerUser({
      name: "Otra",
      email: "ANA@example.com",
      password: "password2",
    });

    expect(result.ok).toBe(false);
    expect([...storage.values.values()]).toEqual(before);
  });

  it("mapea errores de escritura a Result", async () => {
    const storage = new MemoryStorage();
    const auth = createAuthService({ storage, lock: new MemoryLock() });
    auth.initialize();
    storage.failWrites = true;
    const result = await auth.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });
    expect(result).toMatchObject({
      ok: false,
      error: { code: "STORAGE_WRITE_FAILED" },
    });
  });
});
