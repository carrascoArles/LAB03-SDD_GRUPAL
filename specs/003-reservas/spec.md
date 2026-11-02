# Especificación de funcionalidad: Reservas

**Rama de funcionalidad**: `003-reservas`

**Creada**: 2026-10-29

**Estado**: Borrador

**Entrada**: Descripción del usuario: «Reservas para ReservaLocal. Parte del código existente de las funcionalidades 001 (usuarios) y 002 (espacios) en main y respeta sus contratos. Un usuario con sesión iniciada puede reservar un espacio activo eligiendo fecha, hora de inicio y duración. Reglas de negocio: el local atiende de 08:00 a 22:00; las reservas son por bloques de una hora y duran entre 1 y 3 horas; no se puede reservar en el pasado; dos reservas activas del mismo espacio no pueden solaparse, y una reserva que termina a la misma hora en que empieza otra no se considera solapamiento. El usuario puede ver sus reservas, cancelar las suyas hasta 1 hora antes del inicio, y consultar las horas libres de un espacio en una fecha. Una reserva cancelada libera el horario. Un usuario no puede ver ni cancelar reservas de otros. Requisitos de calidad: todos los intentos inválidos muestran un mensaje claro en español; si los datos guardados están corruptos la app arranca sin reservas y avisa; las reservas guardan el id del usuario y del espacio, no copias de sus datos.»

## Aclaraciones

### Sesión 2026-10-29

- P: ¿Se puede reservar una franja cuyo inicio coincide exactamente con la hora
  actual? → R: Sí. Solo se rechaza la reserva si su inicio es anterior al momento
  actual, comparando al minuto.
- P: ¿Qué ocurre si se cancela una reserva que ya está cancelada? → R: No es un
  error: la operación no cambia nada y confirma que la reserva está cancelada.
  Cancelar dos veces equivale a cancelar una vez.
- P: ¿Qué mensaje recibe una persona que intenta cancelar una reserva de otra? → R:
  El mismo que para una reserva inexistente («La reserva no existe o no te
  pertenece»), para no revelar que la reserva ajena existe.
- P: ¿La consulta de horas libres del día actual debe ocultar las horas que ya
  pasaron? → R: No. Las horas libres son los bloques del horario que no ocupa ninguna
  reserva activa, de modo que horas libres más horas reservadas suman siempre 14. La
  vista marca como pasadas las horas que ya no se pueden reservar, y reservarlas se
  rechaza por RF-006.
- P: ¿Qué se hace con los datos de reservas corruptos al arrancar? → R: Se guarda una
  copia del valor dañado en una clave de respaldo, se arranca con la lista de reservas
  vacía y se muestra un aviso en español. El respaldo no se borra automáticamente.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1: Reservar un espacio (Prioridad: P1)

Como usuario con sesión iniciada, quiero reservar un espacio activo eligiendo la
fecha, la hora de inicio y la duración para asegurarme de que el espacio estará
disponible cuando lo necesite.

**Por qué tiene esta prioridad**: Reservar es el propósito principal de
ReservaLocal; sin esta historia las demás no aportan valor.

**Prueba independiente**: Con una sesión iniciada y un espacio activo, reservar una
franja futura válida y comprobar que la reserva queda guardada como activa; luego
intentar reservar una franja que se cruza con ella y comprobar que se rechaza con un
mensaje en español.

**Escenarios de aceptación**:

1. **Dado** que una persona ha iniciado sesión y existe un espacio activo, **cuando**
   reserva una fecha futura a las 10:00 durante 2 horas, **entonces** la reserva
   queda guardada como activa de 10:00 a 12:00.
2. **Dado** que existe una reserva activa de 10:00 a 12:00 en un espacio, **cuando**
   otra persona intenta reservar ese espacio de 11:00 a 12:00 el mismo día,
   **entonces** la reserva se rechaza porque el horario ya está ocupado.
3. **Dado** que existe una reserva activa de 10:00 a 12:00 en un espacio, **cuando**
   se reserva ese espacio de 12:00 a 13:00 el mismo día, **entonces** la reserva se
   acepta porque terminar a la hora en que empieza otra no es solapamiento.
4. **Dado** que se elige una hora de inicio anterior a las 08:00 o una duración que
   haría terminar la reserva después de las 22:00, **cuando** se intenta reservar,
   **entonces** la reserva se rechaza indicando el horario de atención.
5. **Dado** que se elige una duración de 0 horas o de más de 3 horas, **cuando** se
   intenta reservar, **entonces** la reserva se rechaza indicando que la duración
   debe ser de 1 a 3 horas.
6. **Dado** que la fecha y hora elegidas ya pasaron, **cuando** se intenta reservar,
   **entonces** la reserva se rechaza indicando que no se puede reservar en el
   pasado.
7. **Dado** que el espacio elegido no existe o está desactivado, **cuando** se
   intenta reservar, **entonces** la reserva se rechaza indicando que el espacio no
   está disponible.
