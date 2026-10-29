# Plan de implementación: Reservas

**Rama**: `003-reservas` | **Fecha**: 2026-10-29 | **Especificación**:
[spec.md](./spec.md)

**Entrada**: Especificación de `specs/003-reservas/spec.md` y requisitos técnicos del
usuario: misma base de 001 y 002 (TypeScript estricto, Vite, `localStorage` con
`StoragePort`, Vitest y fast-check); código en `src/bookings`; lógica de solapamiento
y horas libres pura; fechas como texto ISO local; reloj inyectado.

## Resumen

Agregar un módulo `src/bookings` para que una persona con sesión reserve espacios
activos, vea y cancele sus reservas y consulte las horas libres de un espacio en una
fecha. Las reglas de horario (08:00–22:00), bloques de una hora, duración de 1 a 3
horas, prohibición de reservar en el pasado, no solapamiento y margen de cancelación
de 1 hora viven en funciones puras sin DOM ni almacenamiento. El servicio compone
esas reglas con `AuthService` (001) para saber quién reserva, con
`SpaceService.existeYEstaActivo()` (002) para saber si el espacio admite reservas,
con un reloj inyectado para saber la hora actual y con `StoragePort` y `LockPort`
para persistir. Las operaciones devuelven `Result<T, E>` con errores tipados y
mensajes en español. Las fechas se manejan como texto ISO de fecha y hora local para
evitar problemas de zona horaria.

## Contexto técnico

**Lenguaje/versión**: TypeScript con `strict` activado en `tsconfig.json`.

**Dependencias principales**: Vite, Vitest, fast-check y jsdom ya están declarados.
Dependencias internas: `Result<T, E>`, `StoragePort`, `LockPort`, `AuthService` (001)
y `SpaceService` (002). No se agregan dependencias nuevas.

**Almacenamiento**: `localStorage` detrás de `StoragePort`, con un documento versionado
bajo `reservalocal.bookings.v1` que contiene todas las reservas, activas y
canceladas. Un valor corrupto se copia a `reservalocal.bookings.v1.respaldo` antes de
reiniciar el documento.

**Pruebas**: Vitest en tres niveles. Propiedades con fast-check (mínimo 100
ejecuciones): nunca hay dos reservas activas solapadas en el mismo espacio tras
cualquier secuencia de reservas y cancelaciones; horas libres más horas reservadas
igualan el horario; cancelar dos veces equivale a cancelar una; entradas inválidas
devuelven error sin lanzar; serializar y deserializar conserva los datos. Unitarias
con casos límite: reserva adyacente, 07:00, 21:00 con duración 2, duración 0 y 4,
cancelar justo 1 hora antes y 59 minutos antes. Integración con almacenamiento y
bloqueo simulados y el servicio real de espacios.

**Plataforma destino**: SPA en navegadores modernos (localhost o HTTPS).

**Tipo de proyecto**: Aplicación web de una sola página con Vite, sin backend.

**Objetivos de rendimiento**: Consultas instantáneas para el volumen de un local
pequeño (cientos de reservas). No se requiere índice.

**Restricciones**: Lógica de solapamiento y horas libres pura y separada del
almacenamiento y del DOM; reloj inyectado como parámetro; fechas como texto ISO local
(`AAAA-MM-DD` y `AAAA-MM-DDTHH:mm`); validación en tiempo de ejecución de formularios,
almacenamiento y reloj; mensajes en español; comentario de requisito en cada función;
no modificar los contratos publicados de 001 ni de 002.

**Alcance**: Reservar, cancelar, listar mis reservas, horas libres, detección de
choques, recuperación ante datos corruptos y vista. No incluye panel de
administración (004), edición de reservas, reservas recurrentes ni notificaciones.

## Comprobación de la constitución

**Puerta inicial: APROBADA.**

- **I. Arquitectura modular**: `src/bookings` separa modelo, tiempo, validación,
  reglas puras, estado persistido, repositorio, servicio y vista. Se comunica con
  001 y 002 solo mediante `AuthService` y `SpaceService`. `src/main.ts` ensambla.
- **II. Resultados y validación**: todas las operaciones devuelven `Result<T, E>` o
  `Promise<Result<T, E>>`; formularios, documento guardado y salida del reloj se
  validan en tiempo de ejecución; ningún cast se usa como validación.
