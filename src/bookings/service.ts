import { err, ok, type Result } from "../shared/result";
import type { AuthService, User } from "../auth";
import type { LockPort } from "../shared/lock-port";
import type { StoragePort } from "../shared/storage-port";
import type { SpaceService } from "../spaces";
import { bookingError } from "./model";
import type {
  Booking,
  BookingError,
  BookingService,
  Clock,
  LocalDate,
  ReservaInput,
} from "./model";
import {
  guardarReservas,
  leerReservas,
  respaldarYReiniciar,
} from "./repository";
import {
  agregarReserva,
  calcularHorasLibres,
  hayChoque,
  marcarCancelada,
  ordenarPorInicio,
  puedeCancelar,
  reemplazarReserva,
} from "./rules";
import { esFechaValida, leerReloj } from "./time";
import { esIdValido, validarNoPasado, validarSolicitud } from "./validation";

export interface BookingDependencies {
  readonly storage: StoragePort;
  readonly lock: LockPort;
  readonly auth: AuthService;
  readonly spaces: Pick<SpaceService, "existeYEstaActivo">;
  readonly clock: Clock;
  readonly newId?: () => Result<string, BookingError>;
}

/**
 * Bloqueo compartido con la desactivación de espacios. El contrato de 002 exige
 * comprobar `existeYEstaActivo` dentro de este mismo bloqueo al crear una reserva.
 */
export const BOOKINGS_LOCK_NAME = "reservalocal.spaces.v1";

// Requisito: RF-002; generar ids con Web Crypto sin lanzar excepciones.
function defaultNewId(): Result<string, BookingError> {
  try {
    const randomUUID = globalThis.crypto?.randomUUID;
    if (typeof randomUUID !== "function") {
      return err(bookingError("ID_UNAVAILABLE"));
    }
    return ok(randomUUID.call(globalThis.crypto));
  } catch {
    return err(bookingError("ID_UNAVAILABLE"));
  }
}

// Requisito: RF-001; obtener el usuario de la sesión validada por 001.
function usuarioActual(auth: AuthService): Result<User, BookingError> {
  const current = auth.getCurrentUser();
  if (!current.ok) return err(bookingError("AUTH_STATE_UNAVAILABLE"));
  if (current.value === null) return err(bookingError("NOT_AUTHENTICATED"));
  return ok(current.value);
}

// Requisitos: RF-003 y RF-012; consultar el catálogo de 002 como fuente de verdad.
function comprobarEspacioActivo(
  spaces: Pick<SpaceService, "existeYEstaActivo">,
  spaceId: string,
): Result<void, BookingError> {
  const activo = spaces.existeYEstaActivo(spaceId);
  if (!activo.ok) return err(bookingError("SPACES_UNAVAILABLE"));
  return activo.value ? ok(undefined) : err(bookingError("SPACE_NOT_AVAILABLE"));
}

