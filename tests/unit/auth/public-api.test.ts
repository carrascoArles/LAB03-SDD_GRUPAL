import { describe, expect, it } from "vitest";
import readme from "../../../README.md?raw";
import { createAuthService } from "../../../src/auth/service";
import { MemoryLock, MemoryStorage } from "../../helpers/auth";

// Requisitos RF-011–RF-018: identidad pública, rol, errores y recuperación.
describe("API pública y recuperación", () => {
  it("inicia sin cuenta ante estado corrupto y devuelve aviso recuperable", () => {
    const storage = new MemoryStorage();
    storage.values.set("reservalocal.auth.v1", "{invalid");
    const auth = createAuthService({ storage, lock: new MemoryLock() });

    expect(auth.initialize()).toMatchObject({
      ok: false,
      error: { code: "CORRUPT_STORAGE" },
    });
    expect(auth.getCurrentUser()).toEqual({ ok: true, value: null });
    expect(auth.getSession()).toEqual({ ok: true, value: null });
    expect(auth.isAdmin()).toEqual({ ok: true, value: false });
  });

  it("expone identidad pública y detecta si es admin", async () => {
    const auth = createAuthService({
      storage: new MemoryStorage(),
      lock: new MemoryLock(),
    });
    auth.initialize();
    const registered = await auth.registerUser({
      name: "Ana",
      email: "ana@example.com",
      password: "password1",
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) return;
    await auth.login({ email: registered.value.email, password: "password1" });

    const current = auth.getCurrentUser();
    expect(current).toMatchObject({
      ok: true,
      value: { id: registered.value.id, role: "admin" },
    });
    expect(JSON.stringify(current)).not.toMatch(/salt|passwordHash|password/iu);
    expect(auth.getSession()).toMatchObject({
      ok: true,
      value: { userId: registered.value.id },
    });
    expect(auth.isAdmin()).toEqual({ ok: true, value: true });
  });

  it("no inicializa usuario falso si el almacenamiento no se puede leer", () => {
    const storage = new MemoryStorage();
    storage.failReads = true;
    const auth = createAuthService({ storage, lock: new MemoryLock() });
    expect(auth.initialize()).toMatchObject({
      ok: false,
      error: { code: "STORAGE_READ_FAILED" },
    });
    expect(auth.getCurrentUser()).toEqual({ ok: true, value: null });
  });

  it("no devuelve resultados exitosos para métodos previos a inicializar", () => {
    const auth = createAuthService({
      storage: new MemoryStorage(),
      lock: new MemoryLock(),
    });
    expect(auth.getCurrentUser().ok).toBe(false);
    expect(auth.isAdmin().ok).toBe(false);
  });

  it("documenta que la autenticación local es didáctica", () => {
    expect(readme).toContain("son didácticos");
    expect(readme).toMatch(/no\s+reemplaza/u);
  });
});
