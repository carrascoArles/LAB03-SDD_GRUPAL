import { err, ok, type Result } from "../shared/result";

export type UserRole = "usuario" | "admin";

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
}

export interface UserRecord extends User {
  readonly passwordAlgorithm: "sha256-salt-v1";
  readonly salt: string;
  readonly passwordHash: string;
}

export interface Session {
  readonly userId: string;
}

export interface AuthState {
  readonly schemaVersion: 1;
  readonly users: readonly UserRecord[];
  readonly sessionUserId: string | null;
}

export type AuthStateError = {
  readonly code: "CORRUPT_STORAGE";
  readonly message: string;
};

const stateKeys = new Set(["schemaVersion", "users", "sessionUserId"]);
const recordKeys = new Set([
  "id",
  "name",
  "email",
  "role",
  "passwordAlgorithm",
  "salt",
  "passwordHash",
]);
const hexSaltPattern = /^[0-9a-f]{32}$/u;
const hexHashPattern = /^[0-9a-f]{64}$/u;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

// Requisito: RF-013; comprobar objetos externos sin usar casts como validación.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Requisito: RF-013; rechazar campos desconocidos en datos persistidos.
function hasOnlyKeys(
  value: Record<string, unknown>,
  keys: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => keys.has(key));
}

// Requisitos: RF-004 y RF-013; validar una cuenta privada recuperada.
function isUserRecord(value: unknown): value is UserRecord {
  if (!isRecord(value) || !hasOnlyKeys(value, recordKeys)) return false;

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    Array.from(value.name).length >= 2 &&
    Array.from(value.name).length <= 50 &&
    value.name === value.name.trim() &&
    typeof value.email === "string" &&
    value.email.length <= 254 &&
    value.email === value.email.toLowerCase() &&
    emailPattern.test(value.email) &&
    typeof value.role === "string" &&
    (value.role === "admin" || value.role === "usuario") &&
    value.passwordAlgorithm === "sha256-salt-v1" &&
    typeof value.salt === "string" &&
    hexSaltPattern.test(value.salt) &&
    typeof value.passwordHash === "string" &&
    hexHashPattern.test(value.passwordHash)
  );
}

// Requisito: RF-013; decodificar y validar datos JSON del almacenamiento.
export function decodeAuthState(input: unknown): Result<AuthState, AuthStateError> {
  let value: unknown = input;

  if (typeof input === "string") {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      return err({
        code: "CORRUPT_STORAGE",
        message: "Los datos guardados están dañados.",
      });
    }
  }

  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, stateKeys) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.users) ||
    !(typeof value.sessionUserId === "string" || value.sessionUserId === null)
  ) {
    return err({
      code: "CORRUPT_STORAGE",
      message: "Los datos guardados no tienen un formato válido.",
    });
  }

  const users: UserRecord[] = [];
  for (const candidate of value.users) {
    if (!isUserRecord(candidate)) {
      return err({
        code: "CORRUPT_STORAGE",
        message: "Una de las cuentas guardadas no es válida.",
      });
    }
    users.push(candidate);
  }

  const ids = new Set(users.map((user) => user.id));
  const emails = new Set(users.map((user) => user.email));
  const rolesAreValid =
    users.length === 0 ||
    (users[0]?.role === "admin" &&
      users.slice(1).every((user) => user.role === "usuario"));

  if (
    ids.size !== users.length ||
    emails.size !== users.length ||
    !rolesAreValid ||
    (value.sessionUserId !== null && !ids.has(value.sessionUserId))
  ) {
    return err({
      code: "CORRUPT_STORAGE",
      message: "Las cuentas o la sesión guardadas no son coherentes.",
    });
  }

  return ok({
    schemaVersion: 1,
    users,
    sessionUserId: value.sessionUserId,
  });
}

// Requisito: RF-015; serializar únicamente hashes, nunca contraseñas originales.
export function serializeAuthState(state: AuthState): string {
  return JSON.stringify(state);
}

// Requisito: RF-011; proyectar una cuenta pública sin datos de credenciales.
export function toPublicUser(record: UserRecord): User {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
  };
}

// Requisito: RF-016; construir un estado inicial sin sesión ni cuentas.
export function emptyAuthState(): AuthState {
  return {
    schemaVersion: 1,
    users: [],
    sessionUserId: null,
  };
}
