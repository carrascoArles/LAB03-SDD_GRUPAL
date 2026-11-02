# Tareas: Catálogo de espacios

**Entrada**: Documentos de diseño de `specs/002-catalogo-espacios/`

**Prerequisitos**: `plan.md`, `spec.md`, `research.md`, `data-model.md` y
`contracts/spaces.md`.

**Pruebas**: Incluidas por los requisitos de pruebas de la constitución y porque
fast-check es una petición explícita del usuario. Cada propiedad debe ejecutarse
como mínimo 100 veces.

**Organización**: Tareas agrupadas por historia de usuario para permitir
implementación y verificación incremental.

## Formato

- Cada tarea usa `- [ ] Tnnn [P] [USn] descripción con ruta`.
- `[P]` identifica tareas que pueden ejecutarse en paralelo porque modifican
  archivos distintos y no dependen de tareas pendientes.
- Las fases de Setup y Fundacional no usan etiqueta de historia; cada tarea en una
  fase de historia sí la lleva.

## Convenciones de rutas

- Proyecto único: código bajo `src/` y pruebas bajo `tests/`, desde la raíz.
- Las pruebas reutilizan las convenciones de `tests/helpers/auth.ts` y Vitest.

---

## Fase 1: Setup

**Propósito**: Preparar los directorios y dependencias de prueba de la funcionalidad
sin agregar herramientas, porque Vite, Vitest y fast-check ya están instalados.

- [X] T001 [P] Crear el helper `tests/helpers/spaces.ts` con almacenamiento, bloqueo y AuthService simulados, siguiendo el patrón de `tests/helpers/auth.ts`.
- [X] T002 [P] Crear los directorios `src/spaces/`, `tests/unit/spaces/`, `tests/property/spaces/` y `tests/integration/spaces/` según la estructura de `specs/002-catalogo-espacios/plan.md`.

---

## Fase 2: Fundacional

**Propósito**: Establecer los tipos y el estado persistido que requieren todas las
historias antes de implementar operaciones del catálogo.

- [X] T003 [P] Definir `Space`, `SpaceType`, `SpaceInput`, `SpaceState`, `SpaceError` y sus códigos en `src/spaces/model.ts`, respetando los campos de `specs/002-catalogo-espacios/data-model.md`.
- [X] T004 Añadir pruebas unitarias de decodificación y serialización en `tests/unit/spaces/state.test.ts`, cubriendo documento vacío, JSON corrupto, campos desconocidos, ids duplicados, nombres duplicados por mayúsculas, campos mal tipados y conservación del estado al serializar y deserializar.
- [X] T005 Implementar en `src/spaces/state.ts` la validación en tiempo de ejecución del documento `reservalocal.spaces.v1`, incluidos `schemaVersion: 1`, claves permitidas, ids únicos, nombres únicos sin distinguir mayúsculas y todos los espacios activos e inactivos.
- [X] T006 Crear el arnés del servicio `createSpaceService` e `initialize()` en `src/spaces/service.ts`, inyectando `StoragePort`, `LockPort` y `AuthService`; devolver `Result` tipado y propagar fallos de lectura sin presentarlos como catálogo vacío exitoso.

**Punto de control**: Modelo, persistencia validada, inicialización y dependencias
simuladas listas; las historias pueden implementarse sin acceder directamente a
`localStorage`.

---

## Fase 3: Historia de usuario 1 — Gestionar espacios (Prioridad: P1) — MVP

**Objetivo**: Permitir a `admin` crear, editar y desactivar espacios válidos,
rechazando datos inválidos y operaciones no autorizadas sin cambios parciales.

**Prueba independiente**: Con un AuthService simulado como `admin`, crear y editar
espacios válidos, comprobar unicidad y límites, y desactivar un espacio; repetir las
mutaciones como rol `usuario` y confirmar el error «No tienes permiso para gestionar
espacios» sin cambios en almacenamiento.

### Pruebas de la historia de usuario 1

