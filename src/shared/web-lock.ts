import { err, ok } from "./result";
import type { LockPort } from "./lock-port";

export const webLockPort: LockPort = {
  // Requisito: RF-006; serializar registros entre pestañas del mismo origen.
  async runExclusive<T>(name: string, operation: () => Promise<T>) {
    if (
      typeof navigator === "undefined" ||
      typeof navigator.locks === "undefined"
    ) {
      return err({
        code: "LOCK_UNAVAILABLE" as const,
        message: "Este navegador no permite completar la operación de forma segura.",
      });
    }

    try {
      const value = await navigator.locks.request(
        name,
        { mode: "exclusive" },
        operation,
      );
      return ok(value);
    } catch {
      return err({
        code: "LOCK_FAILED" as const,
        message: "No se pudo coordinar la operación entre pestañas.",
      });
    }
  },
};
