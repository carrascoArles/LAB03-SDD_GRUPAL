# Contrato: Administración de reservas

Interfaz de `src/admin` para la vista administrativa y el ensamblaje de la SPA.
La autorización vive en el servicio, no solo en la vista. Las reservas y el
documento persistido pertenecen a 003.

## Tipos y dependencias

```ts
import type { AuthService } from "../auth";
import type { AuthService } from "../auth";
import type { Result } from "../shared/result";
import type { LockPort } from "../shared/lock-port";
import type { StoragePort } from "../shared/storage-port";
import type { Booking, BookingErrorCode, Clock } from "../bookings";

export type AdminErrorCode =
  | "PERMISSION_DENIED"
  | "AUTH_STATE_UNAVAILABLE"
  | "INVALID_BOOKING_ID"
  | "BOOKING_NOT_FOUND"
  | "CANCELLATION_TOO_LATE"
  | "CLOCK_UNAVAILABLE"
  | "CORRUPT_STORAGE"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "LOCK_UNAVAILABLE"
  | "LOCK_FAILED"
  | BookingErrorCode;

export interface AdminError {
  readonly code: AdminErrorCode;
  readonly message: string;
}

export interface AdminDependencies {
  readonly storage: StoragePort;
  readonly lock: LockPort;
  readonly auth: AuthService;
  readonly clock: Clock;
}

export interface AdminService {
  listarReservas(): Result<readonly Booking[], AdminError>;
  cancelarReserva(bookingId: string): Promise<Result<Booking, AdminError>>;
}

export interface AdminViewDependencies {
  readonly auth: AuthService;
  readonly admin: AdminService;
}

export function mountAdminView(
  root: HTMLElement,
  dependencies: AdminViewDependencies,
): void;

export function createAdminService(
  dependencies: AdminDependencies,
): AdminService;
```

`Clock` y `Booking` provienen del contrato de bookings. Las funciones de repositorio y reglas que requiere el servicio existen en módulos
internos de 003, pero no todas están reexportadas por `src/bookings/index.ts`. La
constitución v1.1.0 autoriza temporalmente a 004 a importar solo los seis helpers
enumerados en su principio I. Esta excepción es deuda técnica y no permite modificar
003.

## Errores visibles

| Código | Mensaje / tratamiento |
|---|---|
| `PERMISSION_DENIED` | «No tienes permiso para administrar las reservas.» No incluir datos de reservas. |
| `AUTH_STATE_UNAVAILABLE` | No se pudo comprobar el permiso administrativo. No conceder acceso. |
| `BOOKING_NOT_FOUND` | «La reserva no existe.» |
| `CANCELLATION_TOO_LATE` | Reutilizar el mensaje español del margen de cancelación de bookings. |
| `CLOCK_UNAVAILABLE` | Reutilizar el mensaje español del reloj de bookings. |
| `CORRUPT_STORAGE` | Informar del estado corrupto; no comunicar una consulta/cancelación como exitosa. |
| `STORAGE_*`, `LOCK_*` | Conservar el error explícito de la dependencia en español; no presentar éxito. |

## Operaciones

### `listarReservas()`

1. Comprueba el rol mediante `auth.isAdmin()`.
2. Si el resultado es error, devuelve fallo de autorización; si el valor es
   `false`, devuelve `PERMISSION_DENIED`. Los errores de AuthService se mapean a
   `AUTH_STATE_UNAVAILABLE` y no conceden acceso.
3. Lee con `leerReservas(storage)` y ordena con `ordenarPorInicio`.
4. Devuelve cada reserva, activa o cancelada, sin filtrar por `userId`.

### `cancelarReserva(bookingId)`

1. Comprueba el rol; usuarios sin permiso no obtienen información sobre la reserva.
2. Valida el identificador en tiempo de ejecución.
3. Dentro del bloqueo compartido con bookings, relee el documento y busca por id.
4. Devuelve `BOOKING_NOT_FOUND` si no existe.
5. Si ya está cancelada, devuelve la reserva sin escribir ni necesitar el reloj.
6. Si está activa, lee el reloj inyectado dentro del bloqueo y reutiliza
   `puedeCancelar`. Con menos de 60 minutos devuelve `CANCELLATION_TOO_LATE` sin
   cambios.
7. Reutiliza `marcarCancelada` y `reemplazarReserva`, persiste con
   `guardarReservas` y confirma éxito solo tras la escritura.

## Límites

- No cambia el contrato público de 001 ni el modelo o las reglas de 003.
- La interfaz administrativa no es un control de acceso suficiente; cada operación
  vuelve a comprobar el rol.
- La autenticación local y su rol son didácticos y no sustituyen autorización de
  servidor.
