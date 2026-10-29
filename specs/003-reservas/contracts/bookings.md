# Contrato público: reservas

Interfaz de `src/bookings` para la vista y para la funcionalidad 004. Los consumidores
importan desde `src/bookings/index.ts`; no leen ni escriben `localStorage`
directamente.

**Convención de nombres**: los tipos y campos siguen el inglés de 001 y 002 (`Booking`,
`start`, `status`); las operaciones y reglas usan los nombres en español que pide la
guía del grupo (`reservar`, `cancelar`, `listarMisReservas`, `horasLibres`,
`hayChoque`).

## Tipos públicos

```ts
import type { Result } from "../shared/result";

export type LocalDate = string;      // "AAAA-MM-DD"
export type LocalDateTime = string;  // "AAAA-MM-DDTHH:mm"
export type Clock = () => LocalDateTime;

export type BookingStatus = "activa" | "cancelada";

export interface Booking {
  readonly id: string;
  readonly userId: string;
  readonly spaceId: string;
  readonly start: LocalDateTime;
  readonly end: LocalDateTime;
  readonly status: BookingStatus;
  readonly createdAt: LocalDateTime;
  readonly cancelledAt?: LocalDateTime;
}

export interface ReservaInput {
  readonly spaceId: string;
  readonly date: LocalDate;
  readonly startTime: string;      // "HH:00"
  readonly durationHours: number;  // 1, 2 o 3
}

export interface Franja {
  readonly spaceId: string;
  readonly start: LocalDateTime;
  readonly end: LocalDateTime;
}

export type BookingErrorCode =
  | "NOT_AUTHENTICATED"
  | "AUTH_STATE_UNAVAILABLE"
  | "INVALID_SPACE"
  | "SPACE_NOT_AVAILABLE"
  | "SPACES_UNAVAILABLE"
  | "INVALID_DATE"
  | "INVALID_START_TIME"
  | "INVALID_DURATION"
  | "OUTSIDE_OPENING_HOURS"
  | "PAST_DATETIME"
  | "OVERLAP"
  | "BOOKING_NOT_FOUND"
  | "CANCELLATION_TOO_LATE"
  | "CLOCK_UNAVAILABLE"
  | "CORRUPT_STORAGE"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "LOCK_UNAVAILABLE"
  | "LOCK_FAILED"
  | "ID_UNAVAILABLE";

export interface BookingError {
  readonly code: BookingErrorCode;
  readonly message: string;
}

export interface BookingService {
  initialize(): Result<void, BookingError>;
  reservar(input: ReservaInput): Promise<Result<Booking, BookingError>>;
  cancelar(bookingId: string): Promise<Result<Booking, BookingError>>;
  listarMisReservas(): Result<readonly Booking[], BookingError>;
  horasLibres(spaceId: string, date: LocalDate): Result<readonly string[], BookingError>;
}

// Lógica pura, sin almacenamiento ni DOM.
export function hayChoque(bookings: readonly Booking[], franja: Franja): boolean;
export function calcularHorasLibres(
  bookings: readonly Booking[],
  spaceId: string,
  date: LocalDate,
): readonly string[];
```

## Dependencias del servicio

```ts
export interface BookingDependencies {
  readonly storage: StoragePort;
  readonly lock: LockPort;
  readonly auth: AuthService;                                   // 001
  readonly spaces: Pick<SpaceService, "existeYEstaActivo">;     // 002
  readonly clock: Clock;
  readonly newId?: () => Result<string, BookingError>;          // por defecto crypto.randomUUID
}
```

## Operaciones

### `initialize()`

- Lee `reservalocal.bookings.v1`. Si no existe, empieza vacío y devuelve `Ok`.
- Si el documento está corrupto, copia el texto a `reservalocal.bookings.v1.respaldo`,
  escribe un documento vacío y devuelve `CORRUPT_STORAGE` para que la vista avise. La
  aplicación sigue funcionando sin reservas.
- Si la copia de respaldo falla, no sobrescribe el documento y devuelve el error.

### `reservar(input)`

