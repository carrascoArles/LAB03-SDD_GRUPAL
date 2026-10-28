import { err, ok } from "./result";
import type { Result } from "./result";
import type { StorageError, StoragePort } from "./storage-port";

const unavailable: StorageError = {
  code: "STORAGE_UNAVAILABLE",
  message: "El almacenamiento local no está disponible.",
};

// Requisito: RF-013; obtener localStorage sin filtrar errores del navegador.
function getStorage(): Result<Storage, StorageError> {
  try {
    if (typeof globalThis.localStorage === "undefined") {
      return err(unavailable);
    }

    return ok(globalThis.localStorage);
  } catch {
    return err(unavailable);
  }
}

export const localStoragePort: StoragePort = {
  // Requisito: RF-013; leer datos externos sin lanzar excepciones.
  get(key) {
    const storage = getStorage();
    if (!storage.ok) return storage;

    try {
      return ok(storage.value.getItem(key));
    } catch {
      return err({
        code: "STORAGE_READ_FAILED",
        message: "No se pudieron leer los datos guardados.",
      });
    }
  },

  // Requisito: RF-015; comunicar errores de cuota sin simular persistencia.
  set(key, value) {
    const storage = getStorage();
    if (!storage.ok) return storage;

    try {
      storage.value.setItem(key, value);
      return ok(undefined);
    } catch {
      return err({
        code: "STORAGE_WRITE_FAILED",
        message: "No se pudieron guardar los datos. Comprueba el espacio disponible.",
      });
    }
  },

  // Requisito: RF-009; propagar errores al cerrar sesión.
  remove(key) {
    const storage = getStorage();
    if (!storage.ok) return storage;

    try {
      storage.value.removeItem(key);
      return ok(undefined);
    } catch {
      return err({
        code: "STORAGE_WRITE_FAILED",
        message: "No se pudieron actualizar los datos guardados.",
      });
    }
  },
};
