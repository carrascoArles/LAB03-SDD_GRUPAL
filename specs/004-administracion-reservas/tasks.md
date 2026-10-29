# Tareas: Administración de reservas

**Entrada**: Documentos de diseño de `/specs/004-administracion-reservas/`

**Prerequisitos**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/admin.md`, `quickstart.md`

**Pruebas**: Requeridas por la especificación, la petición del usuario y la
constitución: unitarias, integración y propiedades fast-check con mínimo 100
ejecuciones por propiedad.

**Gobernanza**: La constitución v1.1.0 aprobó una excepción temporal para que 004
importe únicamente los helpers internos enumerados en el principio I. La deuda se
retira cuando 003 publique esos helpers en su contrato. No modificar archivos bajo
`src/bookings/`.

## Formato

`[ID] [P?] [Story?] Descripción con rutas de archivo`

- `[P]` identifica trabajo paralelizable que no depende de tareas incompletas.
- `[US1]`, `[US2]` y `[US3]` corresponden a las historias de usuario de `spec.md`.
- Toda prueba basada en propiedades debe configurar `numRuns: 100` como mínimo.

## Fase 1: Preparación y registro de aprobación

**Propósito**: Registrar en el plan la aprobación constitucional que habilita el
alcance de implementación de 004.

- [X] T001 Registrar la aprobación de la excepción temporal aprobada en la constitución v1.1.0 y actualizar el estado de la puerta constitucional en `specs/004-administracion-reservas/plan.md`; mantener la prohibición de modificar `src/bookings/`

## Fase 2: Fundamentos compartidos

**Propósito**: Preparar los tipos, errores y utilidades de pruebas compartidos por
las historias. Todos los elementos de esta fase dependen de T001.

- [X] T002 Definir `AdminErrorCode`, `AdminError` y mensajes en español en `src/admin/model.ts`; cubrir permiso denegado, sesión no verificable y errores de reservas, almacenamiento y bloqueo según `specs/004-administracion-reservas/contracts/admin.md`
- [X] T003 Crear el punto de entrada de `src/admin/index.ts` y exportar `AdminService`, `AdminDependencies`, `AdminError`, `AdminErrorCode`, `mountAdminView` y las operaciones previstas por `specs/004-administracion-reservas/contracts/admin.md`
- [X] T004 [P] Crear fixtures de reservas, AuthService, StoragePort y LockPort simulados reutilizables para pruebas de `tests/helpers/admin.ts`, sin modificar los helpers de bookings

**Checkpoint**: La excepción constitucional ya está aprobada; completar fundamentos
antes de iniciar las historias.

## Fase 3: Historia de usuario 1 — Consultar todas las reservas (Prioridad: P1)

**Objetivo**: El administrador consulta una sola vez todas las reservas, incluidas
las canceladas y las propias, ordenadas por inicio.

**Prueba independiente**: Con registros activos y cancelados de usuarios distintos,
la consulta de admin devuelve todas las reservas en orden cronológico; errores de
lectura no se presentan como una lista vacía.

**Dependencias**: T001–T004.

### Pruebas de historia de usuario 1

- [X] T005 [P] [US1] Añadir pruebas unitarias para lista completa, estados activos y cancelados, empate de inicio ordenado por id, lista vacía y error de lectura en `tests/unit/admin/list-bookings.test.ts`
- [X] T006 [P] [US1] Añadir propiedad fast-check que compruebe que para cualquier conjunto válido la consulta de admin conserva exactamente todos los ids y aplica orden por inicio/id con `numRuns: 100` o más en `tests/property/admin/list-bookings.property.test.ts`
- [X] T007 [P] [US1] Añadir prueba de integración de listado con StoragePort simulado para confirmar que `leerReservas` valida y devuelve el documento compartido sin filtrar por propietario en `tests/integration/admin/list-bookings.integration.test.ts`

### Implementación de historia de usuario 1

- [X] T008 [US1] Implementar `listarReservas()` en `src/admin/service.ts`: comprobar rol antes de leer, reutilizar `leerReservas` y `ordenarPorInicio`, devolver todas las reservas y mapear errores explícitos según `specs/004-administracion-reservas/contracts/admin.md`
- [X] T009 [P] [US1] Crear la estructura DOM accesible para la lista de administración, estados activo/cancelado, estado vacío y errores en español en `src/admin/view.ts`
- [X] T010 [P] [US1] Definir estilos propios de la lista administrativa, estados y vista adaptable en `src/admin/admin.css`
- [X] T011 [US1] Montar `AdminService` y `mountAdminView` en el ensamblaje de la aplicación sin editar módulos de reservas en `src/main.ts`

**Checkpoint**: Ejecutar los casos de T005–T007 y comprobar que la consulta global
funciona independientemente de la cancelación administrativa.

## Fase 4: Historia de usuario 2 — Cancelar una reserva como administrador (Prioridad: P1)

**Objetivo**: Admin cancela una reserva propia o ajena cuando faltan al menos 60
minutos; una operación repetida sobre una reserva cancelada es idempotente.

**Prueba independiente**: Con una reserva de otro usuario, una cancelación a
60 minutos actualiza el documento compartido; a 59 minutos no lo modifica; repetir
la cancelación no escribe de nuevo ni cambia `cancelledAt`.

**Dependencias**: Fase 2 y T008 para el servicio; T009 para actualizar la vista.

### Pruebas de historia de usuario 2

- [X] T012 [P] [US2] Añadir pruebas unitarias para cancelar reserva ajena a 60 minutos, rechazar a 59, no existente, id inválido, cancelada sin reloj disponible y repetición sin escritura en `tests/unit/admin/cancel-booking.test.ts`
- [X] T013 [P] [US2] Añadir propiedades fast-check para equivalencia con `puedeCancelar` y para idempotencia exacta (incluido almacenamiento y `cancelledAt` sin cambios), con `numRuns: 100` o más por propiedad en `tests/property/admin/cancel-booking.property.test.ts`
- [X] T014 [P] [US2] Añadir integración que verifique cancelación administrativa de una reserva ajena, relectura dentro del mismo LockPort de 003, persistencia mediante `guardarReservas`, y fallos de bloqueo/escritura sin falsos éxitos en `tests/integration/admin/cancel-booking.integration.test.ts`

### Implementación de historia de usuario 2

- [X] T015 [US2] Implementar `cancelarReserva(bookingId)` en `src/admin/service.ts`: validar id, comprobar rol, usar LockPort y nombre de bloqueo de bookings, releer reservas bajo bloqueo, omitir reloj/escritura si ya está cancelada, reutilizar `puedeCancelar`, `marcarCancelada`, `reemplazarReserva` y `guardarReservas`, y devolver errores sin modificar ante rechazos
- [X] T016 [US2] Añadir botón de cancelar solo para reservas activas; actualizar la lista y mostrar confirmación/error tras el resultado del servicio en `src/admin/view.ts`

**Checkpoint**: Ejecutar T012–T014; verificar de forma explícita los límites de
60/59 minutos y que el horario cancelado queda actualizado en el documento leído
por 003.

## Fase 5: Historia de usuario 3 — Restringir la administración a administradores (Prioridad: P1)

**Objetivo**: Usuarios normales no obtienen datos ni pueden cancelar reservas
ajenas; los errores de permiso se informan en español.

**Prueba independiente**: Invocar ambas operaciones como usuario normal y con
estado de autenticación no verificable; confirmar error de permiso/autenticación
sin exponer datos, escribir o eliminar la sección administrativa tras un cambio de
sesión.

**Dependencias**: Fase 2; pruebas de operaciones dependen de T008 y T015; pruebas
de visibilidad de la vista dependen de T009 y T016.

### Pruebas de historia de usuario 3

- [X] T017 [P] [US3] Añadir pruebas unitarias para denegación de listar y cancelar antes de leer almacenamiento y mensaje exacto «No tienes permiso para administrar las reservas.» en `tests/unit/admin/authorization.test.ts`
- [X] T018 [P] [US3] Añadir propiedad fast-check para roles no administradores: listar no devuelve datos y cancelar no altera documento ni invoca escritura, con `numRuns: 100` o más en `tests/property/admin/authorization.property.test.ts`
- [X] T019 [P] [US3] Añadir integración jsdom para limpiar el listado al cambiar la sesión a usuario normal, mostrar error accesible en español y conservar el documento en `tests/integration/admin/view.integration.test.ts`

### Implementación de historia de usuario 3

- [X] T020 [US3] Mostrar retroalimentación accesible en español para permiso denegado y error de verificación, y limpiar toda lista global visible cuando el permiso no sea válido en `src/admin/view.ts`
- [X] T021 [US3] Consultar `AuthService.isAdmin()` al renderizar, volver a renderizar ante `reservalocal:session-change` y mostrar u ocultar el panel sin conservar datos al cambiar de sesión en `src/admin/view.ts`

**Checkpoint**: Ejecutar T017–T019; comprobar que service y UI rechazan el acceso y
que no hay lecturas previas que revelen reservas.

## Fase 6: Pulido y validación transversal

**Propósito**: Verificar cobertura de requisitos, compilación y guía de validación.

- [X] T022 Revisar que cada operación pública del módulo tenga comentario de requisito y tipos `Result` explícitos en `src/admin/model.ts`, `src/admin/service.ts`, `src/admin/view.ts` y `src/admin/index.ts`
- [X] T023 [P] Cubrir errores de autenticación no verificable, corrupción/lectura del documento, errores de almacenamiento y bloqueo sin falsos éxitos en las pruebas unitarias y de integración de `tests/unit/admin/` y `tests/integration/admin/`
- [ ] T024 Ejecutar `npm test` y `npm run build`, y completar los casos manuales y resultados esperados de `specs/004-administracion-reservas/quickstart.md`; corregir solo fallos relacionados con 004 sin modificar `src/bookings/`

La suite automatizada y la compilación ya se ejecutaron correctamente. Queda
pendiente el recorrido manual en navegador descrito en `quickstart.md`.

## Dependencias y orden de ejecución

### Dependencias de fase

- **Preparación (Fase 1)**: T001 registra la aprobación ya otorgada; habilita las siguientes tareas.
- **Fundamentos (Fase 2)**: depende de T001; proporciona errores, tipos y helpers de prueba.
- **Historia 1 (Fase 3)**: depende de la Fase 2; entrega consulta global.
- **Historia 2 (Fase 4)**: depende de la Fase 2 y de la interfaz de la Historia 1 para añadir cancelación a la vista.
- **Historia 3 (Fase 5)**: las pruebas de servicio pueden prepararse en paralelo después de T004, pero la verificación final requiere las operaciones de las Historias 1 y 2.
- **Pulido (Fase 6)**: depende de las historias y de la aprobación de la puerta constitucional.

### Dependencias entre historias

- **US1**: puede comenzar después de la Fase 2; es el primer incremento visible.
- **US2**: el servicio depende solo de la Fase 2; la vista actualiza `src/admin/view.ts` después de US1 para evitar conflictos de edición.
- **US3**: autorización del servicio debe estar presente antes de exponer cualquiera de las operaciones; sus pruebas de regresión dependen de ambas operaciones implementadas.

### Oportunidades de paralelismo

- T004 es independiente de T002 y T003 una vez levantada la puerta T001.
- Dentro de US1, T005, T006 y T007 pueden prepararse en paralelo; T009 y T010 modifican archivos distintos.
- Dentro de US2, T012, T013 y T014 pueden desarrollarse en paralelo; implementación de servicio y vista espera sus respectivas pruebas.
- Dentro de US3, T017 y T018 pueden desarrollarse en paralelo; T019 requiere la estructura de UI de US1/US2.
- US1 y pruebas iniciales de US2 solo pueden paralelizarse si no hay edición simultánea del mismo `service.ts` o `view.ts`.

## Ejemplo de ejecución paralela

```text
Después de T001–T004:
- T005 tests/unit/admin/list-bookings.test.ts
- T006 tests/property/admin/list-bookings.property.test.ts
- T007 tests/integration/admin/list-bookings.integration.test.ts

