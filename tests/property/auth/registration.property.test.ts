import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createAuthService } from "../../../src/auth/service";
import { validateName } from "../../../src/auth/validation";
import { hashPassword } from "../../../src/auth/password";
import { MemoryLock, MemoryStorage } from "../../helpers/auth";

// Requisitos RF-002–RF-006, RF-015–RF-017: propiedades de datos de cuenta.
describe("propiedades de registro", () => {
  it("rechaza entradas de nombre inválidas sin lanzar", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ maxLength: 1 }), async (name) => {
        const result = validateName(name);
        expect(result.ok).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it("rechaza registros duplicados aunque cambien mayúsculas", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          const auth = createAuthService({
            storage: new MemoryStorage(),
            lock: new MemoryLock(),
          });
          auth.initialize();
          const first = await auth.registerUser({
            name: "Primera Cuenta",
            email,
            password: "password1",
          });
          expect(first.ok).toBe(true);
          if (!first.ok) return;

          const duplicate = await auth.registerUser({
            name: "Cuenta Duplicada",
            email: email.toUpperCase(),
            password: "password2",
          });
          expect(duplicate).toMatchObject({
            ok: false,
            error: { code: "EMAIL_ALREADY_USED" },
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it("el hash persistible nunca es la contraseña original", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 64 }),
        async (password) => {
          const result = await hashPassword(password);
          expect(result.ok).toBe(true);
          if (result.ok) expect(result.value.passwordHash).not.toBe(password);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("registros inválidos siempre son errores, nunca excepciones", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 1 }),
        fc.string(),
        async (name, email) => {
          const auth = createAuthService({
            storage: new MemoryStorage(),
            lock: new MemoryLock(),
          });
          auth.initialize();
          const result = await auth.registerUser({
            name,
            email,
            password: "password1",
          });
          expect(result.ok).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("solo la primera cuenta registrada recibe el rol admin", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[a-z]{3,8}$/u),
        async (localPart) => {
          const auth = createAuthService({
            storage: new MemoryStorage(),
            lock: new MemoryLock(),
          });
          auth.initialize();
          const first = await auth.registerUser({
            name: "Primera Cuenta",
            email: `${localPart}1@example.com`,
            password: "password1",
          });
          const second = await auth.registerUser({
            name: "Segunda Cuenta",
            email: `${localPart}2@example.com`,
            password: "password2",
          });
          expect(first.ok && first.value.role).toBe("admin");
          expect(second.ok && second.value.role).toBe("usuario");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("los errores de validación son mensajes en español", async () => {
    await fc.assert(
      fc.property(fc.string({ maxLength: 1 }), (name) => {
        const result = validateName(name);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error.message).toContain("El nombre");
      }),
      { numRuns: 100 },
    );
  });
});
