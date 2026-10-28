import { decodeAuthState, emptyAuthState, serializeAuthState, toPublicUser } from "./model";
import type { AuthState, Session, User, UserRecord } from "./model";
import { sessionFromState, withSessionUser } from "./session";
import { generateUserId, hashPassword, verifyPassword } from "./password";
import { validateEmail, validateName, validatePassword } from "./validation";
import type { LockPort } from "../shared/lock-port";
import type { StoragePort } from "../shared/storage-port";
import { err, ok, type Result } from "../shared/result";

export type AuthErrorCode =
  | "INVALID_NAME"
  | "INVALID_EMAIL"
  | "INVALID_PASSWORD"
  | "EMAIL_ALREADY_USED"
  | "INVALID_CREDENTIALS"
  | "CORRUPT_STORAGE"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "LOCK_UNAVAILABLE"
  | "CRYPTO_UNAVAILABLE";

export interface AuthError {
  readonly code: AuthErrorCode;
  readonly message: string;
}

export interface RegisterInput {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

export interface AuthService {
  initialize(): Result<void, AuthError>;
  registerUser(input: RegisterInput): Promise<Result<User, AuthError>>;
  login(input: LoginInput): Promise<Result<User, AuthError>>;
  logout(): Promise<Result<void, AuthError>>;
  getCurrentUser(): Result<User | null, AuthError>;
  getSession(): Result<Session | null, AuthError>;
  isAdmin(): Result<boolean, AuthError>;
}

export interface AuthDependencies {
  readonly storage: StoragePort;
  readonly lock: LockPort;
}

const storageKey = "reservalocal.auth.v1";
const lockName = "reservalocal.auth.write";
const genericCredentialsMessage = "El correo o la contraseña no son correctos.";

// Requisito: RF-016; convertir errores de almacenamiento al contrato de auth.
function mapStorageError(error: {
  readonly code: string;
  readonly message: string;
}): AuthError {
  if (
    error.code === "STORAGE_UNAVAILABLE" ||
    error.code === "STORAGE_READ_FAILED" ||
    error.code === "STORAGE_WRITE_FAILED"
  ) {
    return {
      code: error.code,
      message: error.message,
    };
  }
  return {
    code: "STORAGE_READ_FAILED",
    message: "No se pudieron leer los datos guardados.",
  };
}

// Requisito: RF-016; construir errores de dominio en español.
function authError(code: AuthErrorCode, message: string): AuthError {
  return { code, message };
}

// Requisito: RF-016; validar el contenedor externo antes de leer campos.
function isInputRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Requisitos: RF-013 y RF-016; leer y decodificar estado local no confiable.
function readState(
  storage: StoragePort,
): Result<AuthState, AuthError> {
  const stored = storage.get(storageKey);
  if (!stored.ok) return err(mapStorageError(stored.error));
  if (stored.value === null) return ok(emptyAuthState());

  const decoded = decodeAuthState(stored.value);
  return decoded.ok
    ? ok(decoded.value)
    : err(authError("CORRUPT_STORAGE", decoded.error.message));
}

// Requisito: RF-016; publicar una cuenta sin información privada de credenciales.
function publicRecord(record: UserRecord): User {
  return toPublicUser(record);
}

// Requisitos: RF-001–RF-018; crear el servicio con dependencias explícitas.
export function createAuthService(
  dependencies: AuthDependencies,
): AuthService {
  let state = emptyAuthState();
  let initialized = false;

  // Requisitos: RF-013 y RF-014; iniciar de forma recuperable ante datos corruptos.
  function initialize(): Result<void, AuthError> {
    const loaded = readState(dependencies.storage);
    initialized = true;

    if (!loaded.ok && loaded.error.code === "CORRUPT_STORAGE") {
      state = emptyAuthState();
      return loaded;
    }

    if (!loaded.ok) {
      state = emptyAuthState();
      return err(loaded.error);
    }

    state = loaded.value;
    return ok(undefined);
  }

  // Requisitos: RF-001–RF-006; crear una cuenta y asignar el primer rol.
  async function registerUser(
    input: RegisterInput,
  ): Promise<Result<User, AuthError>> {
    if (!isInputRecord(input)) {
      return err(authError("INVALID_NAME", "Completa los datos de registro."));
    }
    const name = validateName(input.name);
    if (!name.ok) return err(name.error);
    const email = validateEmail(input.email);
    if (!email.ok) return err(email.error);
    const password = validatePassword(input.password);
    if (!password.ok) return err(password.error);

    const credential = await hashPassword(password.value);
    if (!credential.ok) {
      return err(authError("CRYPTO_UNAVAILABLE", credential.error.message));
    }
    const id = generateUserId();
    if (!id.ok) return err(authError("CRYPTO_UNAVAILABLE", id.error.message));

    const locked = await dependencies.lock.runExclusive(lockName, async () => {
      const current = readState(dependencies.storage);
      let latestState: AuthState;
      if (!current.ok) {
        if (current.error.code !== "CORRUPT_STORAGE") {
          return err(current.error);
        }
        latestState = emptyAuthState();
      } else {
        latestState = current.value;
      }

      if (latestState.users.some((user) => user.email === email.value)) {
        return err(
          authError(
            "EMAIL_ALREADY_USED",
            "Ya existe una cuenta con ese correo electrónico.",
          ),
        );
      }

      const record: UserRecord = {
        id: id.value,
        name: name.value,
        email: email.value,
        role: latestState.users.length === 0 ? "admin" : "usuario",
        ...credential.value,
      };
      const nextState: AuthState = {
        schemaVersion: 1,
        users: [...latestState.users, record],
        sessionUserId: latestState.sessionUserId,
      };
      const saved = dependencies.storage.set(
        storageKey,
        serializeAuthState(nextState),
      );
      if (!saved.ok) return err(mapStorageError(saved.error));

      state = nextState;
      return ok(publicRecord(record));
    });

    if (!locked.ok) {
      return err(
        authError(
          "LOCK_UNAVAILABLE",
          locked.error.message,
        ),
      );
    }
    return locked.value;
  }

  // Requisitos: RF-007 y RF-008; verificar credenciales con error indistinguible.
  async function login(input: LoginInput): Promise<Result<User, AuthError>> {
    if (!isInputRecord(input)) {
      return err(
        authError("INVALID_CREDENTIALS", genericCredentialsMessage),
      );
    }
    const email = validateEmail(input.email);
    const password = validatePassword(input.password);
    if (!email.ok || !password.ok) {
      return err(
        authError("INVALID_CREDENTIALS", genericCredentialsMessage),
      );
    }

    const locked = await dependencies.lock.runExclusive(lockName, async () => {
      const loaded = readState(dependencies.storage);
      if (!loaded.ok) return err(loaded.error);
      const user = loaded.value.users.find(
        (candidate) => candidate.email === email.value,
      );
      if (!user) {
        return err(
          authError("INVALID_CREDENTIALS", genericCredentialsMessage),
        );
      }

      const verified = await verifyPassword(password.value, user);
      if (!verified.ok) {
        return err(
          authError("CRYPTO_UNAVAILABLE", verified.error.message),
        );
      }
      if (!verified.value) {
        return err(
          authError("INVALID_CREDENTIALS", genericCredentialsMessage),
        );
      }

      const nextState = withSessionUser(loaded.value, user.id);
      const saved = dependencies.storage.set(
        storageKey,
        serializeAuthState(nextState),
      );
      if (!saved.ok) return err(mapStorageError(saved.error));

      state = nextState;
      return ok(publicRecord(user));
    });

    if (!locked.ok) {
      return err(
        authError(
          "LOCK_UNAVAILABLE",
          locked.error.message,
        ),
      );
    }
    return locked.value;
  }

  // Requisito: RF-009; persistir el cierre de sesión antes de declararlo exitoso.
  async function logout(): Promise<Result<void, AuthError>> {
    const locked = await dependencies.lock.runExclusive(lockName, async () => {
      const loaded = readState(dependencies.storage);
      if (!loaded.ok) return err(loaded.error);
      const nextState = withSessionUser(loaded.value, null);
      const saved = dependencies.storage.set(
        storageKey,
        serializeAuthState(nextState),
      );
      if (!saved.ok) return err(mapStorageError(saved.error));
      state = nextState;
      return ok(undefined);
    });

    if (!locked.ok) {
      return err(
        authError(
          "LOCK_UNAVAILABLE",
          locked.error.message,
        ),
      );
    }
    return locked.value;
  }

  // Requisito: RF-011; consultar User público sin exponer el registro privado.
  function getCurrentUser(): Result<User | null, AuthError> {
    if (!initialized) {
      return err(
        authError("STORAGE_UNAVAILABLE", "La sesión aún no se ha inicializado."),
      );
    }
    const current = state.users.find(
      (user) => user.id === state.sessionUserId,
    );
    return ok(current ? publicRecord(current) : null);
  }

  // Requisito: RF-012; consultar la sesión actual o el estado anónimo.
  function getSession(): Result<Session | null, AuthError> {
    if (!initialized) {
      return err(
        authError("STORAGE_UNAVAILABLE", "La sesión aún no se ha inicializado."),
      );
    }
    return ok(sessionFromState(state));
  }

  // Requisito: RF-012; reconocer admin únicamente desde una sesión validada.
  function isAdmin(): Result<boolean, AuthError> {
    const user = getCurrentUser();
    if (!user.ok) return user;
    return ok(user.value?.role === "admin");
  }

  return {
    initialize,
    registerUser,
    login,
    logout,
    getCurrentUser,
    getSession,
    isAdmin,
  };
}