8. **Dado** que no hay una sesión iniciada, **cuando** alguien intenta reservar,
   **entonces** la operación se rechaza indicando que debe iniciar sesión.

---

### Historia de usuario 2: Ver y cancelar mis reservas (Prioridad: P1)

Como usuario con sesión iniciada, quiero ver mis reservas y cancelar las que ya no
necesito para liberar el horario y que otra persona pueda usarlo.

**Por qué tiene esta prioridad**: Sin cancelar, las franjas quedarían ocupadas por
reservas que nadie usará; y sin ver las reservas propias, la persona no sabe qué
tiene comprometido.

**Prueba independiente**: Con dos usuarios y reservas de ambos, comprobar que cada
uno solo ve las suyas; cancelar una reserva propia con más de una hora de antelación
y comprobar que la franja vuelve a estar libre.

**Escenarios de aceptación**:

1. **Dado** que una persona tiene reservas, **cuando** consulta sus reservas,
   **entonces** ve todas sus reservas con espacio, fecha, hora de inicio, hora de fin
   y estado, y ninguna reserva de otra persona.
2. **Dado** que una reserva propia empieza dentro de 1 hora o más, **cuando** la
   persona la cancela, **entonces** la reserva pasa a estado cancelada y el horario
   queda libre para nuevas reservas.
3. **Dado** que una reserva propia empieza en menos de 1 hora, **cuando** la persona
   intenta cancelarla, **entonces** la cancelación se rechaza indicando el margen de
   1 hora.
4. **Dado** que una reserva pertenece a otra persona, **cuando** alguien intenta
   cancelarla, **entonces** la cancelación se rechaza con el mismo mensaje que una
   reserva inexistente y la reserva no cambia.
5. **Dado** que una reserva propia ya está cancelada, **cuando** la persona vuelve a
   cancelarla, **entonces** la operación no cambia nada y confirma que la reserva
   está cancelada.

---

### Historia de usuario 3: Consultar horas libres (Prioridad: P2)

Como usuario con sesión iniciada, quiero consultar las horas libres de un espacio en
una fecha para elegir una franja disponible antes de reservar.

**Por qué tiene esta prioridad**: Facilita reservar a la primera, pero la reserva ya
valida la disponibilidad por sí misma.

**Prueba independiente**: Con un espacio que tiene reservas activas y canceladas en
una fecha, consultar las horas libres y comprobar que aparecen todas las horas del
horario de atención excepto las ocupadas por reservas activas.

**Escenarios de aceptación**:

1. **Dado** que un espacio no tiene reservas en una fecha, **cuando** se consultan
   sus horas libres, **entonces** aparecen las 14 horas de 08:00 a 21:00 como inicio
   de bloque libre.
2. **Dado** que un espacio tiene una reserva activa de 10:00 a 12:00, **cuando** se
   consultan sus horas libres en esa fecha, **entonces** no aparecen los bloques de
   10:00 ni de 11:00.
3. **Dado** que una reserva fue cancelada, **cuando** se consultan las horas libres,
   **entonces** sus bloques vuelven a aparecer como libres.
4. **Dado** que el espacio no existe o está desactivado, **cuando** se consultan sus
   horas libres, **entonces** la consulta se rechaza indicando que el espacio no está
   disponible.

### Casos límite

- Aceptar una reserva que empieza a las 08:00 y otra que termina exactamente a las
  22:00; rechazar una que empieza a las 07:00 y una que empieza a las 21:00 con
  duración de 2 horas.
- Aceptar duraciones de 1 y 3 horas; rechazar 0, 4 y valores no enteros.
- Rechazar horas de inicio que no sean en punto (por ejemplo, 10:30).
- Aceptar reservas adyacentes (una termina a la hora en que empieza la otra) en el
  mismo espacio.
- Permitir reservas que se solapan en espacios distintos.
- Una reserva cancelada no bloquea una nueva reserva del mismo horario.
- Cancelar con exactamente 1 hora de antelación se acepta; con 59 minutos se
  rechaza.
- Reservar con inicio igual a la hora actual se acepta; con inicio un minuto antes de
  la hora actual se rechaza.
- Cancelar una reserva ya cancelada no cambia nada ni produce error.
- Las horas libres del día actual incluyen las horas ya pasadas que no tienen
  reservas activas; la vista las marca como pasadas.
- Rechazar fechas inexistentes (por ejemplo, 30 de febrero).
- Si los datos guardados de reservas están corruptos, la aplicación guarda una copia
  de respaldo, arranca sin reservas y muestra un aviso en español.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **RF-001**: Solo una persona con sesión iniciada DEBE poder reservar, ver sus
  reservas, cancelarlas y consultar horas libres. Sin sesión, la aplicación DEBE
  indicar en español que es necesario iniciar sesión.
- **RF-002**: La aplicación DEBE permitir reservar un espacio eligiendo fecha, hora de
  inicio y duración.
- **RF-003**: Solo un espacio existente y activo DEBE admitir reservas nuevas.
- **RF-004**: Toda reserva DEBE empezar a las 08:00 o después y terminar a las 22:00 o
  antes.