- [X] T007 [P] [US1] Añadir pruebas unitarias para RF-003–RF-009 en `tests/unit/spaces/validation.test.ts` y `tests/unit/spaces/management.test.ts`, cubriendo nombres de 2/3/50/51 caracteres, capacidades 0/1/100/101 y decimales, los tres tipos permitidos, descripciones de 0/200/201 caracteres, unicidad propia y ajena, mutaciones admin y errores de permiso.
- [X] T008 [P] [US1] Añadir propiedades fast-check para RF-003–RF-009 en `tests/property/spaces/validation.property.test.ts` y `tests/property/spaces/management.property.test.ts`, configurando `numRuns: 100` como mínimo para cada propiedad de autorización, validación, unicidad y ausencia de cambios ante entradas inválidas.
- [X] T009 [P] [US1] Añadir propiedades de unicidad para RF-004 en `tests/property/spaces/uniqueness.property.test.ts` con `numRuns: 100` como mínimo por propiedad, verificando que nombres duplicados se rechazan al crear y editar sin distinguir mayúsculas, que los inactivos también reservan su nombre y que editar el propio nombre no produce duplicado.
- [X] T010 [P] [US1] Añadir pruebas de integración con `StoragePort` simulado para RF-003–RF-009 en `tests/integration/spaces/management.integration.test.ts`, verificando alta, edición, desactivación, permisos, mensajes, validación y ausencia de cambios ante entradas inválidas o escritura fallida.

### Implementación de la historia de usuario 1

- [X] T011 [US1] Implementar validadores puros para nombre, tipo, capacidad, descripción y `SpaceInput` en `src/spaces/validation.ts`, contando puntos de código Unicode y devolviendo errores tipados en español con los límites definidos en RF-004–RF-008.
- [X] T012 [US1] Implementar en `src/spaces/service.ts` la autorización de mutaciones con `AuthService.isAdmin()`, usando el mensaje «No tienes permiso para gestionar espacios» para rol `usuario` y rechazando sin modificar datos cuando no se pueda verificar el permiso.
- [X] T013 [US1] Implementar `createSpace()` y `updateSpace()` en `src/spaces/service.ts`; validar la entrada completa, releer el documento bajo el bloqueo `reservalocal.spaces.v1`, aplicar unicidad sin distinguir mayúsculas excluyendo el id editado, y confirmar el resultado solo después de persistir.
- [X] T014 [US1] Implementar `deactivateSpace()` en `src/spaces/service.ts` para cambiar solo `active` a `false`, conservar todos los demás campos y devolver error tipado si falla autorización, búsqueda, bloqueo o escritura.
- [X] T015 [US1] Añadir al módulo `src/spaces/index.ts` las exportaciones públicas de `Space`, `SpaceType`, `SpaceInput`, `SpaceError` y `SpaceService` que requiere `specs/002-catalogo-espacios/contracts/spaces.md`.
- [X] T016 [US1] Implementar los controles de crear, editar y desactivar en `src/spaces/view.ts`, presentando errores de validación y autorización en español sin duplicar la lógica de dominio ni confiar en ocultar controles como autorización.

**Punto de control**: La gestión administrativa es demostrable con almacenamiento
simulado y satisface por sí sola el alcance MVP.

---

## Fase 4: Historia de usuario 2 — Consultar catálogo y detalle (Prioridad: P1)

**Objetivo**: Permitir a usuarios con sesión consultar exclusivamente los espacios
activos y abrir el detalle de cada uno.

**Prueba independiente**: Con espacios activos e inactivos precargados y un usuario
autenticado, comprobar que el catálogo contiene solo los activos y que los detalles
muestran todos sus campos; sin sesión, confirmar rechazo con mensaje en español.

### Pruebas de la historia de usuario 2

- [X] T017 [P] [US2] Añadir pruebas unitarias para RF-001, RF-002, RF-012 y RF-013 en `tests/unit/spaces/catalog.test.ts`, cubriendo listado exclusivamente activo, detalle, todos los campos, consulta anónima y mensajes de error de validación.
- [X] T018 [P] [US2] Añadir pruebas de integración con `StoragePort` simulado para RF-001, RF-002, RF-012 y RF-013 en `tests/integration/spaces/catalog.integration.test.ts`; crear 20 espacios mixtos y verificar el detalle de cada activo, que ningún inactivo se expone y que consultas anónimas reciben el mensaje en español.
- [X] T019 [P] [US2] Añadir propiedades fast-check para RF-001, RF-002, RF-012 y RF-013 en `tests/property/spaces/catalog.property.test.ts`, con `numRuns: 100` como mínimo por propiedad, comprobando que cualquier catálogo generado solo expone activos, que una sesión ausente nunca obtiene datos y que los errores de validación identifican el campo en español.

