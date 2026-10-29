# Plan de implementación: Administración de reservas

**Rama**: `004-administracion-reservas` | **Fecha**: 2026-10-29 |
**Especificación**: [spec.md](./spec.md)

**Entrada**: Especificación de `specs/004-administracion-reservas/spec.md` y
requisitos técnicos del usuario: módulo `src/admin` en TypeScript estricto;
reutilización de `leerReservas`, `guardarReservas` y reglas de `src/bookings`;
servicio con `StoragePort`, `LockPort`, `AuthService` y `Clock` inyectados; vista
con DOM y CSS propio; pruebas unitarias, de integración y de propiedades con
fast-check y un mínimo de 100 ejecuciones.

## Resumen

Agregar un módulo `src/admin` para que una persona con rol `admin` consulte todas
las reservas (activas y canceladas), ordenadas por inicio, y cancele cualquier
reserva conforme al margen temporal de 60 minutos. El servicio verifica permisos
con `AuthService.isAdmin()`, lee y guarda el documento compartido mediante las
funciones de `src/bookings`, y usa las reglas puras de cancelación y ordenación
existentes. Las escrituras se coordinan con el mismo `LockPort` y nombre de bloqueo
que 003. La vista se monta como una sección propia y presenta errores en español.

## Contexto técnico

**Lenguaje/versión**: TypeScript con `strict` activado en `tsconfig.json`.

**Dependencias principales**: Vite, Vitest, fast-check y jsdom existentes.
Dependencias internas: `Result<T, E>`, `StoragePort`, `LockPort`, `AuthService` y
tipos, repositorio, reloj y reglas de `src/bookings`. No se agregan dependencias.

**Almacenamiento**: Documento compartido de reservas bajo
`reservalocal.bookings.v1`, decodificado por `leerReservas` y actualizado por
`guardarReservas`. 004 no mantiene una lista administrativa separada ni accede a
`localStorage` directamente.

**Pruebas**: Vitest en tres niveles. Unitarias para permisos, orden, reserva no
existente, límites de 60 y 59 minutos, idempotencia, fallos de lectura/escritura y
bloqueo. Propiedades con fast-check (mínimo 100 ejecuciones por propiedad) para
inclusión y orden de la lista, aislamiento ante roles no administradores,
idempotencia y equivalencia de la decisión temporal con `puedeCancelar`.
Integración con `StoragePort` y `LockPort` simulados, servicio de autenticación
real o simulado y DOM jsdom; validar cancelación de reservas de otros usuarios y
que una escritura actualiza el documento compartido.

**Plataforma destino**: SPA en navegadores modernos (localhost o HTTPS).

**Tipo de proyecto**: Aplicación web de una sola página con Vite, sin backend.

**Objetivos de rendimiento**: Vista y operaciones instantáneas para el volumen de
un local pequeño (cientos de reservas); la lista se ordena en memoria. No se
requiere índice ni paginación.

**Restricciones**: Verificación de rol en cada operación del servicio, no solo en
la vista; respuestas explícitas `Result<T, E>`; no revelar datos antes de
autorizar; usar `Clock` inyectado y reglas de tiempo de 003; todos los accesos al
documento mediante funciones existentes de reservas; no modificar archivos de
003; mensajes para la persona usuaria en español; autenticación local didáctica.

**Alcance**: Consulta administrativa global, cancelación administrativa, servicio,
vista y CSS propios, pruebas y montaje en la SPA. No incluye edición de reservas,
cambios a 003, backend ni cambios al modelo persistido.

## Comprobación de la constitución

**Puerta inicial: APROBADA CON EXCEPCIÓN TEMPORAL.** La constitución v1.1.0 registra
una excepción aprobada por el grupo, limitada a los helpers enumerados para 004 y
sin modificar archivos de 003. El acoplamiento queda como deuda técnica hasta que
003 publique esos helpers en su contrato.

- **I. Arquitectura modular**: se crea `src/admin` separado. Sin embargo, para
  cumplir la instrucción de no modificar 003 y reutilizar las funciones requeridas,
  004 debe importar `guardarReservas` y reglas desde módulos internos de bookings.
  Esos imports no forman parte del contrato público documentado de 003 y cruzan el
  límite constitucional ordinario de comunicación entre funcionalidades. La
  excepción limitada quedó aprobada y documentada en el principio I de la
  constitución; no autoriza otros imports internos ni cambios a 003.
- **II. Resultados y validación**: las operaciones administrativas devuelven
  `Result`; los datos persistidos se leen y validan con el decodificador de 003 y
  el identificador de cancelación se valida en tiempo de ejecución.
- **III. Seguridad y control de acceso**: la consulta y la cancelación verifican
  `isAdmin()` dentro del servicio. La vista no constituye una frontera de
  seguridad; el control local sigue siendo didáctico.
- **IV. Pruebas**: añadir pruebas unitarias, de integración y propiedades con
  mínimo 100 ejecuciones por propiedad. Comprobar rechazo sin cambios, aislamiento,
  cancelación e idempotencia.
