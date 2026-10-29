# Especificación de funcionalidad: Catálogo de espacios

**Rama de funcionalidad**: `Asignada`

**Creada**: 2026-10-28

**Estado**: Borrador

**Entrada**: Descripción del usuario: «Desarrollar la funcionalidad de Catálogo de espacios para ReservaLocal. El administrador puede crear, editar y desactivar espacios (canchas, salas, consultorio). Los usuarios con sesión pueden ver los espacios activos y el detalle de cada uno. Reglas: El nombre debe tener de 3 a 50 caracteres y ser único (sin distinguir mayúsculas). El tipo debe ser cancha, sala o consultorio. La capacidad debe ser un entero de 1 a 100. La descripción es opcional de hasta 200 caracteres. Un espacio desactivado no aparece en el catálogo ni admite reservas nuevas, pero se conserva en los datos. Solo el rol admin puede gestionar espacios; un usuario normal recibe un error de permiso en español.»

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1: Gestionar espacios (Prioridad: P1)

Como administrador, quiero crear y editar espacios y desactivarlos cuando dejen de
estar disponibles para mantener el catálogo actualizado sin perder sus datos.

**Por qué tiene esta prioridad**: Un catálogo de espacios correcto es necesario para
que las personas encuentren lugares disponibles y para impedir reservas nuevas de
espacios que ya no se ofrecen.

**Prueba independiente**: Con una sesión de administrador, crear un espacio válido,
editar sus datos, comprobar los cambios y desactivarlo; verificar que los datos se
conservan y que ya no está disponible para el catálogo ni para nuevas reservas.

**Escenarios de aceptación**:

1. **Dado** que una persona administradora ha iniciado sesión, **cuando** crea un
   espacio con nombre, tipo, capacidad y descripción válidos, **entonces** el espacio
   queda guardado y activo.
2. **Dado** que existe un espacio, **cuando** la persona administradora modifica sus
   datos con valores válidos, **entonces** los cambios quedan guardados y se reflejan
   en la información del espacio.
3. **Dado** que existe un espacio activo, **cuando** la persona administradora lo
   desactiva, **entonces** el espacio se conserva, deja de ofrecerse en el catálogo y
   no admite reservas nuevas.
4. **Dado** que el nombre tiene menos de 3 o más de 50 caracteres, **cuando** se
   intenta crear o editar un espacio, **entonces** la operación se rechaza y los datos
   existentes no cambian.
5. **Dado** que ya existe un espacio con el mismo nombre, sin distinguir mayúsculas,
   **cuando** se intenta crear otro o cambiar el nombre de uno distinto para que
   coincida, **entonces** la operación se rechaza y no se duplican nombres.
6. **Dado** que el tipo no es cancha, sala o consultorio, la capacidad no es un entero
   entre 1 y 100, o la descripción supera 200 caracteres, **cuando** se intenta crear
   o editar el espacio, **entonces** la operación se rechaza sin guardar los cambios.
7. **Dado** que una persona con rol usuario intenta crear, editar o desactivar un
   espacio, **cuando** solicita la operación, **entonces** recibe el mensaje en
   español «No tienes permiso para gestionar espacios» y los datos no cambian.

---

### Historia de usuario 2: Consultar catálogo y detalle (Prioridad: P1)

Como usuario con sesión iniciada, quiero consultar los espacios activos y el detalle
de cada uno para elegir uno que se ajuste a mis necesidades.

**Por qué tiene esta prioridad**: Consultar la oferta vigente permite a las personas
conocer las opciones disponibles antes de decidir qué espacio reservar.

**Prueba independiente**: Con una sesión iniciada y espacios activos y desactivados,
consultar el catálogo y abrir el detalle de cada espacio activo; confirmar que los
desactivados no aparecen ni se pueden consultar como opciones disponibles.

**Escenarios de aceptación**:

1. **Dado** que hay una sesión iniciada y existen espacios activos y desactivados,
   **cuando** la persona consulta el catálogo, **entonces** ve todos y solo los
   espacios activos.