// Requisitos: RF-001–RF-016; crear el servicio de reservas con dependencias inyectadas.
export function createBookingService(
  dependencies: BookingDependencies,
): BookingService {
  const { storage, lock, auth, spaces, clock } = dependencies;
  const newId = dependencies.newId ?? defaultNewId;

  // Requisito: RF-016; serializar escrituras y no ocultar fallos del bloqueo.
  async function enBloqueo<T>(
    operation: () => Promise<Result<T, BookingError>>,
  ): Promise<Result<T, BookingError>> {
    const locked = await lock.runExclusive(BOOKINGS_LOCK_NAME, operation);
    if (!locked.ok) return err(bookingError(locked.error.code));
    return locked.value;
  }

  // Requisito: RF-014; arrancar con respaldo y sin reservas si los datos están dañados.
  function initialize(): Result<void, BookingError> {
    const loaded = leerReservas(storage);
    if (loaded.ok) return ok(undefined);
    if (loaded.error.code !== "CORRUPT_STORAGE") return err(loaded.error);
    const reset = respaldarYReiniciar(storage);
    if (!reset.ok) return err(reset.error);
    return err(bookingError("CORRUPT_STORAGE"));
  }

  // Requisitos: RF-002–RF-007, RF-015 y RF-016; crear una reserva activa.
  async function reservar(
    input: ReservaInput,
  ): Promise<Result<Booking, BookingError>> {
    const user = usuarioActual(auth);
    if (!user.ok) return err(user.error);
    const franja = validarSolicitud(input);
    if (!franja.ok) return err(franja.error);
    const ahora = leerReloj(clock);
    if (!ahora.ok) return err(ahora.error);
    const futuro = validarNoPasado(franja.value, ahora.value);
    if (!futuro.ok) return err(futuro.error);

    return enBloqueo(async () => {
      const current = leerReservas(storage);
      if (!current.ok) return err(current.error);
      const disponible = comprobarEspacioActivo(spaces, franja.value.spaceId);
      if (!disponible.ok) return err(disponible.error);
      if (hayChoque(current.value.bookings, franja.value)) {
        return err(bookingError("OVERLAP"));
      }
      const id = newId();
      if (!id.ok) return err(id.error);
      if (current.value.bookings.some((booking) => booking.id === id.value)) {
        return err(bookingError("ID_UNAVAILABLE"));
      }
      const booking: Booking = {
        id: id.value,
        userId: user.value.id,
        spaceId: franja.value.spaceId,
        start: franja.value.start,
        end: franja.value.end,
        status: "activa",
        createdAt: ahora.value,
      };
      const saved = guardarReservas(
        storage,
        agregarReserva(current.value, booking),
      );
      return saved.ok ? ok(booking) : err(saved.error);
    });
  }

  // Requisitos: RF-009–RF-011 y RF-016; cancelar una reserva propia.
  async function cancelar(
    bookingId: string,
  ): Promise<Result<Booking, BookingError>> {
    const user = usuarioActual(auth);
    if (!user.ok) return err(user.error);
    if (!esIdValido(bookingId)) return err(bookingError("BOOKING_NOT_FOUND"));
    const ahora = leerReloj(clock);
    if (!ahora.ok) return err(ahora.error);

    return enBloqueo(async () => {
      const current = leerReservas(storage);
      if (!current.ok) return err(current.error);
      const booking = current.value.bookings.find(
        (candidate) =>
          candidate.id === bookingId && candidate.userId === user.value.id,
      );
      // Misma respuesta para inexistente y ajena: no se revela la reserva de otro.
      if (!booking) return err(bookingError("BOOKING_NOT_FOUND"));
      if (booking.status === "cancelada") return ok(booking);
      if (!puedeCancelar(booking, ahora.value)) {
        return err(bookingError("CANCELLATION_TOO_LATE"));
      }
      const cancelled = marcarCancelada(booking, ahora.value);
      const saved = guardarReservas(
        storage,
        reemplazarReserva(current.value, cancelled),
      );
      return saved.ok ? ok(cancelled) : err(saved.error);
    });
  }

  // Requisitos: RF-008 y RF-011; listar solo las reservas de la sesión.
  function listarMisReservas(): Result<readonly Booking[], BookingError> {
    const user = usuarioActual(auth);
    if (!user.ok) return err(user.error);
    const current = leerReservas(storage);
    if (!current.ok) return err(current.error);
    return ok(
      ordenarPorInicio(
        current.value.bookings.filter(
          (booking) => booking.userId === user.value.id,
        ),
      ),
    );
  }

  // Requisito: RF-012; horas libres de un espacio activo en una fecha.
  function horasLibres(
    spaceId: string,
    date: LocalDate,
  ): Result<readonly string[], BookingError> {
    const user = usuarioActual(auth);
    if (!user.ok) return err(user.error);
    if (!esIdValido(spaceId)) return err(bookingError("INVALID_SPACE"));
    if (!esFechaValida(date)) return err(bookingError("INVALID_DATE"));
    const disponible = comprobarEspacioActivo(spaces, spaceId);
    if (!disponible.ok) return err(disponible.error);
    const current = leerReservas(storage);
    if (!current.ok) return err(current.error);
    return ok(calcularHorasLibres(current.value.bookings, spaceId, date));
  }

  return { initialize, reservar, cancelar, listarMisReservas, horasLibres };
}
