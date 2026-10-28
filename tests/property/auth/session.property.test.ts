import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createAuthService } from "../../../src/auth/service";
import { MemoryLock, MemoryStorage } from "../../helpers/auth";

// Requisitos RF-007–RF-010, RF-015–RF-017: propiedades del acceso y la sesión.
describe("propiedades de sesión", () => {
  it("el mensaje no distingue correo inexistente de contraseña incorrecta", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress().filter((email) => email.toLowerCase() !== "ana@example.com"),
        async (email) => {
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
            email,
            password: "incorrect1",
          });
          expect(wrongPassword).toEqual(missingEmail);
          expect(missingEmail).toEqual({
            ok: false,
            error: {
              code: "INVALID_CREDENTIALS",
              message: "El correo o la contraseña no son correctos.",
            },
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it("una entrada de acceso inválida devuelve error sin excepción", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ maxLength: 3 }), async (password) => {
        const auth = createAuthService({
          storage: new MemoryStorage(),
          lock: new MemoryLock(),
        });
        auth.initialize();
        await expect(
          auth.login({ email: "ana@example.com", password }),
        ).resolves.toMatchObject({ ok: false });
      }),
      { numRuns: 100 },
    );
  });

  it("los datos públicos no filtran secretos y logout no restaura la sesión", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 64 }),
        async (password) => {
          const storage = new MemoryStorage();
          const lock = new MemoryLock();
          const auth = createAuthService({ storage, lock });
          auth.initialize();
          const registered = await auth.registerUser({
            name: "Ana",
            email: "ana@example.com",
            password,
          });
          expect(registered.ok).toBe(true);
          if (!registered.ok) return;
          const loggedIn = await auth.login({
            email: "ana@example.com",
            password,
          });
          expect(loggedIn.ok).toBe(true);
          expect(JSON.stringify(loggedIn)).not.toMatch(
            /passwordHash|salt|passwordAlgorithm/iu,
          );
          expect(await auth.logout()).toEqual({ ok: true, value: undefined });

          const restored = createAuthService({ storage, lock });
          expect(restored.initialize().ok).toBe(true);
          expect(restored.getSession()).toEqual({ ok: true, value: null });
        },
      ),
      { numRuns: 100 },
    );
  });
});
