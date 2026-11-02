import { err, ok, type Result } from "../shared/result";
import type { AuthService } from "../auth";
import type { LockPort } from "../shared/lock-port";
import type { StoragePort } from "../shared/storage-port";
import {
  type Space,
  type SpaceError,
  type SpaceInput,
  type SpaceService,
  type SpaceState,
} from "./model";
import { decodeSpaceState, serializeSpaceState } from "./state";
import {
  normalizeSpaceName,
  validateSpaceInput,
} from "./validation";

export interface SpaceDependencies {
  readonly storage: StoragePort;
  readonly lock: LockPort;
  readonly auth: AuthService;
}

const storageKey = "reservalocal.spaces.v1";
const lockName = "reservalocal.spaces.v1";

// Requisito: RF-013; conservar códigos de error de almacenamiento.
function storageError(error: {
  readonly code: string;
  readonly message: string;
}): SpaceError {
  if (
    error.code === "STORAGE_UNAVAILABLE" ||
    error.code === "STORAGE_READ_FAILED" ||
    error.code === "STORAGE_WRITE_FAILED"
  ) {
    return { code: error.code, message: error.message };
  }
  return {
    code: "STORAGE_READ_FAILED",
    message: "No se pudieron leer los espacios guardados.",
  };
}

// Requisito: RF-013; obtener el documento validado sin tratar fallos como vacío.
function readState(storage: StoragePort): Result<SpaceState, SpaceError> {
  const stored = storage.get(storageKey);
  if (!stored.ok) return err(storageError(stored.error));
  const decoded = decodeSpaceState(stored.value);
  return decoded.ok
    ? ok(decoded.value)
    : err(decoded.error);
}

// Requisito: RF-009; proteger catálogo y gestión con la sesión vigente.
function requireUser(auth: AuthService): Result<void, SpaceError> {
  const current = auth.getCurrentUser();
  if (!current.ok) {
    return err({
      code: "AUTH_STATE_UNAVAILABLE",
      message: "No se pudo comprobar la sesión actual.",
    });
  }
  if (current.value === null) {
    return err({
      code: "NOT_AUTHENTICATED",
      message: "Debes iniciar sesión para consultar los espacios.",
    });
  }
  return ok(undefined);
}

// Requisito: RF-003; no permitir gestionar espacios sin rol administrador.
function requireAdmin(auth: AuthService): Result<void, SpaceError> {
  const current = auth.getCurrentUser();
  if (!current.ok) {
    return err({
      code: "AUTH_STATE_UNAVAILABLE",
      message: "No se pudo comprobar la sesión o el rol.",
    });
  }
  if (current.value === null) {
    return err({
      code: "NOT_AUTHENTICATED",
      message: "Debes iniciar sesión para gestionar espacios.",
    });
  }
  const admin = auth.isAdmin();
  if (!admin.ok) {
    return err({
      code: "AUTH_STATE_UNAVAILABLE",
      message: "No se pudo comprobar la sesión o el rol.",
    });
  }
  if (!admin.value) {
    return err({
      code: "PERMISSION_DENIED",
      message: "No tienes permiso para gestionar espacios",
    });
  }
  return ok(undefined);
}

// Requisito: RF-013; validar y serializar antes de confirmar la escritura.
function persist(
  storage: StoragePort,
  state: SpaceState,
): Result<void, SpaceError> {
  const saved = storage.set(storageKey, serializeSpaceState(state));
  return saved.ok ? ok(undefined) : err(storageError(saved.error));
}

