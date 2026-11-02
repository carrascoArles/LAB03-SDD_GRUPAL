# Modelo de datos: Administración de reservas

## Tipos reutilizados

004 no crea ni persiste una entidad de reserva distinta. Reutiliza el modelo
`Booking` y el contenedor `BookingState` de `src/bookings/model.ts`.

### `Booking`

| Campo | Tipo | Uso en administración |
|---|---|---|
| `id` | `string` | Identifica la reserva consultada o cancelada. |
| `userId` | `string` | Mantiene el propietario original; no limita el acceso de `admin`. |
| `spaceId` | `string` | Conserva el espacio original. |
| `start` | `LocalDateTime` | Orden cronológico y validación del margen de cancelación. |
| `end` | `LocalDateTime` | Se muestra en el detalle de la reserva. |
| `status` | `"activa" \| "cancelada"` | La consulta incluye ambos estados; cancelar transforma activa a cancelada. |
| `createdAt` | `LocalDateTime` | Se conserva al actualizar el estado. |
| `cancelledAt` | `LocalDateTime \| undefined` | Se escribe al completar la primera cancelación. |

### `BookingState`

Documento compartido versionado (`schemaVersion: 1`) con todas las reservas.
Clave y formato permanecen bajo el control de 003. 004 no añade propiedades,
claves, copias de usuario ni copias de espacio.

## Tipos administrativos

### `AdminError`

Resultado de error de las operaciones administrativas. Tiene un código tipado y
un mensaje en español. Cubre permiso denegado, sesión no verificable, reserva no
encontrada, cancelación demasiado próxima, reloj no disponible, errores del
documento y fallos del bloqueo. Los errores de lectura, escritura y coordinación
conservan mensajes explícitos; no se presentan como éxito.

La respuesta de permiso denegado usa:

```text
PERMISSION_DENIED
No tienes permiso para administrar las reservas.
```

La lista vacía es un resultado válido `Ok([])`, distinto de un error al leer.

## Reglas e invariantes

1. Solo una sesión cuyo `AuthService.isAdmin()` devuelva `Ok(true)` puede consultar
   o cancelar desde el servicio administrativo.
2. La comprobación de rol ocurre antes de leer la lista o ejecutar una escritura.
3. La consulta incluye reservas activas y canceladas de todos los usuarios,
   incluidas las del propio administrador.
4. El resultado se ordena por `start`; los empates siguen el desempate por `id`
   de `ordenarPorInicio`.
5. Una reserva activa se puede cancelar cuando `puedeCancelar(booking, ahora)`
   devuelve `true` (60 minutos o más).
6. Una reserva activa dentro de los últimos 60 minutos queda intacta y produce
   `CANCELLATION_TOO_LATE`.
7. Cancelar una reserva ya cancelada devuelve la reserva actual sin escribir,
   aunque haya pasado su inicio o el reloj inyectado no esté disponible.
8. La transición de activa a cancelada conserva todos los demás campos de la
   reserva y asigna `cancelledAt` con el reloj inyectado.
9. Toda cancelación vuelve a leer el estado dentro del bloqueo compartido, y solo
   confirma éxito después de que `guardarReservas` confirme la escritura.
10. Una operación rechazada, un permiso no verificable o un fallo de persistencia
    no modifica el estado guardado ni entrega la lista.

## Transiciones de estado

| Estado previo | Operación administrativa | Resultado |
|---|---|---|
| Cualquier estado; sesión admin válida | Consultar | Todas las reservas ordenadas por inicio. |
| Cualquier estado; usuario sin rol admin | Consultar | `PERMISSION_DENIED`; sin datos. |
| Activa; faltan al menos 60 minutos; sesión admin válida | Cancelar | Estado cancelado y `cancelledAt` persistidos. |
| Activa; faltan menos de 60 minutos | Cancelar | `CANCELLATION_TOO_LATE`; sin cambios. |
| Cancelada | Cancelar | Éxito idempotente; sin escritura. |
| No existe | Cancelar | Error en español; sin cambios. |
| Fallo de lectura, bloqueo o escritura | Consultar / cancelar | Error explícito; nunca éxito ficticio. |