Después de T011:
- T012 tests/unit/admin/cancel-booking.test.ts
- T013 tests/property/admin/cancel-booking.property.test.ts
- T014 tests/integration/admin/cancel-booking.integration.test.ts
```

## Estrategia de implementación

### MVP

La consulta global de US1 es el primer incremento demostrable, pero solo puede
entregarse junto con la autorización de US3 para evitar una lista sin protección.
El MVP incluye T001–T011 y T017/T020/T021, junto con sus pruebas aplicables.
US2 añade la cancelación administrativa.

### Entrega incremental

1. Registrar T001 y preparar fundamentos.
2. Implementar consulta global y autorización; validar con pruebas unitarias,
   propiedades e integración.
3. Implementar cancelación, límites y vista; validar idempotencia y escritura.
4. Completar pruebas de cambio de sesión, manejo de fallos y quickstart.
5. Si una tarea requiere importar un helper distinto de los autorizados por la
   constitución, detenerse y solicitar aprobación antes de continuar.

## Validación de formato

- Todas las tareas tienen checkbox, identificador secuencial y ruta de archivo.
- Cada tarea en fases de historias tiene etiqueta `[US1]`, `[US2]` o `[US3]`.
- `[P]` solo marca tareas de archivos separados que pueden ejecutarse en paralelo.
- Las tareas de prueba indican el archivo exacto y los límites de ejecución de
  fast-check.