// Requisitos: RF-001–RF-013; crear el servicio del catálogo con puertos inyectados.
export function createSpaceService(
  dependencies: SpaceDependencies,
): SpaceService {
  let initialized = false;

  // Requisito: RF-013; iniciar solo tras validar persistencia.
  function initialize(): Result<void, SpaceError> {
    const loaded = readState(dependencies.storage);
    initialized = loaded.ok;
    return loaded.ok ? ok(undefined) : err(loaded.error);
  }

  // Requisito: RF-013; impedir consultas antes de inicializar el módulo.
  function readReadyState(): Result<SpaceState, SpaceError> {
    if (!initialized) {
      return err({
        code: "STORAGE_UNAVAILABLE",
        message: "El catálogo de espacios aún no se ha inicializado.",
      });
    }
    return readState(dependencies.storage);
  }

  // Requisito: RF-003; serializar mutaciones bajo el bloqueo compartido.
  async function withLock<T>(
    operation: () => Promise<Result<T, SpaceError>>,
  ): Promise<Result<T, SpaceError>> {
    const locked = await dependencies.lock.runExclusive(lockName, operation);
    if (!locked.ok) {
      return err({
        code: locked.error.code,
        message: "No se pudo coordinar la operación de espacios de forma segura.",
      });
    }
    return locked.value;
  }

  // Requisito: RF-003; crear un espacio activo solo tras confirmar su persistencia.
  async function createSpace(
    input: SpaceInput,
  ): Promise<Result<Space, SpaceError>> {
    const authorized = requireAdmin(dependencies.auth);
    if (!authorized.ok) return err(authorized.error);
    const validated = validateSpaceInput(input);
    if (!validated.ok) return err(validated.error);

    return withLock(async () => {
      const current = readReadyState();
      if (!current.ok) return err(current.error);
      if (
        current.value.spaces.some(
          (space) =>
            normalizeSpaceName(space.name) ===
            normalizeSpaceName(validated.value.name),
        )
      ) {
        return err({
          code: "DUPLICATE_NAME",
          message: "Ya existe un espacio con ese nombre.",
        });
      }

      const randomUUID = globalThis.crypto?.randomUUID;
      if (!randomUUID) {
        return err({
          code: "ID_UNAVAILABLE",
          message: "No se pudo generar un identificador seguro para el espacio.",
        });
      }
      const id = randomUUID.call(globalThis.crypto);
      if (current.value.spaces.some((space) => space.id === id)) {
        return err({
          code: "ID_UNAVAILABLE",
          message: "No se pudo generar un identificador único para el espacio.",
        });
      }
      const space: Space = {
        id,
        ...validated.value,
        active: true,
      };
      const nextState: SpaceState = {
        schemaVersion: 1,
        spaces: [...current.value.spaces, space],
      };
      const saved = persist(dependencies.storage, nextState);
      return saved.ok ? ok(space) : err(saved.error);
    });
  }

  // Requisito: RF-003; editar un espacio conservando id y estado de disponibilidad.
  async function updateSpace(
    id: string,
    input: SpaceInput,
  ): Promise<Result<Space, SpaceError>> {
    const authorized = requireAdmin(dependencies.auth);
    if (!authorized.ok) return err(authorized.error);
    const validated = validateSpaceInput(input);
    if (!validated.ok) return err(validated.error);

    return withLock(async () => {
      const current = readReadyState();
      if (!current.ok) return err(current.error);
      const existing = current.value.spaces.find((space) => space.id === id);
      if (!existing) {
        return err({
          code: "SPACE_NOT_FOUND",
          message: "El espacio que intentas editar no existe.",
        });
      }
      if (
        current.value.spaces.some(
          (space) =>
            space.id !== id &&
            normalizeSpaceName(space.name) ===
              normalizeSpaceName(validated.value.name),
        )
      ) {
        return err({
          code: "DUPLICATE_NAME",
          message: "Ya existe un espacio con ese nombre.",
        });
      }

      const updated: Space = {
        id: existing.id,
        name: validated.value.name,
        type: validated.value.type,
        capacity: validated.value.capacity,
        active: existing.active,
        ...(validated.value.description === undefined
          ? {}
          : { description: validated.value.description }),
      };
      const nextState: SpaceState = {
        schemaVersion: 1,
        spaces: current.value.spaces.map((space) =>
          space.id === id ? updated : space,
        ),
      };
      const saved = persist(dependencies.storage, nextState);
      return saved.ok ? ok(updated) : err(saved.error);
    });
  }

  // Requisito: RF-003; desactivar sin borrar ni alterar otros datos del espacio.
  async function deactivateSpace(id: string): Promise<Result<Space, SpaceError>> {
    const authorized = requireAdmin(dependencies.auth);
    if (!authorized.ok) return err(authorized.error);

    return withLock(async () => {
      const current = readReadyState();
      if (!current.ok) return err(current.error);
      const existing = current.value.spaces.find((space) => space.id === id);
      if (!existing) {
        return err({
          code: "SPACE_NOT_FOUND",
          message: "El espacio que intentas desactivar no existe.",
        });
      }
      const deactivated: Space = { ...existing, active: false };
      const nextState: SpaceState = {
        schemaVersion: 1,
        spaces: current.value.spaces.map((space) =>
          space.id === id ? deactivated : space,
        ),
      };
      const saved = persist(dependencies.storage, nextState);
      return saved.ok ? ok(deactivated) : err(saved.error);
    });
  }

  // Requisito: RF-001; listar solo espacios activos para cualquier usuario autenticado.
  function listActiveSpaces(): Result<readonly Space[], SpaceError> {
    const authorized = requireUser(dependencies.auth);
    if (!authorized.ok) return err(authorized.error);
    const current = readReadyState();
    return current.ok
      ? ok(current.value.spaces.filter((space) => space.active))
      : err(current.error);
  }

  // Requisito: RF-003; permitir al administrador consultar también inactivos.
  function listManagedSpaces(): Result<readonly Space[], SpaceError> {
    const authorized = requireAdmin(dependencies.auth);
    if (!authorized.ok) return err(authorized.error);
    const current = readReadyState();
    return current.ok ? ok(current.value.spaces) : err(current.error);
  }

  // Requisito: RF-002; no exponer espacios inactivos como opciones consultables.
  function getActiveSpace(id: string): Result<Space, SpaceError> {
    const authorized = requireUser(dependencies.auth);
    if (!authorized.ok) return err(authorized.error);
    const current = readReadyState();
    if (!current.ok) return err(current.error);
    const space = current.value.spaces.find(
      (candidate) => candidate.id === id && candidate.active,
    );
    return space
      ? ok(space)
      : err({
          code: "SPACE_NOT_FOUND",
          message: "El espacio no existe o no está disponible.",
        });
  }

  // Requisito: RF-010; consultar disponibilidad sin ocultar fallos de persistencia.
  function existeYEstaActivo(id: string): Result<boolean, SpaceError> {
    const current = readReadyState();
    if (!current.ok) return err(current.error);
    return ok(
      current.value.spaces.some(
        (space) => space.id === id && space.active,
      ),
    );
  }

  return {
    initialize,
    createSpace,
    updateSpace,
    deactivateSpace,
    listActiveSpaces,
    listManagedSpaces,
    getActiveSpace,
    existeYEstaActivo,
  };
}