### Implementación de la historia de usuario 2

- [X] T020 [US2] Implementar `listActiveSpaces()` y `getActiveSpace(id)` en `src/spaces/service.ts`, filtrando espacios inactivos, validando sesión mediante `AuthService` y devolviendo errores tipados en español para usuarios anónimos o ids no disponibles.
- [X] T021 [US2] Completar la sección de catálogo y detalle en `src/spaces/view.ts`, mostrando nombre, tipo, capacidad y descripción si existe, y estados vacíos, errores de sesión y errores de almacenamiento en español.

**Punto de control**: Las consultas autenticadas presentan exactamente los espacios
activos y sus datos sin revelar espacios inactivos como opciones.

---

## Fase 5: Historia de usuario 3 — Mantener disponibilidad y datos (Prioridad: P2)

**Objetivo**: Mantener la información y reservas históricas al desactivar un espacio,
impidiendo reservas nuevas mediante el contrato de disponibilidad.

**Prueba independiente**: Precargar un espacio activo y un registro de reserva
histórica en almacenamiento simulado, desactivar el espacio, comprobar que la reserva
no se altera y que `existeYEstaActivo(id)` devuelve falso; para un espacio activo,
comprobar que devuelve verdadero.

### Pruebas de la historia de usuario 3

- [X] T022 [P] [US3] Añadir pruebas de integración con `StoragePort` simulado para RF-010 en `tests/integration/spaces/availability.integration.test.ts`, verificando `existeYEstaActivo()` para espacios activos, inactivos e inexistentes y que un consumidor de reserva no persiste una nueva reserva si la comprobación resulta falsa bajo el mismo bloqueo.
- [X] T023 [P] [US3] Añadir pruebas de integración con `StoragePort` simulado para RF-011 en `tests/integration/spaces/deactivation.integration.test.ts`, preparando una clave de reservas independiente y verificando que `deactivateSpace()` conserva el espacio y deja intactas las reservas existentes.
- [X] T024 [P] [US3] Añadir pruebas unitarias para RF-010 y RF-011 en `tests/unit/spaces/availability.test.ts`, cubriendo la transición activo→inactivo, persistencia del registro, exclusión de disponibilidad y conservación de campos existentes.
- [X] T025 [P] [US3] Añadir propiedades fast-check para RF-010 y RF-011 en `tests/property/spaces/availability.property.test.ts`, con `numRuns: 100` como mínimo por propiedad, comprobando que desactivar cualquier espacio impide su disponibilidad y conserva todos sus campos e identificador.

### Implementación de la historia de usuario 3

- [X] T026 [US3] Implementar `SpaceService.existeYEstaActivo(id)` en `src/spaces/service.ts`, devolviendo `Ok(true)` solo para un espacio existente y activo, `Ok(false)` para inactivo o ausente, y `Err` ante fallos de lectura o corrupción.
- [X] T027 [US3] Exportar el método `existeYEstaActivo(id)` mediante el tipo y la instancia pública `SpaceService` en `src/spaces/index.ts`, conservando exactamente la firma documentada en `specs/002-catalogo-espacios/contracts/spaces.md`.

**Punto de control**: El módulo expone una consulta tipada de disponibilidad y
desactivar un espacio no borra el espacio ni modifica las reservas ya almacenadas.

---

## Fase 6: Pulido y preocupaciones transversales

**Propósito**: Integrar el módulo, comprobar el flujo completo y verificar todos los
requisitos sin alterar funcionalidades existentes.

- [X] T028 Conectar `createSpaceService`, `StoragePort`, `LockPort`, `AuthService` y `mountSpacesView` en `src/main.ts`, inicializando el estado y presentando errores de inicio en español sin bloquear el resto de la aplicación.
- [X] T029 [P] Completar pruebas de serialización y propiedad de ida y vuelta en `tests/property/spaces/state.property.test.ts` con `numRuns: 100` como mínimo, verificando que serializar y deserializar preserva los espacios activos e inactivos.
- [X] T030 [P] Revisar `src/spaces/` y `tests/` para que cada función incluya comentario de requisito, cada entrada externa se valide en tiempo de ejecución y cada operación de dominio devuelva `Result` o `Promise<Result>`.
- [X] T031 Ejecutar los escenarios de `specs/002-catalogo-espacios/quickstart.md`, correr `npm test` y `npm run build`, y corregir cualquier fallo funcional o de tipos en los archivos afectados.

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Setup (Fase 1)**: no depende de otras fases.
- **Fundacional (Fase 2)**: depende de Setup y bloquea las historias.
- **US1 (Fase 3)**: depende de Fundacional; es el incremento MVP.
- **US2 (Fase 4)**: depende de Fundacional y de la interfaz del servicio consolidada
  en US1 para integrar la vista en `src/spaces/view.ts`.
