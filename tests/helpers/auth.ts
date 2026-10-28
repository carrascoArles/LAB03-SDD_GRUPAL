import { err, ok } from "../../src/shared/result";
import type { LockError, LockPort } from "../../src/shared/lock-port";
import type { StorageError, StoragePort } from "../../src/shared/storage-port";

export class MemoryStorage implements StoragePort {
  readonly values = new Map<string, string>();
  failWrites = false;
  failReads = false;

  // Requisitos: RF-013 y RF-016; simular lecturas controladas del almacenamiento.
  get(key: string) {
    if (this.failReads) {
      return err({
        code: "STORAGE_READ_FAILED",
        message: "Fallo de lectura simulado.",
      } satisfies StorageError);
    }
    return ok(this.values.get(key) ?? null);
  }

  // Requisito: RF-016; simular escritura confirmada o fallida.
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

  // Requisito: RF-009; simular la eliminación de almacenamiento.
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

export class MemoryLock implements LockPort {
  private tail: Promise<void> = Promise.resolve();

  // Requisito: RF-006; serializar cambios concurrentes en pruebas.
  async runExclusive<T>(
    _name: string,
    operation: () => Promise<T>,
  ) {
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
