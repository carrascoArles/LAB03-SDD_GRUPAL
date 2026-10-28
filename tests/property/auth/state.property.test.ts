import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  decodeAuthState,
  serializeAuthState,
  toPublicUser,
  type AuthState,
  type UserRecord,
} from "../../../src/auth/model";

const hexSalt = "0123456789abcdef0123456789abcdef";
const hexHash =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

// Requisitos RF-011 y RF-013–RF-016: propiedades de serialización y validación.
describe("propiedades del estado", () => {
  it("la serialización de estados válidos conserva todos los datos", async () => {
    await fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.stringMatching(/^[A-Za-z]{2,50}$/u),
            emailLocal: fc.stringMatching(/^[a-z]{3,10}$/u),
          }),
          { maxLength: 5 },
        ),
        fc.integer(),
        (entries, sessionIndex) => {
          const uniqueEmails = new Set<string>();
          const users: UserRecord[] = [];
          for (const [index, entry] of entries.entries()) {
            const email = `${entry.emailLocal}${index}@example.com`;
            if (uniqueEmails.has(email)) continue;
            uniqueEmails.add(email);
            users.push({
              id: `user-${index}`,
              name: entry.name,
              email,
              role: users.length === 0 ? "admin" : "usuario",
              passwordAlgorithm: "sha256-salt-v1",
              salt: hexSalt,
              passwordHash: hexHash,
            });
          }
          const sessionUserId =
            users.length === 0
              ? null
              : users[Math.abs(sessionIndex) % users.length]?.id ?? null;
          const state: AuthState = {
            schemaVersion: 1,
            users,
            sessionUserId,
          };
          expect(decodeAuthState(serializeAuthState(state))).toEqual({
            ok: true,
            value: state,
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it("datos externos inválidos producen error sin excepción", async () => {
    await fc.assert(
      fc.property(fc.anything(), (value) => {
        expect(() => decodeAuthState(value)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it("los datos incompatibles conservan un aviso de recuperación en español", async () => {
    await fc.assert(
      fc.property(fc.string(), (suffix) => {
        const result = decodeAuthState(`no-json:${suffix}`);
        expect(result).toMatchObject({
          ok: false,
          error: {
            code: "CORRUPT_STORAGE",
            message: "Los datos guardados están dañados.",
          },
        });
      }),
      { numRuns: 100 },
    );
  });

  it("los roles y la referencia de sesión siempre son coherentes", async () => {
    await fc.assert(
      fc.property(
        fc.string().filter((sessionUserId) => sessionUserId !== "valid-user"),
        (sessionUserId) => {
        const state: AuthState = {
          schemaVersion: 1,
          users: [
            {
              id: "valid-user",
              name: "Ana",
              email: "ana@example.com",
              role: "admin",
              passwordAlgorithm: "sha256-salt-v1",
              salt: hexSalt,
              passwordHash: hexHash,
            },
          ],
          sessionUserId,
        };
        expect(decodeAuthState(state).ok).toBe(sessionUserId === "valid-user");
        },
      ),
      { numRuns: 100 },
    );
  });

  it("el modelo público excluye siempre hash y sal", async () => {
    await fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z]{2,50}$/u),
        fc.stringMatching(/^[a-z]{3,10}$/u),
        (name, emailLocal) => {
          const user = toPublicUser({
            id: "user-1",
            name,
            email: `${emailLocal}@example.com`,
            role: "admin",
            passwordAlgorithm: "sha256-salt-v1",
            salt: hexSalt,
            passwordHash: hexHash,
          });
          expect(Object.keys(user).sort()).toEqual([
            "email",
            "id",
            "name",
            "role",
          ]);
        },
      ),
      { numRuns: 100 },
    );
  });
});
