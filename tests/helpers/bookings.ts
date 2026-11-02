import { err, ok, type Result } from "../../src/shared/result";
import type { AuthError, AuthService, User } from "../../src/auth";
import type { LockError, LockPort } from "../../src/shared/lock-port";
import type { StorageError, StoragePort } from "../../src/shared/storage-port";
import type { SpaceError } from "../../src/spaces";
import { createBookingService } from "../../src/bookings/service";
import type { BookingDependencies } from "../../src/bookings/service";
import type {
  Booking,
  BookingError,
  BookingService,
  BookingState,
  LocalDateTime,
} from "../../src/bookings/model";
import { BOOKINGS_STORAGE_KEY } from "../../src/bookings/repository";
import { serializeBookingState } from "../../src/bookings/state";

export class MemoryBookingStorage implements StoragePort {
  readonly values = new Map<string, string>();
  failReads = false;
  /** Claves cuya escritura falla; `"*"` hace fallar todas. */
  readonly failWritesFor = new Set<string>();

  // Requisito: RF-016; simular lecturas correctas o fallidas.
  get(key: string): Result<string | null, StorageError> {
    if (this.failReads) {
      return err({ code: "STORAGE_READ_FAILED", message: "Fallo de lectura simulado." });
    }
    return ok(this.values.get(key) ?? null);
  }

  // Requisito: RF-016; simular escrituras confirmadas o fallidas.
  set(key: string, value: string): Result<void, StorageError> {
    if (this.failWritesFor.has("*") || this.failWritesFor.has(key)) {
      return err({ code: "STORAGE_WRITE_FAILED", message: "Fallo de escritura simulado." });
    }
    this.values.set(key, value);
    return ok(undefined);
  }

  // Requisito: RF-016; simular borrados.
  remove(key: string): Result<void, StorageError> {
    this.values.delete(key);
    return ok(undefined);
  }
}

export class RecordingLock implements LockPort {
  readonly names: string[] = [];
  fail = false;
  private tail: Promise<void> = Promise.resolve();

  // Requisito: RF-007; serializar operaciones como Web Locks y registrar el nombre.
  async runExclusive<T>(name: string, operation: () => Promise<T>) {
    this.names.push(name);
    if (this.fail) {
      return err({ code: "LOCK_FAILED", message: "Fallo de bloqueo simulado." } satisfies LockError);
    }
    let release!: () => void;
    const previous = this.tail;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return ok(await operation());
    } catch {
      return err({ code: "LOCK_FAILED", message: "Fallo de bloqueo simulado." } satisfies LockError);
    } finally {
      release();
    }
  }
}

// Requisito: RF-001; crear un usuario público de prueba.
export function usuario(id: string, role: User["role"] = "usuario"): User {
  return { id, name: `Persona ${id}`, email: `${id}@example.com`, role };
}

export interface FakeAuth extends AuthService {
  current: User | null;
  unavailable: boolean;
}

// Requisito: RF-001; AuthService simulado con sesión cambiable.
export function createFakeAuth(initial: User | null = usuario("ana")): FakeAuth {
  const unavailableError: AuthError = {
    code: "STORAGE_UNAVAILABLE",
    message: "La sesión no está disponible.",
  };
  const auth: FakeAuth = {
    current: initial,
    unavailable: false,
    initialize: () => ok(undefined),
    registerUser: async () => err(unavailableError),
    login: async () => err(unavailableError),
    logout: async () => err(unavailableError),
    getCurrentUser: () => (auth.unavailable ? err(unavailableError) : ok(auth.current)),
    getSession: () => ok(auth.current ? { userId: auth.current.id } : null),
    isAdmin: () => ok(auth.current?.role === "admin"),
  };
  return auth;
}

export interface FakeSpaces {
  readonly active: Set<string>;
  fail: boolean;
  existeYEstaActivo(id: string): Result<boolean, SpaceError>;
}

// Requisito: RF-003; simular el contrato existeYEstaActivo de 002.
export function createFakeSpaces(active: readonly string[] = ["sala-1", "cancha-1"]): FakeSpaces {
  const spaces: FakeSpaces = {
    active: new Set(active),
    fail: false,
    existeYEstaActivo: (id) =>
      spaces.fail
        ? err({ code: "STORAGE_READ_FAILED", message: "Catálogo no disponible." })
        : ok(spaces.active.has(id)),
  };
  return spaces;
}

export interface FakeClock {
  now: LocalDateTime;
  readonly clock: () => LocalDateTime;
}

// Requisitos: RF-006 y RF-009; reloj fijo que la prueba puede mover.
export function createFakeClock(initial: LocalDateTime = "2026-11-01T09:00"): FakeClock {
  const fake: FakeClock = { now: initial, clock: () => fake.now };
  return fake;
}

export interface BookingTestContext {
  readonly storage: MemoryBookingStorage;
  readonly lock: RecordingLock;
  readonly auth: FakeAuth;
  readonly spaces: FakeSpaces;
  readonly time: FakeClock;
  readonly service: BookingService;
}

// Requisitos: RF-001–RF-016; ensamblar un servicio con dobles deterministas.
export function createBookingTestContext(
  overrides: Partial<Pick<BookingDependencies, "newId">> = {},
): BookingTestContext {
  const storage = new MemoryBookingStorage();
  const lock = new RecordingLock();
  const auth = createFakeAuth();
  const spaces = createFakeSpaces();
  const time = createFakeClock();
  let counter = 0;
  const service = createBookingService({
    storage,
    lock,
    auth,
    spaces,
    clock: time.clock,
    newId:
      overrides.newId ??
      ((): Result<string, BookingError> => {
        counter += 1;
        return ok(`reserva-${counter}`);
      }),
  });
  return { storage, lock, auth, spaces, time, service };
}

// Requisito: RF-014; precargar un documento válido en el almacenamiento.
export function seedBookings(
  storage: MemoryBookingStorage,
  bookings: readonly Booking[],
): void {
  const state: BookingState = { schemaVersion: 1, bookings };
  storage.values.set(BOOKINGS_STORAGE_KEY, serializeBookingState(state));
}

// Requisito: RF-014; leer el texto guardado del documento de reservas.
export function storedBookings(storage: MemoryBookingStorage): string | undefined {
  return storage.values.get(BOOKINGS_STORAGE_KEY);
}

// Requisito: RF-007; construir una reserva válida para las pruebas.
export function reserva(
  overrides: Partial<Booking> & Pick<Booking, "id">,
): Booking {
  return {
    userId: "ana",
    spaceId: "sala-1",
    start: "2026-11-02T10:00",
    end: "2026-11-02T12:00",
    status: "activa",
    createdAt: "2026-11-01T08:00",
    ...overrides,
  };
}