- **V. Almacenamiento resiliente**: usar `StoragePort` indirectamente a través de
  las funciones de bookings; errores de lectura, escritura y bloqueo se muestran
  como errores, nunca como éxito.

**Condición para conservar la aprobación**: limitar los imports internos a los
helpers nombrados por la excepción constitucional y no modificar `src/bookings`.

## Estructura del proyecto

### Documentación de esta funcionalidad

```text
specs/004-administracion-reservas/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── admin.md
├── checklists/
│   └── requirements.md
└── tasks.md            # lo genera /speckit-tasks
```

### Código fuente y pruebas

```text
src/
├── admin/
│   ├── model.ts        # errores y tipos del servicio administrativo
│   ├── service.ts      # permiso, consulta global y cancelación
│   ├── view.ts         # vista administrativa con DOM
│   ├── admin.css       # estilos propios de la sección
│   └── index.ts        # exports públicos del módulo admin
├── bookings/           # solo lectura/importación; no modificar en 004
└── main.ts             # ensamblaje del módulo y sus dependencias

tests/
├── helpers/admin.ts
├── unit/admin/
├── property/admin/
└── integration/admin/
```

**Decisión de estructura**: seguir la separación por funcionalidad usada en
`src/bookings`, `src/auth` y `src/spaces`. El servicio mantiene lógica de dominio
fuera del DOM; la vista tiene CSS propio y escucha el evento
`reservalocal:session-change` ya emitido por la vista de autenticación. El
ensamblaje crea el servicio con los adaptadores compartidos.

## Diseño del servicio e integración

- `createAdminService({ storage, lock, auth, clock })` devuelve
  `listarReservas()` y `cancelarReserva(bookingId)`.
- Ambas operaciones llaman a `auth.isAdmin()` antes de leer o exponer datos. Un
  resultado `false` devuelve `PERMISSION_DENIED` con
  «No tienes permiso para administrar las reservas.»; un error de autenticación
  devuelve un error explícito y no concede acceso.
- `listarReservas()` llama a `leerReservas(storage)` y
  `ordenarPorInicio(bookings)`. Conserva activas y canceladas; el orden secundario
  por id sigue la regla existente.
- `cancelarReserva()` valida el id y ejecuta bajo
  `lock.runExclusive("reservalocal.spaces.v1", ...)`, el mismo literal que define
  003. El nombre no se importa porque la excepción constitucional enumera helpers,
  no constantes internas. Dentro del bloqueo vuelve a leer
  las reservas; una reserva no existente produce error; una ya
  cancelada devuelve éxito sin escribir ni necesitar el reloj; para una activa
  lee y valida el reloj dentro del bloqueo y consulta `puedeCancelar`. Si se
  permite, usa `marcarCancelada`, `reemplazarReserva` y `guardarReservas`. Así no
  se copia la regla de 60 minutos ni la transición de estado.
- El nombre del bloqueo se mantiene idéntico al de 003 para evitar escrituras
  concurrentes no coordinadas. Los errores de reserva, almacenamiento y bloqueo se traducen a
  errores administrativos tipados conservando el mensaje del adaptador cuando
  corresponda.
- La vista muestra los datos solo a una sesión administradora; para otros roles
  limpia la lista y muestra el error en español. El servicio vuelve a comprobar el
  rol para que la vista no sea el único control de acceso. Cambios de sesión
  vuelven a renderizar la sección.

## Complejidad

No se agregan proyectos, dependencias, persistencia ni backend. El servicio y la
vista son archivos nuevos propios de 004. Importar helpers internos de bookings
evita duplicar reglas y respeta la instrucción de no editar 003, pero crea una
dependencia no pública entre funcionalidades; se registra como excepción temporal
aprobada y deuda técnica en la constitución.

## Puertas posteriores al diseño

**Puerta posterior al diseño: APROBADA CON EXCEPCIÓN TEMPORAL.**

- `data-model.md` conserva la entidad `Booking` de 003 y especifica los errores
  administrativos; no introduce campos ni una segunda fuente de reservas.
- `contracts/admin.md` define las operaciones, el control de acceso y los errores
  en español.
- `quickstart.md` incluye validación automatizada, casos de límite y recorrido
  manual.
- Las propiedades propuestas usan al menos 100 ejecuciones.
- El acceso de 004 a los helpers autorizados está aprobado como excepción temporal.
  Esta planificación no modifica `src/bookings`; la deuda se retira cuando 003
  publique esos helpers en su contrato.

## Complejidad / excepción constitucional

| Desviación | Por qué se propone | Alternativa más simple rechazada |
|---|---|---|
| Importar los helpers internos autorizados de `src/bookings` | La especificación requiere cancelar reservas ajenas sin duplicar la regla temporal, y la instrucción recibida exige no modificar 003. | Copiar o reimplementar reglas en 004 las duplicaría; modificar 003 está fuera del alcance. La excepción está aprobada por el grupo y registrada en la constitución v1.1.0 como deuda técnica temporal. |
