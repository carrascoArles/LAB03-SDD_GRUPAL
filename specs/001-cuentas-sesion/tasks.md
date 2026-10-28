# Tareas: Cuentas y sesión

**Entrada**: documentos de diseño en `specs/001-cuentas-sesion/`

**Prerequisitos**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/auth.md` y `quickstart.md`.

**Pruebas**: obligatorias según la constitución y la estrategia indicada por la
especificación y el plan. Cada requisito funcional debe cubrirse con pruebas
unitarias, propiedades fast-check de al menos 100 ejecuciones e integración con
almacenamiento simulado.

**Organización**: tareas agrupadas por historia para que cada incremento pueda
implementarse y verificarse por separado una vez completadas las bases compartidas.

## Fase 1: Preparación

**Propósito**: inicializar la SPA y herramientas comunes.

- [X] T001 Crear `package.json` con scripts `dev`, `build` y `test`, y dependencias de Vite, TypeScript, Vitest y fast-check según `specs/001-cuentas-sesion/plan.md`.
- [X] T002 [P] Crear `tsconfig.json` con `strict: true` y configuración de módulos TypeScript compatible con Vite.
- [X] T003 [P] Crear `vite.config.ts` para compilar la SPA y ejecutar Vitest con el entorno de navegador elegido.
- [X] T004 [P] Crear `index.html` con el punto de montaje de la aplicación y cargar `src/main.ts`.

## Fase 2: Bases compartidas

**Propósito**: preparar contratos y adaptadores que bloquean todas las historias de usuario.

**⚠️ CRÍTICO**: completar esta fase antes de implementar historias.

- [X] T005 Crear `src/shared/result.ts` con un tipo discriminado `Result<T, E>` y constructores/guardas tipados para resultados exitosos y errores, sin excepciones; comentar las funciones con los requisitos de manejo de error que cubren.
- [X] T006 [P] Crear `src/shared/storage-port.ts` con el contrato `StoragePort` para leer, escribir y borrar valores serializados, devolviendo errores tipados.
- [X] T007 Crear `src/shared/local-storage.ts` como adaptador de `StoragePort`; convertir errores del navegador, incluido almacenamiento no disponible y cuota excedida, en resultados explícitos.
- [X] T008 [P] Crear `src/shared/lock-port.ts` y `src/shared/web-lock.ts` con un `LockPort` de exclusión mutua y adaptador Web Locks; devolver error tipado si Web Locks no está disponible y nunca ejecutar una escritura sin bloqueo; comentar las funciones con los requisitos que cubren.
- [X] T009 [P] Crear `src/auth/model.ts` con `User`, `UserRole`, `UserRecord`, `Session` y `AuthState`; conservar literalmente las restricciones del modelo: `id` «Identificador único, no vacío e inmutable»; `name` «Texto recortado, de 2 a 50 puntos de código Unicode inclusive»; `email` «Correo validado, recortado y normalizado a minúsculas; único tras normalizar»; `role` «admin o usuario, asignado por la regla de primer registro»; algoritmo `"sha256-salt-v1"`; sal «Sal aleatoria única de 16 bytes (32 caracteres hexadecimales)»; hash «Digest SHA-256 de 32 bytes (64 caracteres hexadecimales)»; `userId` «Debe corresponder a un UserRecord válido»; `schemaVersion: 1`; `users: UserRecord[]`; `sessionUserId: string | null`. El modelo público no contiene contraseña, sal ni hash.
- [X] T010 Crear `src/main.ts` para inicializar el punto de montaje de auth, construir los adaptadores compartidos y dejar un punto explícito donde se conectarán los futuros módulos de espacios, reservas y administración.

**Punto de control**: infraestructura tipada, persistencia y coordinación disponibles.

## Fase 3: Historia de usuario 1 — Crear una cuenta (Prioridad: P1)

**Objetivo**: permitir registros válidos, asignar el primer rol administrador y
rechazar datos incorrectos o duplicados.

**Prueba independiente**: desde un almacén vacío, registrar la primera y segunda
cuenta, validar sus roles y comprobar que las entradas inválidas o correos duplicados
no alteran el almacenamiento.

### Pruebas de la historia 1

- [X] T011 [P] [US1] Crear `tests/unit/auth/validation.test.ts` y `tests/unit/auth/registration.test.ts` con casos de nombre de 1, 2, 50 y 51 caracteres; contraseña de 7, 8, 64 y 65 caracteres; correo vacío o inválido; recorte y normalización; registro, primer rol admin, errores tipados, mensajes en español y ausencia de contraseña en texto plano (RF-001–RF-006, RF-015–RF-017).
- [X] T012 [P] [US1] Crear `tests/property/auth/registration.property.test.ts` con al menos 100 ejecuciones por propiedad para entradas inválidas que devuelven error sin excepción, unicidad de correo normalizado, rol único de primer administrador, hash distinto de la contraseña en texto plano, resultados de validación en español y ausencia de excepciones (RF-001–RF-006, RF-015–RF-017).
- [X] T013 [P] [US1] Crear `tests/integration/auth/registration.integration.test.ts` con `StoragePort` y `LockPort` simulados para primer registro admin, registros posteriores usuario, dos registros concurrentes con un solo admin, correo duplicado, fallos de persistencia y documento persistido sin contraseña en texto plano (RF-001–RF-006, RF-015–RF-017).

### Implementación de la historia 1

- [X] T014 [P] [US1] Crear `src/auth/validation.ts` para validar en ejecución nombre recortado de 2–50 puntos de código Unicode, correo válido normalizado a minúsculas y contraseña de 8–64 puntos de código sin recortar; añadir comentarios con los requisitos RF-002–RF-005 que cubre cada función.
- [X] T015 [P] [US1] Crear `src/auth/password.ts` para generar una sal única criptográficamente aleatoria de 16 bytes y calcular `SHA-256(salBytes || UTF8(contraseña))` con Web Crypto; persistir solo algoritmo, sal y hash, y documentar RF-015 y la limitación didáctica.
- [X] T016 [US1] Crear `src/auth/service.ts` con `registerUser`: validar entrada, derivar credencial, adquirir el bloqueo exclusivo, releer y validar estado, rechazar correo ya usado, asignar `admin` solo si no hay cuentas, guardar y devolver solo `User` público tras confirmar escritura; cubrir RF-001–RF-006, RF-015 y RF-016 con comentarios de requisito en cada función.
- [X] T017 [US1] Crear `src/auth/view.ts` con formulario de registro accesible, mensajes de validación en español y presentación del rol asignado sin exponer credenciales; cubrir RF-001–RF-006 y RF-017.
- [X] T018 [US1] Conectar el formulario de registro con el servicio y el punto de montaje de `src/main.ts`; mostrar éxito solo después de persistencia confirmada y mostrar errores tipados en español (RF-001, RF-006, RF-016–RF-017).

**Punto de control**: registro independiente funcional; límites, duplicados, roles,
hash y persistencia verificados.

## Fase 4: Historia de usuario 2 — Iniciar y cerrar sesión (Prioridad: P1)

**Objetivo**: autenticar credenciales, mantener la sesión entre recargas y permitir
cerrarla con resultados fiables.

**Prueba independiente**: registrar una cuenta, iniciar sesión con credenciales
correctas e incorrectas, recargar y luego cerrar sesión; comprobar estado y mensajes.

**Dependencia**: requiere la cuenta, credenciales y persistencia de la historia 1.

### Pruebas de la historia 2

- [X] T019 [P] [US2] Crear `tests/unit/auth/login.test.ts` y `tests/unit/auth/session.test.ts` para comparación de credenciales, correo normalizado, mensaje idéntico ante correo inexistente o contraseña incorrecta, login persistido, cierre de sesión y estado anónimo posterior (RF-007–RF-010, RF-016–RF-017).
- [X] T020 [P] [US2] Crear `tests/property/auth/session.property.test.ts` con al menos 100 ejecuciones por propiedad para entradas de login inválidas que devuelven error sin excepción, equivalencia del mensaje genérico en español ante correo inexistente o contraseña incorrecta, ausencia de secretos en usuario/sesión y transiciones login/logout que no restauran una sesión cerrada (RF-007–RF-010, RF-015–RF-017).
- [X] T021 [P] [US2] Crear `tests/integration/auth/session.integration.test.ts` con almacenamiento simulado para login válido/inválido, mensaje genérico, ausencia de secretos en sesión, persistencia tras reinicializar, logout persistido y errores de escritura que no aparentan éxito (RF-007–RF-010, RF-015–RF-017).

### Implementación de la historia 2

- [X] T022 [US2] Implementar `login` en `src/auth/service.ts`: validar correo, comprobar hash con la sal del registro y devolver exactamente el mismo `INVALID_CREDENTIALS` para correo inexistente y contraseña incorrecta; solo guardar sesión bajo bloqueo tras credenciales válidas (RF-007–RF-008, RF-015–RF-016).
- [X] T023 [P] [US2] Crear `src/auth/session.ts` para validar y persistir solo `sessionUserId`, restaurar la sesión tras recarga y cerrar sesión escribiendo `null` bajo el bloqueo exclusivo (RF-009–RF-010, RF-013, RF-016).
- [X] T024 [US2] Añadir a `src/auth/view.ts` los formularios de login y cierre de sesión; usar el mensaje genérico único en español y reflejar errores de persistencia sin declarar éxito (RF-007–RF-010, RF-017).
- [X] T025 [US2] Conectar login, logout y restauración inicial de sesión en `src/main.ts`; al recargar validar el documento antes de mostrar al usuario actual (RF-007, RF-009–RF-010, RF-013).

**Punto de control**: autenticación, persistencia y cierre de sesión independientes
verificados con almacenamiento simulado.

## Fase 5: Historia de usuario 3 — Consultar identidad, rol y recuperar estado (Prioridad: P2)

**Objetivo**: exponer el contrato público de usuario/sesión, responder consultas de
identidad y administración, y recuperarse de datos corruptos sin bloquear el inicio.

**Prueba independiente**: consultar estado anónimo, usuario y administrador; arrancar
con almacenamiento corrupto; verificar aviso y continuar sin cuentas ni sesión.

**Dependencias**: reutiliza el modelo de la fase de bases y los servicios de las
historias 1 y 2.

### Pruebas de la historia 3

- [X] T026 [P] [US3] Crear `tests/unit/auth/state-validation.test.ts` y `tests/unit/auth/public-api.test.ts` para aceptar solo campos, tipos, rangos, roles, hashes, sales, correos e identificadores válidos; comprobar sesión referenciada, modelo público sin secretos, consultas anónimas/usuario/admin, errores `Result`, mensajes en español y documentación didáctica (RF-011–RF-018).
- [X] T027 [P] [US3] Crear `tests/property/auth/state.property.test.ts` con al menos 100 ejecuciones por propiedad para ida y vuelta de serialización sin pérdida, datos externos inválidos que devuelven error sin excepción, roles y estado de sesión coherentes, modelo público sin secretos, avisos de recuperación en español y presencia del aviso didáctico en la documentación (RF-011–RF-018).
- [X] T028 [P] [US3] Crear `tests/integration/auth/recovery.integration.test.ts` con `StoragePort` y `LockPort` simulados para documento corrupto, arranque vacío con aviso, acceso anónimo/usuario/admin, ausencia de secretos, errores de lectura/escritura y advertencia de autenticación local didáctica (RF-011–RF-018).

### Implementación de la historia 3

- [X] T029 [P] [US3] Añadir a `src/auth/model.ts` el decodificador y serializador de `AuthState`; validar `schemaVersion: 1`, `users: UserRecord[]`, unicidad de `id` y correo, orden/rol del primer admin, formato de sal/hash, `sessionUserId: string | null` y rechazo de campos inesperados (RF-013–RF-016).
- [X] T030 [US3] Implementar `initialize` en `src/auth/service.ts` para validar datos cargados; ante corrupción continuar con estado en memoria vacío, sin sesión, devolver `CORRUPT_STORAGE` para que se muestre aviso y no sustituir datos hasta confirmar un registro válido (RF-013–RF-016).
- [X] T031 [US3] Implementar `getCurrentUser`, `getSession` e `isAdmin` en `src/auth/service.ts`; devolver únicamente el modelo público, responder anónimo/no-admin con `null`/`false` y convertir fallos a `Result` tipado (RF-011–RF-013, RF-016).
- [X] T032 [US3] Actualizar `src/auth/view.ts` y `src/main.ts` para mostrar el aviso de datos corruptos en español, consultar la identidad actual y mostrar el estado de administración sin exponer el registro privado (RF-011–RF-014, RF-017).
- [X] T033 [US3] Completar `src/auth/model.ts` y el módulo público `src/auth/index.ts` para exportar `User`, `Session`, `AuthService`, `AuthError` y las operaciones acordadas en `specs/001-cuentas-sesion/contracts/auth.md`, sin exportar hashes ni sales (RF-011–RF-012, RF-015).
- [X] T034 [US3] Añadir a `README.md` una advertencia en español de que la autenticación local es didáctica y no reemplaza autenticación ni autorización de servidor (RF-018).

**Punto de control**: consumidores pueden consultar identidad, sesión y admin por el
contrato público; datos corruptos no bloquean la aplicación.

## Fase 6: Pulido y comprobaciones transversales

**Propósito**: validar requisitos completos, documentación y guía de ejecución.

- [X] T035 [P] Actualizar `specs/001-cuentas-sesion/quickstart.md` con los comandos reales de `package.json` y pasos que demuestren límites, roles, login genérico, recarga, logout, corrupción, fallos de cuota y registro concurrente.
- [X] T036 Ejecutar `npm test` y corregir los fallos en los archivos de prueba `tests/unit/auth/`, `tests/property/auth/` y `tests/integration/auth/`; comprobar al menos 100 ejecuciones por cada propiedad y que cada función de prueba cite los requisitos que verifica.
- [X] T037 Ejecutar `npm run build` y corregir errores de TypeScript estricto en `src/`, `vite.config.ts` y `tsconfig.json`.
- [X] T038 Revisar todas las funciones de `src/auth/` y `src/shared/` para asegurar comentarios de requisito, mensajes en español, ausencia de contraseñas en texto plano y ausencia de éxitos simulados ante errores de persistencia.

## Dependencias y orden de ejecución

### Dependencias entre fases

- Preparación (Fase 1): no depende de otras fases.
- Bases compartidas (Fase 2): depende de la preparación y bloquea todas las historias.
- Historia 1 (Fase 3): depende de las bases compartidas.
- Historia 2 (Fase 4): depende de la historia 1, porque login necesita cuentas y
  registros de credenciales persistidos.
- Historia 3 (Fase 5): depende de las bases compartidas y de los servicios de sesión
  de la historia 2 para completar recuperación y consultas públicas.
- Pulido (Fase 6): depende de las historias que se incluyan en la entrega.

### Orden entre historias

1. **US1 (P1)** tras la Fase 2; genera cuentas y credenciales.
2. **US2 (P1)** después de US1; inicia/cierra sesión sobre cuentas existentes.
3. **US3 (P2)** después de las bases, y su integración final después de US1/US2.

Las tres historias comparten `src/auth/service.ts` y el modelo, por lo que su
integración se realiza en orden de prioridad aunque las pruebas preparatorias puedan
escribirse en paralelo.

## Oportunidades de paralelismo

- En preparación: T002, T003 y T004 pueden realizarse en paralelo con T001.
- En las bases: T006, T008 y T009 son independientes entre sí; T007 depende de T006;
  T010 depende de los adaptadores compartidos.
- En cada historia: las pruebas unitarias, de propiedades e integración (tareas con
  `[P]`) pueden crearse en paralelo porque usan archivos separados. Deben completarse
  antes de las implementaciones de esa historia.
- En US1: T014 y T015 pueden realizarse en paralelo; T016 requiere ambas y las bases.
- En US2: T023 puede hacerse en paralelo con T022 tras US1; T024 requiere las
  operaciones de login/logout y T025 integra la vista con `main.ts`.
- En US3: T026–T028 se pueden preparar en paralelo; T029 antecede a T030/T031; T032
  integra sus resultados.

### Ejemplo de ejecución paralela: US1

```text
Crear en paralelo:
- T011: tests/unit/auth/validation.test.ts
- T012: tests/property/auth/registration.property.test.ts
- T013: tests/integration/auth/registration.integration.test.ts

Después de los contratos y bases compartidas:
- T014: src/auth/validation.ts
- T015: src/auth/password.ts
```

## Estrategia de implementación

### MVP primero: solo historia de usuario 1

1. Completar preparación y bases compartidas.
2. Completar pruebas e implementación de US1.
3. Validar de forma independiente registro, restricciones, duplicados, primer rol
   administrador, segundo rol usuario y almacenamiento sin texto plano.
4. Detenerse en el punto de control y revisar antes de añadir login.

### Entrega incremental

1. Preparación y bases → SPA estricta y puertos compartidos.
2. US1 → registro independiente y asignación del primer administrador.
3. US2 → autenticación, persistencia de sesión, recarga y logout.
4. US3 → consultas públicas, recuperación de datos corruptos y aviso.
5. Pulido → suite completa, build y guía rápida actualizada.

Cada fase conserva los resultados de las fases anteriores y puede comprobarse antes
de continuar.
