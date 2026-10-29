# Especificación de funcionalidad: Administración de reservas

**Rama de funcionalidad**: `004-administracion-reservas`

**Creada**: 2026-10-29

**Estado**: Borrador

**Entrada**: Descripción del usuario: «Administración de reservas. El administrador puede ver todas las reservas (activas y canceladas) de todos los usuarios, ordenadas por hora de inicio, y cancelar cualquiera con las mismas reglas de tiempo que un usuario (al menos 60 minutos de antelación). Cancelar una reserva ya cancelada es idempotente. Un usuario normal recibe un error de permiso en español y no puede ver ni cancelar reservas ajenas. Reutiliza las funciones de la funcionalidad 003 sin duplicar reglas y sin modificar archivos de 003.»

## Aclaraciones

- La reserva cancelada puede volver a cancelarse sin error ni cambios, aunque su
  hora de inicio ya haya pasado; se conserva el comportamiento idempotente de 003.
- El margen de cancelación se mide respecto al inicio de la reserva: exactamente
  60 minutos se permite y menos de 60 minutos se rechaza.
- Una operación sin privilegios administrativos debe fallar con el mensaje
  «No tienes permiso para administrar las reservas.» y no revelar datos de
  reservas.
- Administrar incluye cancelar reservas propias o de cualquier otro usuario.

### Sesión 2026-10-29

- Q: ¿Qué límite debemos priorizar para que 004 cancele reservas ajenas sin
  duplicar la regla temporal? → A: Mantener intactos los archivos de 003 e
  importar directamente sus helpers internos, aunque esto cruza el límite del
  contrato público.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1: Consultar todas las reservas (Prioridad: P1)

Como administrador, quiero consultar las reservas de todos los usuarios, incluidas
las canceladas, para tener una vista completa de la actividad.

**Por qué tiene esta prioridad**: La visibilidad global permite supervisar la
actividad y es la base para localizar reservas que requieren administración.

**Prueba independiente**: Con reservas activas y canceladas de varios usuarios,
consultar la lista como administrador y comprobar que cada reserva aparece una vez,
sin filtrar por propietario y ordenada por inicio.

**Escenarios de aceptación**:

1. **Dado** que hay reservas activas y canceladas de distintos usuarios, **cuando**
   un administrador consulta las reservas, **entonces** recibe todas, sin importar
   su estado o propietario.
2. **Dado** que hay varias reservas con distintas horas de inicio, **cuando** el
   administrador consulta la lista, **entonces** aparecen en orden cronológico por
   hora de inicio.
3. **Dado** que una persona con rol normal intenta consultar la lista, **cuando**
   solicita las reservas, **entonces** recibe un error de permiso en español y
   ningún dato de reservas.

---

### Historia de usuario 2: Cancelar una reserva como administrador (Prioridad: P1)

Como administrador, quiero cancelar cualquier reserva dentro del margen permitido
para liberar el horario cuando sea necesario.

**Por qué tiene esta prioridad**: La cancelación administrativa permite gestionar
reservas de toda la comunidad sin eludir las protecciones temporales de 003.

**Prueba independiente**: Con reservas de varios usuarios, cancelar como
administrador una reserva activa que empieza en al menos 60 minutos y comprobar que
queda cancelada; probar también el límite de 60 minutos, una reserva con menos
antelación y una reserva ya cancelada.

**Escenarios de aceptación**:

1. **Dado** que existe una reserva activa de cualquier usuario cuyo inicio está a
   60 minutos o más, **cuando** el administrador la cancela, **entonces** queda
   cancelada y se confirma el resultado.
2. **Dado** que una reserva empieza en menos de 60 minutos, **cuando** el
   administrador intenta cancelarla, **entonces** la operación se rechaza con el
   mensaje en español que indica el margen de una hora y la reserva no cambia.
3. **Dado** que la reserva ya está cancelada, **cuando** el administrador vuelve a
   cancelarla, **entonces** la operación tiene éxito sin cambiar la reserva ni
   producir un error.
4. **Dado** que la reserva no existe, **cuando** el administrador intenta
   cancelarla, **entonces** recibe un error en español y no se modifica ninguna
   reserva.
5. **Dado** que una persona con rol normal intenta cancelar una reserva ajena,
   **cuando** realiza la operación administrativa, **entonces** recibe un error de
   permiso en español y la reserva permanece sin cambios.

---

### Historia de usuario 3: Restringir la administración a administradores (Prioridad: P1)

Como usuario normal, quiero que el sistema rechace las operaciones administrativas
para proteger la privacidad y el estado de las reservas de otras personas.

**Por qué tiene esta prioridad**: La vista global y la cancelación de reservas
ajenas deben estar limitadas al rol administrador.

**Prueba independiente**: Con reservas de más de una persona, intentar consultar y
cancelar como usuario normal; verificar el mismo error de permiso en español, que
no se revelan reservas ajenas y que ninguna reserva cambia.

**Escenarios de aceptación**:

