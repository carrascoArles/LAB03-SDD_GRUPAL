# Modelo de datos: Reservas

## Tipos de apoyo

| Tipo | Formato | Ejemplo | Regla |
|---|---|---|---|
| `LocalDate` | `AAAA-MM-DD` | `2026-11-02` | Fecha de calendario existente (rechaza `2026-02-30`). |
| `LocalDateTime` | `AAAA-MM-DDTHH:mm` | `2026-11-02T10:00` | Fecha existente, hora 00–23 y minutos 00–59. Sin zona horaria. |
| `Clock` | `() => LocalDateTime` | `() => "2026-11-01T09:15"` | Devuelve la hora local actual; se valida en tiempo de ejecución. |

Constantes del horario: apertura `08:00`, cierre `22:00`, duración mínima 1 hora,
duración máxima 3 horas, margen de cancelación 60 minutos. El horario tiene 14
bloques de una hora: `08:00`, `09:00`, …, `21:00`.

## Entidades

### `Booking` — modelo público

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `string` | Único, no vacío e inmutable. |
| `userId` | `string` | Id del `User` de 001 que hizo la reserva. No se copian nombre ni correo. |
| `spaceId` | `string` | Id del `Space` de 002. No se copian nombre, tipo ni capacidad. |
| `start` | `LocalDateTime` | Minutos `00`; hora entre 08 y 21. |
| `end` | `LocalDateTime` | Misma fecha que `start`; minutos `00`; hora como máximo 22. |
| `status` | `BookingStatus` | `activa` o `cancelada`. |
| `createdAt` | `LocalDateTime` | Momento en que se confirmó la reserva. |
| `cancelledAt` | `LocalDateTime` opcional | Presente si y solo si `status` es `cancelada`. |

La duración no se guarda: es `hora(end) − hora(start)`.

### `BookingStatus`

Unión cerrada `"activa" | "cancelada"`. Solo existe la transición activa → cancelada.

### `ReservaInput` — solicitud de reserva

| Campo | Tipo | Regla |
|---|---|---|
| `spaceId` | `string` | No vacío. Debe corresponder a un espacio activo al confirmar. |
| `date` | `LocalDate` | Fecha existente. |
| `startTime` | `string` `HH:mm` | Hora en punto (`HH:00`). |
| `durationHours` | `number` | Entero 1, 2 o 3. |

No incluye `userId`: el servicio lo toma de la sesión.

### `Franja`

`{ spaceId, start, end }`: intervalo semiabierto `[start, end)` que se usa en
`hayChoque`. Dos franjas del mismo espacio se solapan si y solo si
`a.start < b.end` y `b.start < a.end`. Si `a.end === b.start`, no se solapan.

### `BookingState` — documento persistido

| Campo | Tipo | Regla |
|---|---|---|
| `schemaVersion` | `1` | Versión del formato. |
| `bookings` | `Booking[]` | Todas las reservas, activas y canceladas. |

Clave: `reservalocal.bookings.v1`. Clave de respaldo ante corrupción:
`reservalocal.bookings.v1.respaldo`. La lectura rechaza campos desconocidos.

### `BookingError`

`{ code: BookingErrorCode, message: string }`, con el mensaje en español. Los códigos
están en [contracts/bookings.md](./contracts/bookings.md).

## Invariantes

1. Los ids de reserva son únicos y no vacíos.
2. `status` es `activa` o `cancelada`; `cancelledAt` existe solo si está cancelada.
3. `start` y `end` tienen la misma fecha, minutos `00`, `start ≥ 08:00` y
   `end ≤ 22:00`.
4. La duración `hora(end) − hora(start)` es un entero entre 1 y 3.
5. Nunca hay dos reservas **activas** del mismo `spaceId` cuyas franjas se solapen.
   Las canceladas no cuentan.
6. Una reserva se crea solo si, en el momento de confirmarla, `start ≥ ahora`, el
   espacio existe y está activo, y no hay choque con una activa.
7. Una reserva se cancela solo si pertenece al usuario de la sesión y faltan 60
   minutos o más para `start`. Cancelar una ya cancelada no cambia nada.
8. Horas libres de un espacio en una fecha = bloques del horario − bloques ocupados
   por reservas activas de ese espacio en esa fecha. Libres + reservadas = 14.
9. Cada persona solo obtiene sus propias reservas.
10. Ninguna operación rechazada cambia el documento guardado.
11. Serializar y deserializar un documento válido devuelve el mismo documento.

## Transiciones de estado

| Estado previo | Operación | Resultado |
|---|---|---|
| Sin reserva en la franja, espacio activo, futuro | `reservar` | Nueva reserva `activa`. |
| Reserva activa que choca | `reservar` | `OVERLAP`; sin cambios. |
| Espacio inactivo o inexistente | `reservar` | `SPACE_NOT_AVAILABLE`; sin cambios. |
| Inicio anterior a la hora actual | `reservar` | `PAST_DATETIME`; sin cambios. |
| Reserva propia activa, faltan ≥ 60 min | `cancelar` | `cancelada` con `cancelledAt`; la franja queda libre. |
| Reserva propia activa, faltan < 60 min | `cancelar` | `CANCELLATION_TOO_LATE`; sin cambios. |
| Reserva propia cancelada | `cancelar` | Éxito sin cambios (idempotente). |
| Reserva ajena o inexistente | `cancelar` | `BOOKING_NOT_FOUND`; sin cambios. |
| Documento corrupto | `initialize` | Respaldo, documento vacío y `CORRUPT_STORAGE` como aviso. |
| Fallo de bloqueo o escritura | `reservar` / `cancelar` | Error tipado; no se informa éxito. |
