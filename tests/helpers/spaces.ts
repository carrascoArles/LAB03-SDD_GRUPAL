import { err, ok } from "../../src/shared/result";
import type { AuthError, AuthService } from "../../src/auth";
import type { LockError, LockPort } from "../../src/shared/lock-port";
import type { StorageError, StoragePort } from "../../src/shared/storage-port";
import type { User, UserRole } from "../../src/auth/model";

export class MemorySpaceStorage implements StoragePort {
  readonly values = new Map<string, string>();
  failReads = false;
  failWrites = false;

  // Requisito: RF-008 y RF-010; simular lecturas controladas del almacenamiento.
  get(key: string) {
    if (this.failReads) {
      return err({
        code: "STORAGE_READ_FAILED",
        message: "Fallo de lectura simulado.",
      } satisfies StorageError);
    }
    return ok(this.values.get(key) ?? null);
  }

  // Requisito: RF-008 y RF-010; simular escrituras confirmadas o fallidas.
  set(key: string, value: string) {
    if (this.failWrites) {
      return err({
        code: "STORAGE_WRITE_FAILED",
        message: "Fallo de escritura simulado.",
      } satisfies StorageError);
    }
    this.values.set(key, value);
    return ok(undefined);
  }

  // Requisito: RF-008 y RF-010; simular borrados controlados del almacenamiento.
  remove(key: string) {
    if (this.failWrites) {
      return err({
        code: "STORAGE_WRITE_FAILED",
        message: "Fallo de borrado simulado.",
      } satisfies StorageError);
    }
    this.values.delete(key);
    return ok(undefined);
  }
}

export class MemorySpaceLock implements LockPort {
  readonly names: string[] = [];
  private tail: Promise<void> = Promise.resolve();

  // Requisito: RF-003 y RF-010; serializar cambios concurrentes simulados.
  async runExclusive<T>(name: string, operation: () => Promise<T>) {
    this.names.push(name);
    let release!: () => void;
    const previous = this.tail;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return ok(await operation());
    } catch {
      return err({
        code: "LOCK_FAILED",
        message: "Fallo de bloqueo simulado.",
      } satisfies LockError);
    } finally {
      release();
    }
  }
}

// Requisito: RF-003 y RF-009; simular una identidad y rol de sesión.
export function createSpaceAuth(role: UserRole | null): AuthService {
  const user: User | null =
    role === null
      ? null
      : {
          id: "usuario-prueba",
          name: "Usuario de prueba",
          email: "usuario@example.com",
          role,
        };
  const unavailable: AuthError = {
    code: "STORAGE_UNAVAILABLE",
    message: "La sesión no está disponible.",
  };
  return {
    initialize: () => ok(undefined),
    registerUser: async () => err(unavailable),
    login: async () => err(unavailable),
    logout: async () => err(unavailable),
    getCurrentUser: () => ok(user),
    getSession: () => ok(user ? { userId: user.id } : null),
    isAdmin: () => ok(role === "admin"),
  };
}

// Requisito: RF-001–RF-013; crear dependencias deterministas para una prueba.
export function createSpaceTestDependencies(role: UserRole | null = "admin") {
  return {
    storage: new MemorySpaceStorage(),
    lock: new MemorySpaceLock(),
    auth: createSpaceAuth(role),
  };
}