1. Exige sesión (`NOT_AUTHENTICATED` si no hay).
2. Valida la entrada en este orden: espacio, fecha, hora en punto, duración, horario.
3. Lee el reloj y rechaza inicios anteriores a la hora actual (`PAST_DATETIME`).
4. Dentro de `lock.runExclusive("reservalocal.spaces.v1")`: relee las reservas,
   llama a `spaces.existeYEstaActivo(spaceId)`, rechaza con `OVERLAP` si
   `hayChoque` y escribe la nueva reserva activa.
5. Devuelve la reserva solo después de confirmar la escritura.

### `cancelar(bookingId)`

1. Exige sesión.
2. Dentro del mismo bloqueo, busca la reserva. Si no existe o es de otra persona,
   devuelve `BOOKING_NOT_FOUND` con el mismo mensaje en ambos casos.
3. Si ya está cancelada, devuelve `Ok(reserva)` sin escribir (idempotente).
4. Si faltan menos de 60 minutos para el inicio, devuelve `CANCELLATION_TOO_LATE`.
5. Marca `status: "cancelada"` y `cancelledAt: ahora`, escribe y devuelve la reserva.

### `listarMisReservas()`

- Exige sesión. Devuelve solo las reservas cuyo `userId` es el de la sesión, activas y
  canceladas, ordenadas por `start`.

### `horasLibres(spaceId, date)`

- Exige sesión y fecha válida. Si el espacio no existe o está inactivo, devuelve
  `SPACE_NOT_AVAILABLE`.
- Devuelve los bloques (`"08:00"` … `"21:00"`) no ocupados por reservas activas de ese
  espacio en esa fecha. No oculta las horas ya pasadas.

### `hayChoque(bookings, franja)` y `calcularHorasLibres(...)`

- Funciones puras. `hayChoque` es `true` si alguna reserva **activa** del mismo
  espacio cumple `a.start < franja.end && franja.start < a.end`.

## Errores visibles

| Código | Mensaje en español |
|---|---|
| `NOT_AUTHENTICATED` | Debes iniciar sesión para gestionar tus reservas. |
| `AUTH_STATE_UNAVAILABLE` | No se pudo comprobar la sesión actual. |
| `INVALID_SPACE` | Elige un espacio para reservar. |
| `SPACE_NOT_AVAILABLE` | El espacio no existe o no está disponible para reservas. Elige un espacio activo. |
| `SPACES_UNAVAILABLE` | No se pudo comprobar el catálogo de espacios. Inténtalo de nuevo. |
| `INVALID_DATE` | La fecha no es válida. Usa una fecha que exista con el formato AAAA-MM-DD. |
| `INVALID_START_TIME` | La hora de inicio debe ser una hora en punto, por ejemplo 10:00. |
| `INVALID_DURATION` | La duración debe ser de 1, 2 o 3 horas. |
| `OUTSIDE_OPENING_HOURS` | El local atiende de 08:00 a 22:00: la reserva debe empezar a las 08:00 o después y terminar a las 22:00 o antes. |
| `PAST_DATETIME` | No se puede reservar en el pasado. Elige una fecha y hora posteriores a la actual. |
| `OVERLAP` | Ese horario ya está reservado para este espacio. Consulta las horas libres y elige otra hora. |
| `BOOKING_NOT_FOUND` | La reserva no existe o no te pertenece. |
| `CANCELLATION_TOO_LATE` | Solo puedes cancelar hasta 1 hora antes del inicio de la reserva. |
| `CLOCK_UNAVAILABLE` | No se pudo leer la hora actual del dispositivo. |
| `CORRUPT_STORAGE` | Los datos de reservas estaban dañados: se guardó una copia de respaldo y se empezó sin reservas. |
| `STORAGE_*`, `LOCK_*`, `ID_UNAVAILABLE` | Mensaje del adaptador; la operación no se presenta como exitosa. |

## Límites de compatibilidad

- No cambia los contratos de 001 (`auth.md`) ni de 002 (`spaces.md`).
- 004 puede reutilizar `hayChoque`, `calcularHorasLibres` y la lectura del documento
  (`leerReservas`) desde `index.ts` sin duplicar reglas. La cancelación como admin
  pertenece a 004.
- La autenticación local es didáctica y no sustituye la autorización de un servidor.