- **RF-005**: Las reservas DEBEN ser por bloques de una hora: la hora de inicio DEBE
  ser una hora en punto y la duración un número entero de 1 a 3 horas.
- **RF-006**: La aplicación NO DEBE aceptar reservas cuyo inicio sea anterior al
  momento actual, comparando al minuto. Un inicio igual al momento actual se acepta.
- **RF-007**: Dos reservas activas del mismo espacio NO DEBEN solaparse. Una reserva
  que termina a la misma hora en que empieza otra no se considera solapamiento. Las
  reservas canceladas no cuentan para el solapamiento.
- **RF-008**: La aplicación DEBE mostrar a cada persona sus reservas, activas y
  canceladas, ordenadas por fecha y hora de inicio.
- **RF-009**: Una persona DEBE poder cancelar sus reservas activas hasta 1 hora antes
  del inicio (con 60 minutos o más de antelación). Cancelar una reserva propia ya
  cancelada NO DEBE cambiar nada ni producir error.
- **RF-010**: Al cancelar una reserva, su horario DEBE quedar libre para nuevas
  reservas.
- **RF-011**: Una persona NO DEBE poder ver ni cancelar reservas de otras personas.
  Intentar cancelar una reserva ajena DEBE producir el mismo mensaje que una reserva
  inexistente.
- **RF-012**: La aplicación DEBE permitir consultar las horas libres de un espacio en
  una fecha, es decir, los bloques de una hora entre 08:00 y 22:00 que no ocupa
  ninguna reserva activa. La consulta no oculta las horas ya pasadas; la vista las
  marca como no reservables. Si el espacio no existe o está desactivado, la consulta
  DEBE rechazarse indicando que el espacio no está disponible.
- **RF-013**: Todo intento inválido DEBE mostrar un mensaje en español que indique
  qué regla se incumplió (sesión, espacio, fecha, hora de inicio, duración, horario
  de atención, pasado, solapamiento, margen de cancelación o propiedad de la reserva)
  y qué debe cambiar la persona para corregirlo.
- **RF-014**: Si los datos guardados de reservas están corruptos, la aplicación DEBE
  guardar una copia del valor dañado en una clave de respaldo, arrancar sin reservas
  y avisar en español a la persona usuaria. El respaldo NO DEBE borrarse
  automáticamente.
- **RF-015**: Cada reserva DEBE guardar el identificador del usuario y del espacio, y
  NO DEBE guardar copias de sus datos (nombre, correo, nombre del espacio, etc.).
- **RF-016**: Un intento rechazado NO DEBE modificar los datos guardados, y un fallo
  al guardar NO DEBE comunicarse como éxito.

### Entidades clave *(incluidas porque la funcionalidad maneja datos)*

- **Reserva**: Uso de un espacio por una persona en una franja; comprende un
  identificador, el identificador del usuario, el identificador del espacio, inicio,
  fin, estado (activa o cancelada) y fechas de creación y cancelación.
- **Espacio**: Proviene del catálogo (funcionalidad 002). Solo los espacios activos
  admiten reservas nuevas.
- **Usuario y sesión**: Provienen de cuentas y sesión (funcionalidad 001). Identifican
  a la persona propietaria de cada reserva.
- **Horario de atención**: De 08:00 a 22:00, dividido en 14 bloques de una hora.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **CE-001**: En pruebas con secuencias aleatorias de reservas y cancelaciones, el
  100 % de los estados resultantes no contiene dos reservas activas solapadas en el
  mismo espacio.
- **CE-002**: El 100 % de los intentos fuera del horario, con duración inválida, en el
  pasado o sobre un horario ocupado se rechazan con un mensaje en español y sin
  cambiar los datos.
- **CE-003**: Para cualquier espacio y fecha, las horas libres más las horas
  reservadas suman siempre las 14 horas del horario de atención.
- **CE-004**: El 100 % de los intentos de ver o cancelar reservas ajenas se rechazan.
- **CE-005**: Una persona con sesión puede consultar las horas libres y completar una
  reserva en menos de 1 minuto.

## Supuestos

- La sesión, el usuario y su identificador provienen de la funcionalidad 001; no se
  modifica su contrato.
- El catálogo y la comprobación de espacio activo provienen de la funcionalidad 002;
  no se modifica su contrato.
- El horario de atención es el mismo todos los días de la semana, incluidos sábados,
  domingos y feriados.
- Las fechas y horas se interpretan en la hora local del navegador de la persona.
- Desactivar un espacio no cancela sus reservas existentes; estas se siguen viendo y
  se pueden cancelar con las mismas reglas. Como el catálogo de 002 solo da a un
  usuario normal los datos de espacios activos, esas reservas se muestran como
  «Espacio desactivado» en lugar del nombre.
- El rol `admin` reserva y cancela como cualquier usuario; la cancelación de reservas
  ajenas por el administrador pertenece a la funcionalidad 004.
- No hay límite de reservas por persona ni antelación máxima para reservar.