1. **Dado** que una persona tiene rol normal, **cuando** intenta consultar las
   reservas globales o cancelar una reserva ajena, **entonces** cada operación se
   rechaza con «No tienes permiso para administrar las reservas.»
2. **Dado** que una persona no tiene permisos administrativos, **cuando** se
   rechaza su operación, **entonces** no se exponen datos de reservas ni se altera
   el almacenamiento.

### Casos límite

- Aceptar la cancelación con exactamente 60 minutos de antelación y rechazarla con
  59 minutos.
- Una cancelación repetida de una reserva cancelada no vuelve a escribir ni cambia
  su fecha de cancelación.
- La lista incluye reservas canceladas y reservas del propio administrador.
- Un fallo de lectura o escritura se informa como error en español y nunca como una
  operación exitosa.
- Un estado de autenticación o rol que no pueda verificarse no concede permisos ni
  revela reservas.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **RF-001**: Solo una sesión con rol `admin` DEBE poder consultar todas las
  reservas o utilizar la cancelación administrativa.
- **RF-002**: La consulta administrativa DEBE incluir todas las reservas, activas y
  canceladas, de todos los usuarios, incluidas las del administrador.
- **RF-003**: La lista administrativa DEBE estar ordenada por fecha y hora de
  inicio, de la más próxima a la más lejana.
- **RF-004**: El administrador DEBE poder cancelar cualquier reserva activa,
  independientemente de quién sea su propietario, únicamente cuando falten al
  menos 60 minutos para su inicio.
- **RF-005**: Una cancelación administrativa con menos de 60 minutos de
  antelación DEBE rechazarse en español y NO DEBE modificar la reserva.
- **RF-006**: Cancelar una reserva ya cancelada DEBE ser idempotente: la operación
  confirma el estado cancelado, no cambia los datos y no falla por el margen de
  tiempo.
- **RF-007**: Una operación administrativa de una persona sin rol `admin` DEBE
  rechazarse con el mensaje «No tienes permiso para administrar las reservas.» y
  NO DEBE revelar reservas ni modificar datos.
- **RF-008**: Un identificador de reserva inexistente y los errores de acceso a
  datos DEBEN producir un resultado de error explícito en español; ningún fallo
  DEBE presentarse como éxito.
- **RF-009**: La administración DEBE reutilizar las funciones y tipos de la
  funcionalidad 003 que sean aplicables, incluida la lectura compartida de
  reservas, e importar directamente los helpers internos necesarios para cancelar
  y ordenar; NO DEBE duplicar reglas de reservas ni modificar archivos de la
  funcionalidad 003.

### Entidades clave *(incluidas porque la funcionalidad maneja datos)*

- **Reserva**: Reserva existente de 003 con identificador de propietario, espacio,
  inicio, fin y estado activo o cancelado; la administración no cambia su
  propietario ni duplica los datos de usuario o espacio.
- **Administrador y sesión**: Rol y sesión provistos por la funcionalidad 001;
  únicamente una sesión válida con rol `admin` autoriza las operaciones globales.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **CE-001**: El 100 % de las reservas existentes aparece exactamente una vez en
  una consulta administrativa, independientemente del usuario o estado, en orden
  cronológico de inicio.
- **CE-002**: El 100 % de las cancelaciones activas con 60 minutos o más de
  antelación se completan; el 100 % de las que tienen menos de 60 minutos se
  rechazan sin cambios.
- **CE-003**: El 100 % de las operaciones repetidas sobre reservas canceladas
  confirma el estado sin error ni modificación de datos.
- **CE-004**: El 100 % de los intentos de consulta o cancelación administrativa
  realizados por usuarios sin rol `admin` se rechaza en español, sin exponer
  reservas ni alterar datos.
- **CE-005**: En una prueba de uso, un administrador puede localizar una reserva y
  completar una cancelación permitida en menos de un minuto.

## Supuestos

- La autenticación, sesión y rol `admin` provienen de la funcionalidad 001; esta
  funcionalidad no modifica su contrato.
- Los datos y reglas de reservas provienen de la funcionalidad 003. La
  administración amplía quién puede consultar y cancelar, no cambia las reglas
  existentes para usuarios ni la estructura de sus reservas.
- La funcionalidad 003 publica `leerReservas` para leer todas las reservas y
  expone sus tipos de reserva; 004 reutiliza esas interfaces en lugar de duplicar
  el acceso a los datos.
- Por decisión de aclaración, 004 puede importar directamente los helpers
  internos `puedeCancelar`, `marcarCancelada`, `ordenarPorInicio`,
  `reemplazarReserva` y `guardarReservas` de 003, sin modificar sus archivos ni
  copiar esas reglas. Esto cruza el límite del contrato público y requiere
  resolución conforme a la constitución antes de implementar.
- Los mensajes dirigidos a las personas usuarias están en español.
- La autenticación y los roles locales son didácticos y no sustituyen la
  autenticación ni la autorización en un servidor.