2. **Dado** que un espacio está activo, **cuando** la persona consulta su detalle,
   **entonces** ve su nombre, tipo, capacidad y descripción si fue proporcionada.
3. **Dado** que un espacio está desactivado, **cuando** la persona consulta el
   catálogo o intenta abrirlo como una opción disponible, **entonces** no se muestra
   como disponible.
4. **Dado** que no hay una sesión iniciada, **cuando** una persona intenta consultar
   el catálogo o el detalle, **entonces** no obtiene los datos de espacios y recibe
   una indicación en español de que debe iniciar sesión.

---

### Historia de usuario 3: Mantener disponibilidad y datos (Prioridad: P2)

Como responsable de la operación, quiero que desactivar un espacio lo retire de las
nuevas reservas sin borrar su información ni alterar las reservas que ya existan.

**Por qué tiene esta prioridad**: La desactivación debe evitar compromisos futuros
sin destruir el historial asociado al espacio.

**Prueba independiente**: Desactivar un espacio con información y reservas existentes;
comprobar que conserva sus datos y reservas, deja de mostrarse en el catálogo y no
puede seleccionarse para una reserva nueva.

**Escenarios de aceptación**:

1. **Dado** que un espacio tiene reservas existentes, **cuando** se desactiva,
   **entonces** se conservan tanto el espacio como las reservas existentes.
2. **Dado** que un espacio está desactivado, **cuando** una persona inicia una nueva
   reserva mediante el flujo de creación de reservas, **entonces** la validación del
   espacio activo rechaza la operación antes de persistirla.
3. **Dado** que una persona administradora modifica el nombre de un espacio y lo
   compara con su propio nombre actual, **cuando** guarda los demás cambios,
   **entonces** la unicidad no impide conservar el nombre del mismo espacio.

### Casos límite

- Aceptar nombres de 3 y 50 caracteres; rechazar nombres de 2 y 51 caracteres.
- Aceptar capacidades enteras de 1 y 100; rechazar 0, 101, valores decimales y
  valores que no sean numéricos.
- Aceptar una descripción vacía o de 200 caracteres; rechazar una de 201 caracteres.
- Rechazar nombres que solo difieran en mayúsculas y minúsculas, tanto al crear como
  al editar otro espacio.
- Permitir que un espacio conserve su propio nombre durante una edición.
- Rechazar la creación o edición si cualquier campo incumple sus límites, sin
  guardar parcialmente los cambios.
- No mostrar espacios desactivados en el catálogo ni permitir nuevas reservas de
  estos, conservando el espacio y las reservas previas.
- La validación de disponibilidad y el guardado de una reserva nueva deben
  coordinarse con la desactivación bajo el mismo bloqueo, para evitar que una reserva
  se confirme tras una desactivación concurrente.
- Rechazar con un mensaje en español las operaciones de gestión solicitadas por un
  usuario sin rol administrador.
- No exponer el catálogo ni los detalles a personas sin una sesión iniciada.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **RF-001**: La aplicación DEBE permitir que una persona con sesión iniciada consulte
  el catálogo de espacios activos y únicamente esos espacios.
- **RF-002**: La aplicación DEBE permitir que una persona con sesión iniciada consulte
  el detalle de cada espacio activo, incluidos nombre, tipo, capacidad y descripción
  cuando exista.
- **RF-003**: La aplicación DEBE permitir que una persona con rol `admin` cree y edite
  espacios y desactive espacios existentes.
- **RF-004**: El nombre DEBE tener entre 3 y 50 caracteres y ser único sin distinguir
  mayúsculas y minúsculas. La comprobación de unicidad DEBE excluir el mismo espacio
  que se está editando.
- **RF-005**: El tipo DEBE ser exactamente uno de estos valores: cancha, sala o
  consultorio.
- **RF-006**: La capacidad DEBE ser un número entero entre 1 y 100, incluidos ambos
  límites.
- **RF-007**: La descripción DEBE ser opcional y, cuando se proporcione, no superar
  200 caracteres.
- **RF-008**: La aplicación DEBE rechazar una creación o edición que contenga uno o
  más campos inválidos y NO DEBE guardar cambios parciales.