- **III. Seguridad y control de acceso**: el servicio obtiene el usuario de la sesión
  validada por 001 y filtra por `userId`; nunca acepta un `userId` desde la vista. Las
  reservas ajenas no se distinguen de las inexistentes. Se documenta que el control
  local es didáctico.
- **IV. Pruebas**: unitarias con límites, propiedades con `numRuns: 100` como mínimo
  (incluida la propiedad constitucional de no solapamiento y la de ida y vuelta de
  serialización) e integración con almacenamiento simulado.
- **V. Almacenamiento resiliente**: lecturas y escrituras pasan por `StoragePort`; un
  documento corrupto se respalda y la app arranca sin reservas; los fallos de
  escritura se devuelven como error, nunca como éxito.

## Estructura del proyecto

### Documentación de esta funcionalidad

```text
specs/003-reservas/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── bookings.md
├── checklists/
│   └── requirements.md
└── tasks.md            # lo genera /speckit-tasks
```

### Código fuente y pruebas

```text
src/
├── bookings/
│   ├── model.ts        # tipos, constantes del horario y errores
│   ├── time.ts         # fechas ISO locales, minutos y reloj del sistema
│   ├── validation.ts   # validación de la solicitud de reserva
│   ├── rules.ts        # lógica pura: hayChoque, horas libres, cancelación
│   ├── state.ts        # decodificar y serializar el documento guardado
│   ├── repository.ts   # leer, guardar y respaldar mediante StoragePort
│   ├── service.ts      # reservar, cancelar, listar y horas libres
│   ├── view.ts         # interfaz de reservas
│   ├── bookings.css    # estilos de la sección
│   └── index.ts        # contrato público
└── main.ts             # enchufe del módulo

tests/
├── helpers/bookings.ts
├── unit/bookings/
├── property/bookings/
└── integration/bookings/
```

**Decisión de estructura**: se sigue el patrón de `src/auth` y `src/spaces`. La
diferencia es que la lógica de choques y horas libres se separa en `rules.ts` para
probarla sin servicio ni almacenamiento, y el acceso al documento se separa en
`repository.ts` para que 004 pueda reutilizar la lectura sin duplicar la validación.

## Integración con 001 y 002

- **001**: `auth.getCurrentUser()` da el `User` de la sesión. Si es `null`, el servicio
  devuelve `NOT_AUTHENTICATED`. El `userId` de la reserva siempre sale de ahí.
- **002**: el contrato `spaces.md` exige que la creación de reservas consulte
  `existeYEstaActivo(id)` dentro de la misma sección exclusiva que persiste la
  reserva, usando el bloqueo `reservalocal.spaces.v1`. `reservar` cumple esa regla;
  `cancelar` usa el mismo bloqueo para que todas las escrituras de reservas se
  serialicen.
- **Vista**: `listActiveSpaces()` alimenta el selector de espacios y da los nombres de
  los espacios en la lista de reservas. Para un usuario normal, el contrato de 002 no
  ofrece el nombre de un espacio desactivado, así que esas reservas se muestran como
  «Espacio desactivado». Se propone al grupo añadir a 002 una consulta de nombre por
  id (hallazgo U2 del análisis).

## Complejidad

No se agregan proyectos, dependencias ni backend. `rules.ts` y `repository.ts` son
archivos adicionales respecto a 002, justificados por el requisito de lógica pura y
por la reutilización desde 004.

## Puertas posteriores al diseño

**Puerta posterior al diseño: APROBADA.**

- `data-model.md` define los invariantes de `Booking`: estado activa o cancelada,
  inicio y fin dentro de 08:00–22:00, inicio en punto, duración de 1 a 3 horas y no
  solapamiento entre activas del mismo espacio.
- `contracts/bookings.md` publica `reservar`, `cancelar`, `listarMisReservas`,
  `horasLibres` y `hayChoque` con errores tipados y mensajes en español.
- La consulta de disponibilidad del espacio se hace dentro del bloqueo compartido con
  la desactivación, como exige el contrato de 002.
- Las reglas de tiempo reciben la hora actual como parámetro; ninguna regla llama a
  `new Date()`.
- No quedan marcadores «NEEDS CLARIFICATION».
