# Investigación: Administración de reservas

## Decisiones

### Reutilizar el documento y las reglas de reservas existentes

**Decisión**: El servicio de 004 reutiliza `leerReservas` desde el punto de
entrada público `src/bookings/index.ts` y `guardarReservas` de
`src/bookings/repository.ts`, junto con `puedeCancelar`, `marcarCancelada`,
`ordenarPorInicio` y `reemplazarReserva` de `src/bookings/rules.ts`. También usa el
reloj validado de bookings y el nombre de bloqueo compartido definido por su
servicio. No se copia ni se ajusta la regla de los 60 minutos.

**Justificación**: 003 ya concentra la validación del documento persistido, la
serialización, el cambio de estado, el orden y el límite temporal. Volver a
implementar esas funciones en 004 podría producir comportamientos divergentes.
Usar el mismo almacenamiento y bloqueo también mantiene coherente la lista si se
crean o cancelan reservas en otra operación.

**Alternativas consideradas**:

- Duplicar la regla de cancelación, el mapeo de estado o la serialización:
  descartado porque contradice la reutilización solicitada y arriesga divergencia.
- Publicar nuevas funciones en el contrato de 003: no se adopta en esta propuesta
  porque se indicó no modificar archivos de 003.
- Importar los helpers internos existentes: opción solicitada, pero cruza el
  principio constitucional de límites de contrato. Queda pendiente aprobación del
  grupo; no se autoriza implementación hasta resolverlo.

### Verificar rol en las operaciones de servicio

**Decisión**: Consultar `AuthService.isAdmin()` dentro de cada operación antes de
leer reservas. La vista puede ocultar la sección a usuarios normales, pero no es la
única barrera. Un `false` produce el error de permiso en español; un error de
autenticación se conserva como fallo explícito y nunca concede permiso.

**Justificación**: Una vista condicional no protege invocaciones directas del
servicio, y verificar antes de leer evita revelar la lista global a usuarios no
administradores.

**Alternativas consideradas**:

- Confiar únicamente en que la vista no muestre los controles: descartado porque
  no autoriza la operación de dominio.
- Aceptar un `userId` o rol proporcionado por la vista: descartado porque son
  valores que el cliente podría manipular y la identidad debe proceder de `AuthService`.

### Coordinar la escritura con bookings

**Decisión**: Ejecutar la cancelación administrativa dentro de
`LockPort.runExclusive` con el mismo nombre que utiliza el servicio de reservas.
Releer el documento dentro de la sección exclusiva antes de reemplazar la reserva.

**Justificación**: La cancelación debe preservar las modificaciones concurrentes
hechas por 003 y no sobrescribir una lectura antigua.

**Alternativas consideradas**:

- Usar un bloqueo distinto: descartado porque no coordinaría las escrituras del
  servicio normal de reservas.
- Leer y guardar fuera del bloqueo: descartado por riesgo de pérdida de cambios.

## Hallazgos del repositorio

- `AuthService` expone `isAdmin(): Result<boolean, AuthError>`.
- `leerReservas` está disponible desde el punto de entrada de bookings;
  `guardarReservas` existe como export de `repository.ts`, pero no se reexporta
  desde el punto de entrada.
- `puedeCancelar`, `marcarCancelada`, `ordenarPorInicio` y
  `reemplazarReserva` son exports de `rules.ts`; no todos se publican en el
  punto de entrada de bookings.
- `BOOKINGS_LOCK_NAME` coordina las operaciones que modifican el documento
  compartido.
- `AuthService` emite `reservalocal:session-change`; la vista de bookings ya usa el
  evento para volver a renderizar tras iniciar/cerrar sesión.
- El proyecto ya tiene Vitest, fast-check, jsdom y carpetas `tests/unit`,
  `tests/property`, `tests/integration`.

## Preguntas de investigación

No quedan decisiones técnicas desconocidas dentro del enfoque indicado por el
usuario. La resolución de gobernanza sobre importar helpers internos es una
dependencia de aprobación, no una cuestión que pueda resolverse por investigación
técnica.
