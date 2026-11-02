# Tareas: Reservas

**Entrada**: Documentos de diseño de `specs/003-reservas/`

**Prerequisitos**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/bookings.md` y `quickstart.md`.

**Pruebas**: Incluidas porque la constitución (principio IV) exige pruebas unitarias,
de propiedades (mínimo 100 ejecuciones) y de integración para cada requisito, y
porque el plan define la estrategia de tres niveles.

**Organización**: Tareas agrupadas por historia de usuario para implementar y
verificar cada historia por separado.

## Formato

- `- [ ] Tnnn [P] [USn] descripción con ruta`.
- `[P]`: puede hacerse en paralelo (archivos distintos, sin dependencias pendientes).
- Las fases Setup, Fundacional y Pulido no llevan etiqueta de historia.

---

## Fase 1: Setup

**Propósito**: Preparar carpetas y dobles de prueba. No se instalan herramientas
nuevas.

- [X] T001 [P] Crear `tests/helpers/bookings.ts` con almacenamiento y bloqueo en memoria (que registre los nombres de bloqueo), un `AuthService` simulado con usuario cambiable, un reloj fijo modificable y un `existeYEstaActivo` simulado con un conjunto de espacios activos.
- [X] T002 [P] Crear `src/bookings/`, `tests/unit/bookings/`, `tests/property/bookings/` y `tests/integration/bookings/`.

---

## Fase 2: Fundacional

**Propósito**: Tipos, tiempo y persistencia que necesitan todas las historias.

- [X] T003 Definir en `src/bookings/model.ts` `Booking`, `BookingStatus` («`activa` o `cancelada`»), `ReservaInput`, `Franja`, `BookingState`, `BookingError`, `BookingErrorCode`, `BookingService`, `Clock` y las constantes «apertura 08:00, cierre 22:00, duración de 1 a 3 horas, margen de cancelación 60 minutos», según `data-model.md`.
- [X] T004 [P] Implementar en `src/bookings/time.ts` la validación de `LocalDate` («fecha de calendario existente») y `LocalDateTime` (`AAAA-MM-DDTHH:mm`), la conversión a minutos con `Date.UTC`, la construcción de `AAAA-MM-DDTHH:00` y `systemClock` con getters locales.
- [X] T005 [P] Añadir pruebas unitarias de `time.ts` en `tests/unit/bookings/time.test.ts`: 29 de febrero bisiesto y no bisiesto, 30 de febrero, mes 13, hora 24, minutos 60, diferencia en minutos entre días y formateo del reloj.
- [X] T006 Implementar en `src/bookings/state.ts` `decodeBookingState`, `serializeBookingState` y `emptyBookingState`, validando campos permitidos, ids únicos, formatos, horario, duración, `cancelledAt` solo si está cancelada y ausencia de reservas activas solapadas en el mismo espacio.
- [X] T007 [P] Añadir pruebas unitarias de `state.ts` en `tests/unit/bookings/state.test.ts`: documento vacío, JSON roto, campo desconocido, id duplicado, estado inválido, fuera de horario, duración 4, `cancelledAt` en una activa y dos activas solapadas.
- [X] T008 Implementar en `src/bookings/repository.ts` `leerReservas`, `guardarReservas` y `respaldarYReiniciar` sobre `StoragePort` con las claves `reservalocal.bookings.v1` y `reservalocal.bookings.v1.respaldo`, convirtiendo los errores del adaptador en `BookingError`.
- [X] T009 Crear en `src/bookings/service.ts` `createBookingService(dependencies)` e `initialize()`: documento ausente → `Ok`; documento corrupto → respaldo, documento vacío y `CORRUPT_STORAGE`; fallo del respaldo → error sin sobrescribir.
- [X] T010 [P] Añadir pruebas de integración de RF-014 en `tests/integration/bookings/recovery.integration.test.ts`: respaldo con el valor original, arranque sin reservas, aviso en español y fallo de respaldo sin sobrescribir.

**Punto de control**: El módulo arranca, lee y guarda el documento validado.

---

## Fase 3: Historia de usuario 1 — Reservar un espacio (P1) — MVP

**Objetivo**: Una persona con sesión reserva un espacio activo en una franja válida
sin chocar con otra reserva activa.

**Prueba independiente**: Con un usuario simulado y un espacio activo, reservar una
franja futura; intentar una franja que se cruza y otra adyacente.

### Pruebas de la historia de usuario 1

- [X] T011 [P] [US1] Pruebas unitarias de validación en `tests/unit/bookings/validation.test.ts` para RF-004–RF-006: 07:00 rechazada, 08:00 aceptada, 21:00 con duración 1 aceptada, 21:00 con duración 2 rechazada, 20:00 con duración 2 aceptada (termina a las 22:00), duración 0, 4 y 1,5 rechazadas, 10:30 rechazada, `2026-02-30` rechazada, inicio igual a la hora actual aceptado y un minuto antes rechazado.
- [X] T012 [P] [US1] Pruebas unitarias de `hayChoque` en `tests/unit/bookings/rules.test.ts` para RF-007: reserva adyacente no choca, solapamiento parcial y total sí, espacios distintos no chocan, una cancelada no choca.
- [X] T013 [P] [US1] Propiedad en `tests/property/bookings/no-overlap.property.test.ts` con `numRuns: 100`: tras cualquier secuencia de reservas aleatorias sobre el servicio, el documento guardado no tiene dos reservas activas solapadas en el mismo espacio.
- [X] T014 [P] [US1] Propiedad en `tests/property/bookings/invalid-input.property.test.ts` con `numRuns: 100`: `reservar`, `cancelar` y `horasLibres` con valores arbitrarios (`unknown`) devuelven `Result` de error y nunca lanzan, el documento no cambia y el mensaje es el del catálogo en español del contrato (RF-013, RF-016).
- [X] T015 [P] [US1] Pruebas de integración en `tests/integration/bookings/booking.integration.test.ts` con el `SpaceService` real: reservar un espacio activo, rechazar uno desactivado e inexistente, rechazar sin sesión, guardar solo `userId` y `spaceId` (RF-015), usar el bloqueo `reservalocal.spaces.v1` y no guardar nada si falla la escritura (RF-016).

### Implementación de la historia de usuario 1

- [X] T016 [US1] Implementar en `src/bookings/validation.ts` `validarSolicitud(input: unknown)` (espacio, fecha, hora en punto, duración entera 1–3, horario 08:00–22:00) y `validarNoPasado(franja, ahora)`, con los mensajes del contrato.
- [X] T017 [US1] Implementar en `src/bookings/rules.ts` las funciones puras `seSolapan` y `hayChoque` (intervalo semiabierto, solo reservas activas del mismo espacio).
- [X] T018 [US1] Implementar `reservar()` en `src/bookings/service.ts`: sesión → validación → reloj → bloqueo `reservalocal.spaces.v1` → releer → `existeYEstaActivo` → `hayChoque` → escribir → devolver.
- [X] T019 [US1] Implementar en `src/bookings/view.ts` el formulario de reserva (espacio activo, fecha, hora de inicio 08:00–21:00, duración 1–3) con mensajes de error en español.

**Punto de control**: Reservar funciona por sí solo (MVP).

---

## Fase 4: Historia de usuario 2 — Ver y cancelar mis reservas (P1)

**Objetivo**: Cada persona ve solo sus reservas y cancela las suyas con el margen de 1
hora; la cancelación libera la franja.

**Prueba independiente**: Con dos usuarios, comprobar que cada uno ve solo lo suyo,
que la cancelación respeta el margen y que la franja cancelada se puede volver a
reservar.

### Pruebas de la historia de usuario 2

- [X] T020 [P] [US2] Pruebas unitarias en `tests/unit/bookings/cancel.test.ts` para RF-009–RF-011: cancelar con 60 minutos aceptado, con 59 rechazado, reserva ajena y reserva inexistente con el mismo mensaje, cancelar dos veces sin error.
- [X] T021 [P] [US2] Propiedad en `tests/property/bookings/cancel.property.test.ts` con `numRuns: 100`: cancelar dos veces deja el mismo documento que cancelar una vez.
- [X] T022 [US2] Ampliar la propiedad de `tests/property/bookings/no-overlap.property.test.ts` para que la secuencia mezcle reservas y cancelaciones de varios usuarios.
- [X] T023 [P] [US2] Pruebas de integración en `tests/integration/bookings/my-bookings.integration.test.ts`: listar solo las propias ordenadas por inicio, cancelar libera la franja para otra persona, una reserva de un espacio desactivado se conserva y se puede cancelar, y un fallo de escritura o de bloqueo al cancelar devuelve error sin cambiar la reserva (RF-016).

### Implementación de la historia de usuario 2

- [X] T024 [US2] Implementar en `src/bookings/rules.ts` `puedeCancelar(reserva, ahora)` (60 minutos o más) y `ordenarPorInicio`.
- [X] T025 [US2] Implementar `cancelar()` y `listarMisReservas()` en `src/bookings/service.ts` según el contrato (mismo bloqueo, idempotencia, `BOOKING_NOT_FOUND` para ajenas).
- [X] T026 [US2] Añadir a `src/bookings/view.ts` la lista «Mis reservas» con estado, nombre del espacio («Espacio desactivado» si ya no está en el catálogo activo) y botón «Cancelar» en las activas.

---

## Fase 5: Historia de usuario 3 — Consultar horas libres (P2)

**Objetivo**: Mostrar los bloques libres de un espacio en una fecha.

**Prueba independiente**: Con reservas activas y canceladas precargadas, consultar las
horas libres y comprobar los bloques.

### Pruebas de la historia de usuario 3

- [X] T027 [P] [US3] Pruebas unitarias en `tests/unit/bookings/free-hours.test.ts` para RF-012: espacio sin reservas (14 bloques), reserva de 10:00 a 12:00 (faltan 10:00 y 11:00), reserva cancelada no ocupa, otra fecha u otro espacio no afectan.
- [X] T028 [P] [US3] Propiedad en `tests/property/bookings/free-hours.property.test.ts` con `numRuns: 100`: horas libres y horas reservadas son disjuntas y juntas forman los 14 bloques del horario.
- [X] T029 [P] [US3] Prueba de integración de `horasLibres()` en `tests/integration/bookings/booking.integration.test.ts`: refleja reservas y cancelaciones; espacio inactivo devuelve `SPACE_NOT_AVAILABLE`.

### Implementación de la historia de usuario 3

- [X] T030 [US3] Implementar en `src/bookings/rules.ts` `bloquesDelHorario`, `horasReservadas` y `calcularHorasLibres`.
- [X] T031 [US3] Implementar `horasLibres()` en `src/bookings/service.ts` (sesión, fecha válida, espacio activo).
- [X] T032 [US3] Añadir a `src/bookings/view.ts` el botón «Ver horas libres», marcando como pasadas las horas del día actual que ya pasaron.

---

## Fase 6: Pulido y transversales

- [X] T033 Publicar en `src/bookings/index.ts` el contrato de `contracts/bookings.md` (tipos, `createBookingService`, `hayChoque`, `calcularHorasLibres`, `leerReservas`, `systemClock`, `mountBookingsView`).
- [X] T034 Enchufar el módulo en `src/main.ts` creando `SpaceService` y `BookingService` con `localStoragePort`, `webLockPort` y `systemClock`, y mostrar el aviso de `initialize()`.
- [X] T035 [P] Propiedad de ida y vuelta en `tests/property/bookings/state.property.test.ts` con `numRuns: 100`: serializar y deserializar conserva cualquier documento válido.
- [X] T036 [P] Prueba de la vista en `tests/integration/bookings/view.integration.test.ts` (jsdom): reservar desde el formulario, ver la reserva y cancelarla.
- [X] T037 [P] Revisar que cada función de `src/bookings/`, de las líneas nuevas de `src/main.ts` y de `tests/helpers/bookings.ts` tenga comentario de requisito y que toda entrada externa se valide.
- [X] T038 Ejecutar `npm test`, `npm run build` y los pasos de `quickstart.md`, y corregir los fallos.

### Tareas añadidas tras `/speckit-analyze`

- [X] T039 [P] Propiedad en `tests/property/bookings/ownership.property.test.ts` con `numRuns: 100` (RF-001, RF-008, RF-011, RF-015): para cualquier conjunto de reservas de varios usuarios, `listarMisReservas` devuelve exactamente las del usuario de la sesión; cancelar una ajena siempre devuelve `BOOKING_NOT_FOUND` sin cambiar el documento; sin sesión, toda operación devuelve `NOT_AUTHENTICATED`; el documento guardado no contiene nombres ni correos.
- [X] T040 [P] Propiedad en `tests/property/bookings/recovery.property.test.ts` con `numRuns: 100` (RF-014): cualquier texto guardado que no sea un documento válido produce respaldo con el texto original, arranque sin reservas y aviso `CORRUPT_STORAGE`.
- [X] T041 Prueba de integración de concurrencia en `tests/integration/bookings/booking.integration.test.ts` (RF-007): dos `reservar` simultáneos (`Promise.all`) sobre la misma franja; exactamente uno tiene éxito y el otro recibe `OVERLAP`.

---

## Dependencias y orden de ejecución

- **Setup (F1)** → **Fundacional (F2)** → historias.
- **US1 (F3)** depende de F2. Es el MVP.
- **US2 (F4)** depende de F2 y usa reservas creadas con `reservar()` de US1.
- **US3 (F5)** depende de F2; sus pruebas pueden usar documentos precargados.
- **Pulido (F6)** depende de las historias entregadas. T039–T041 dependen de US1 y
  US2.

Dentro de cada historia: pruebas → reglas puras → servicio → vista. T003 precede a
T004–T009. T016 y T017 preceden a T018. T024 precede a T025. T030 precede a T031.

## Oportunidades de paralelismo

- T001 y T002; T004, T005 y T007 (archivos distintos).
- En US1, T011–T015 se escriben en paralelo.
- En US2, T020, T021 y T023 en paralelo; T022 toca el archivo de T013.
- En US3, T027 y T028 en paralelo; T029 comparte archivo con T015.
- `service.ts` y `view.ts` los tocan varias historias: no paralelizar esas tareas.

## Estrategia de implementación

1. F1 + F2 + US1 → MVP: se puede reservar.
2. US2 → ver y cancelar.
3. US3 → horas libres.
4. Pulido: contrato, `main.ts`, vista probada, `npm test` y `npm run build`.
