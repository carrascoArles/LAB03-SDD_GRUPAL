# Investigación: Reservas

## Representación de fechas y horas

**Decisión**: Guardar y comparar fechas como texto ISO local sin zona horaria:
`AAAA-MM-DD` para la fecha y `AAAA-MM-DDTHH:mm` para inicio y fin. Para restar
instantes se convierte el texto a minutos con `Date.UTC(...)`, tratándolo como hora
«ingenua» (sin zona).

**Justificación**: El local y sus clientes están en la misma zona horaria. Un objeto
`Date` o una marca ISO con `Z` mezclaría la zona del navegador y cambiaría la hora al
serializar. El texto con formato fijo se ordena lexicográficamente igual que en el
tiempo, así que comparar `inicio < fin` es una comparación de cadenas. Convertir con
`Date.UTC` evita los saltos por cambio de horario de verano al calcular el margen de
cancelación.

**Alternativas consideradas**: Marcas de tiempo numéricas (ilegibles en el
almacenamiento y dependientes de la zona al mostrarlas); `Date` local (sufre cambios
de horario y es difícil de probar); una biblioteca de fechas (dependencia innecesaria
para operaciones de horas enteras).

## Reloj inyectado

**Decisión**: El servicio recibe `clock: () => string` que devuelve la hora actual
como `AAAA-MM-DDTHH:mm`. En producción, `systemClock` formatea `new Date()` con los
getters locales. Las reglas puras reciben `now` como parámetro. La salida del reloj se
valida en tiempo de ejecución; si no tiene el formato esperado, se devuelve
`CLOCK_UNAVAILABLE`.

**Justificación**: Las reglas «no reservar en el pasado» y «cancelar hasta 1 hora
antes» dependen de la hora actual. Inyectarla permite probar exactamente los bordes
(60 y 59 minutos) y generar horas arbitrarias en las propiedades.

**Alternativas consideradas**: Simular el reloj global con temporizadores falsos de
Vitest (acopla las pruebas al entorno y no sirve para las funciones puras).

## Persistencia

**Decisión**: Un documento único `{ schemaVersion: 1, bookings: Booking[] }` bajo la
clave `reservalocal.bookings.v1`, leído y escrito por `StoragePort`. La lectura valida
estructura, tipos, formatos, horario, duración, ids únicos y que no haya reservas
activas solapadas en el mismo espacio.

**Justificación**: Mismo patrón que 001 y 002. Un documento único permite comprobar el
no solapamiento al cargar y escribir de forma atómica. Guardar solo `userId` y
`spaceId` cumple RF-015 y evita datos duplicados que podrían quedar desactualizados.

**Alternativas consideradas**: Una clave por reserva (no permite validar el
solapamiento de forma atómica); guardar el nombre del espacio en la reserva (duplica
datos de 002 y contradice RF-015).

## Datos corruptos

**Decisión**: En `initialize()`, si el documento no se puede decodificar, copiar el
texto original a `reservalocal.bookings.v1.respaldo`, escribir un documento vacío y
devolver `CORRUPT_STORAGE` para que la vista muestre el aviso. Si la copia de respaldo
falla, no se sobrescribe el documento y las operaciones siguientes devuelven error.

**Justificación**: Cumple RF-014 (arrancar sin reservas y avisar) sin perder los datos
dañados, que es la crítica que el grupo hizo a la recuperación de 001 (que descarta el
documento sin respaldo).

**Alternativas consideradas**: Mantener el estado vacío solo en memoria (las
operaciones siguientes volverían a leer el documento dañado); borrar el documento sin
copia (pérdida de datos).

## Coordinación con la desactivación de espacios

**Decisión**: `reservar` y `cancelar` se ejecutan dentro de
`lock.runExclusive("reservalocal.spaces.v1", ...)`. Dentro del bloqueo, `reservar`
relee las reservas, llama a `spaces.existeYEstaActivo(spaceId)`, comprueba choques y
solo entonces escribe.

**Justificación**: Es exactamente lo que exige `specs/002-catalogo-espacios/contracts/spaces.md`
para que una reserva no se confirme después de una desactivación concurrente. Releer
dentro del bloqueo evita que dos pestañas reserven la misma franja.

**Alternativas consideradas**: Un bloqueo propio `reservalocal.bookings.v1` (no se
serializa con la desactivación y viola el contrato de 002).

## Composición en `main.ts`

**Decisión**: El módulo de reservas crea su propia instancia de `SpaceService` con los
mismos adaptadores en lugar de reutilizar la que crea el módulo de espacios.

**Justificación**: La instancia de 002 se crea dentro de su propio `mount` y no se
expone. `SpaceService` no guarda estado propio: relee el almacenamiento en cada
llamada, por lo que dos instancias ven los mismos datos. Así no se modifica el código
de 002, como pide la regla del grupo.

**Alternativas consideradas**: Mover la creación de `SpaceService` fuera del `mount`
de 002 (más limpio, pero toca el código de otro integrante; se propone al grupo como
mejora).

## Pruebas de propiedades

**Decisión**: fast-check con `numRuns: 100` como mínimo. La propiedad de no
solapamiento usa `fc.asyncProperty` con una secuencia aleatoria de operaciones
(reservar o cancelar, con usuario, espacio, fecha, hora y duración aleatorios) sobre
el servicio real con almacenamiento simulado, y al final comprueba el documento
guardado.

**Justificación**: Es la propiedad que exige la constitución y la que mejor detecta
errores de orden entre validación, bloqueo y escritura.

**Alternativas consideradas**: Comprobar solo la función pura `hayChoque` (no detecta
errores de integración en el servicio).