- **RF-009**: La aplicación DEBE rechazar las operaciones de gestión de espacios de
  usuarios sin rol `admin`; a un usuario con rol `usuario` DEBE mostrarle el mensaje
  en español «No tienes permiso para gestionar espacios».
- **RF-010**: Al desactivar un espacio, la aplicación DEBE conservar su registro y
  sus datos y excluirlo del catálogo. El contrato de disponibilidad DEBE rechazar
  espacios inactivos; el flujo de creación de reservas DEBE consultar ese contrato
  bajo el mismo bloqueo que protege la desactivación y rechazar la reserva antes de
  persistirla.
- **RF-011**: La desactivación NO DEBE eliminar ni modificar las reservas ya
  existentes del espacio.
- **RF-012**: Las consultas del catálogo y del detalle DEBEN requerir una sesión
  iniciada. Si no hay sesión, la aplicación DEBE indicar en español que es necesario
  iniciar sesión.
- **RF-013**: Los errores de validación DEBEN indicar en español qué dato debe
  corregirse.

### Entidades clave *(incluidas porque la funcionalidad maneja datos)*

- **Espacio**: Lugar que puede ofrecerse para reservas; comprende un identificador,
  nombre, tipo, capacidad, descripción opcional y estado activo o desactivado.
- **Reserva**: Solicitud asociada a un espacio. Las reservas existentes se conservan
  al desactivar el espacio; las nuevas requieren que el espacio esté activo.
- **Usuario y rol**: Identidad de una persona con sesión iniciada y su nivel de
  autorización; solo el rol `admin` puede gestionar espacios.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **CE-001**: En pruebas de aceptación, el 100 % de los nombres de 3 a 50 caracteres
  se aceptan cuando son únicos, y todos los nombres fuera de ese rango se rechazan.
- **CE-002**: En pruebas de aceptación, el 100 % de los espacios activos aparecen en
  el catálogo y ninguno de los desactivados aparece como disponible.
- **CE-003**: El 100 % de los intentos de reservar un espacio desactivado se rechazan
  antes de persistirse, incluso ante una desactivación concurrente, y el 100 % de las
  reservas existentes se conservan al desactivarlo.
- **CE-004**: El 100 % de los intentos de gestión de un usuario con rol `usuario` se
  rechazan sin cambios en los datos y muestran el mensaje de permiso en español.
- **CE-005**: En una prueba de 20 espacios, una persona con sesión puede consultar el
  detalle de cada espacio activo y verificar sus datos sin que se exponga ningún
  espacio desactivado.
- **CE-006**: En una prueba con 10 usuarios con sesión iniciada, al menos 9 responden
  con 4 o 5 a la pregunta «¿Qué tan clara fue la información del espacio para decidir
  si se ajusta a tus necesidades?» en una escala de 1 (nada clara) a 5 (muy clara).

## Supuestos

- La sesión y los roles `admin` y `usuario` son proporcionados por la funcionalidad de
  cuentas y sesión existente.
- La unicidad del nombre se aplica a todos los espacios conservados, incluso a los
  desactivados, para evitar volver a registrar una identidad ya guardada.
- El nombre se compara ignorando mayúsculas y minúsculas; no se exige una política
  adicional de equivalencia de acentos.
- La administración puede editar los datos de un espacio activo o desactivado. La
  reactivación no forma parte de esta funcionalidad.
- La desactivación no cambia ni cancela reservas existentes; únicamente bloquea la
  disponibilidad para reservas nuevas.
- El flujo de reservas consume el contrato de disponibilidad del catálogo y comparte
  su bloqueo al validar y persistir una reserva. La funcionalidad de reservas es
  responsable de esa integración y de la regla de no solapamiento entre reservas
  activas; este catálogo no implementa el ciclo de vida de reservas.
- Los mensajes de validación y de acceso no autorizado se presentan en español.
- Una persona sin sesión debe iniciar sesión antes de consultar el catálogo o un
  detalle; la aplicación le indica este requisito en español.