- **US3 (Fase 5)**: depende del modelo y almacenamiento Fundacional; la prueba de
  conservación verifica la desactivación de US1. No implementa el sistema de reservas,
  que está fuera del alcance de esta funcionalidad.
- **Pulido (Fase 6)**: depende de las historias que se decida entregar y ejecuta la
  integración final.

### Dependencias entre historias

- **US1 (P1)**: comienza después de Fundacional. Entrega la creación, edición,
  desactivación y autorización administrativa.
- **US2 (P1)**: comienza después de Fundacional; la integración final de la vista
  sigue a US1 porque ambas historias amplían `src/spaces/view.ts`.
- **US3 (P2)**: comienza después de Fundacional; sus pruebas de conservación dependen
  de `deactivateSpace()` de US1. El método de disponibilidad puede probarse con
  estados precargados. La integración con el creador real de reservas y la propiedad
  de no solapamiento pertenecen a la funcionalidad de reservas, pendiente de
  especificar; T021 verifica el contrato del consumidor simulado para esta feature.
- **Orden recomendado**: US1 → US2 → US3, manteniendo cada historia verificable con
  dependencias simuladas.

### Dependencias dentro de fases

- T003 precede a T004 y T005; T004 precede a T005; T005 precede a T006.
- En US1, las pruebas T007–T010 se escriben antes de la implementación T011–T016;
  T011 precede a T013. Las pruebas unitarias y de propiedades T007–T009 pueden
  desarrollarse en paralelo al estar en archivos distintos.
- En US2, T017–T019 preceden a T020 y T021; las pruebas pueden ejecutarse en
  paralelo en archivos diferentes.
- En US3, T022–T025 preceden a T026–T027; las pruebas pueden ejecutarse
  en paralelo.
- T028 integra el módulo después de los contratos y la vista. T029 y T030 pueden
  desarrollarse en paralelo si no modifican archivos compartidos; T031 valida el
  resultado integrado.

## Oportunidades de paralelismo

- **Setup**: T001 y T002 modifican rutas distintas y pueden ejecutarse en paralelo.
- **Fundacional**: T003 y T002 son independientes en archivos distintos; T005 puede
  iniciarse tras acordar la forma de los tipos, pero sus pruebas requieren T003/T004.
- **US1**: T007, T008, T009 y T010 cubren archivos separados y pueden escribirse en
  paralelo contra los contratos; T011 valida un archivo separado de las pruebas.
- **US2**: T017–T019 pueden escribirse en paralelo; implementar la lista y la
  vista en un solo cambio de servicio/vista evita conflictos con otros cambios de
  esas rutas.
- **US3**: T022–T025 pueden escribirse en paralelo; la implementación del contrato
  público debe concordar con la prueba de integración y el bloqueo compartido.
- No se recomienda paralelizar la integración de US1 y US2 sobre `view.ts`, ni US1 y
  US3 sobre `service.ts`, para evitar conflictos y mantener el contrato consistente.

## Estrategia de implementación

### MVP primero (solo Historia de usuario 1)

1. Completar Setup y Fundacional (T001–T006).
2. Escribir pruebas e implementar US1 (T007–T016).
3. Verificar los casos de aceptación de creación, edición, validación, unicidad,
   permisos y desactivación con pruebas enfocadas.
4. Entregar el MVP de gestión administrativa sin esperar a la vista de consulta ni a
   la integración con reservas.

### Incrementos siguientes

1. Implementar US2 para habilitar catálogo y detalle para usuarios autenticados.
2. Implementar US3 para exponer la disponibilidad requerida por futuras reservas y
   demostrar que las reservas históricas permanecen intactas.
3. Integrar la aplicación y ejecutar el quickstart, la suite Vitest y el build.
