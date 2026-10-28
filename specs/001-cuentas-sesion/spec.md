# Especificación de funcionalidad: Cuentas y sesión

**Rama de funcionalidad**: `no-asignada`

**Creada**: 2026-10-28

**Estado**: Borrador

**Entrada**: Descripción del usuario: «Cuentas y sesión para ReservaLocal. Un visitante puede registrarse con nombre, correo y contraseña, iniciar sesión, cerrar sesión y mantener la sesión al recargar la página. Reglas: el nombre tiene entre 2 y 50 caracteres; el correo tiene formato válido y es único sin distinguir mayúsculas; la contraseña tiene entre 8 y 64 caracteres. Hay dos roles, usuario y admin; el primer usuario que se registra es admin y los siguientes son usuarios. Un login incorrecto muestra un mensaje genérico en español que no revela si el correo existe. Requisitos de calidad: las contraseñas se guardan como hash, nunca en texto plano; si los datos guardados están corruptos la app arranca sin usuarios y avisa. Esta funcionalidad es la base de otras tres (espacios, reservas y panel de administración), por eso debe exponer un modelo User, la sesión actual y funciones claras para saber quién está conectado y si es admin.»

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1: Crear una cuenta (Prioridad: P1)

Como visitante, quiero registrarme con mi nombre, correo y contraseña para obtener
una cuenta y acceder a las funciones de ReservaLocal.

**Por qué tiene esta prioridad**: Las cuentas son la base de las sesiones y de las
funcionalidades que necesitan identificar al usuario.

**Prueba independiente**: En un almacén vacío, registrar una cuenta válida y comprobar
que el usuario puede iniciar sesión y que recibe el rol inicial correspondiente.

**Escenarios de aceptación**:

1. **Dado** que no hay cuentas guardadas, **cuando** un visitante se registra con un
   nombre, correo y contraseña válidos, **entonces** se crea una cuenta con rol
   administrador.
2. **Dado** que ya existe una cuenta, **cuando** otro visitante completa un registro
   válido, **entonces** se crea una cuenta con rol usuario.
3. **Dado** que el nombre tiene menos de 2 o más de 50 caracteres, **cuando** se
   intenta registrar, **entonces** se rechaza el registro y se indica el campo que
   requiere corrección.
4. **Dado** que el correo no tiene formato válido o ya está registrado, sin distinguir
   mayúsculas y minúsculas, **cuando** se intenta registrar, **entonces** se rechaza
   el registro y no se crea una cuenta duplicada.
5. **Dado** que la contraseña tiene menos de 8 o más de 64 caracteres, **cuando** se
   intenta registrar, **entonces** se rechaza el registro.

---

### Historia de usuario 2: Iniciar y cerrar sesión (Prioridad: P1)

Como usuario registrado, quiero iniciar sesión y cerrarla cuando termine para
controlar el acceso a mi cuenta.

**Por qué tiene esta prioridad**: La identificación permite que ReservaLocal adapte
sus funciones y permisos al usuario conectado.

**Prueba independiente**: Iniciar sesión con credenciales correctas, verificar la
identidad y el rol reconocidos, y cerrar la sesión.

**Escenarios de aceptación**:

1. **Dado** que existe una cuenta, **cuando** la persona introduce su correo y
   contraseña correctos, **entonces** inicia sesión y la sesión identifica a esa
   cuenta.
2. **Dado** que el correo no existe o que la contraseña es incorrecta, **cuando** se
   intenta iniciar sesión, **entonces** se muestra el mismo mensaje genérico en
   español y no se revela cuál de las credenciales falló.
3. **Dado** que hay una sesión activa, **cuando** la persona cierra sesión,
   **entonces** la sesión deja de estar activa y las consultas posteriores indican
   que no hay una persona conectada.
4. **Dado** que hay una sesión activa, **cuando** se recarga la página,
   **entonces** la sesión sigue identificando a la misma cuenta.

---

### Historia de usuario 3: Consultar identidad, rol y estado recuperado (Prioridad: P2)

Como funcionalidad que depende de cuentas, quiero consultar de forma consistente el
usuario actual, su rol y si hay una sesión activa o permisos de administración.
Como visitante, también necesito recibir un aviso claro si la aplicación no puede
usar los datos guardados.

**Por qué tiene esta prioridad**: Espacios, reservas y administración dependen de
identidades y permisos coherentes; la recuperación evita que los datos corruptos
impidan iniciar la aplicación.

**Prueba independiente**: Comprobar las consultas de identidad y permisos con una
sesión anónima, una sesión de usuario y una sesión de administrador; después iniciar
la aplicación con datos guardados corruptos.

**Escenarios de aceptación**:

1. **Dado** que no hay una sesión activa, **cuando** una funcionalidad consulta el
   estado de autenticación, **entonces** obtiene que no hay usuario conectado y que
   no tiene permisos de administrador.
2. **Dado** que hay una sesión activa, **cuando** una funcionalidad consulta la
   identidad, **entonces** obtiene el modelo público de la cuenta actual y puede
   consultar explícitamente si hay una sesión activa y si el rol es administrador.
3. **Dado** que los datos guardados de cuentas o sesiones están corruptos,
   **cuando** se inicia la aplicación, **entonces** esta continúa sin usuarios
   registrados, sin una sesión activa y muestra un aviso en español.
4. **Dado** que una persona tiene rol usuario, **cuando** una funcionalidad consulta
   sus permisos administrativos, **entonces** obtiene que no es administradora.

### Casos límite

- Rechazar nombres con 1 o 51 caracteres y aceptar los límites de 2 y 50.
- Rechazar contraseñas de 7 o 65 caracteres y aceptar los límites de 8 y 64.
- Tratar correos que solo difieren en mayúsculas como una misma identidad para
  unicidad e inicio de sesión.
- Rechazar correos vacíos, incompletos o con formato inválido.
- No crear cuentas ni activar sesiones ante datos de registro o acceso inválidos.
- Garantizar que, entre varias cuentas, solo la primera cuenta registrada correctamente
  en un conjunto vacío tenga rol administrador.
- Mantener el rechazo de credenciales incorrectas indistinguible tanto para correo
  inexistente como para contraseña incorrecta.
- Recuperarse de datos guardados corruptos sin bloquear el inicio ni presentar una
  sesión o cuentas no verificadas.
- Tras cerrar sesión, una recarga no debe restaurar la sesión cerrada.
- Si el almacenamiento no está disponible o no admite más datos, informar el error
  sin presentar como exitoso el registro o el cambio de sesión que no pudo guardarse.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **RF-001**: La persona visitante DEBE poder crear una cuenta proporcionando nombre,
  correo y contraseña.
- **RF-002**: El sistema DEBE aceptar nombres de entre 2 y 50 caracteres inclusive;
  debe rechazar los que queden fuera de ese rango.
- **RF-003**: El sistema DEBE validar que el correo tenga un formato válido antes de
  crear la cuenta.
- **RF-004**: El correo DEBE ser único sin distinguir mayúsculas y minúsculas. El
  sistema DEBE rechazar intentos de registro duplicado.
- **RF-005**: El sistema DEBE aceptar contraseñas de entre 8 y 64 caracteres
  inclusive y rechazar las que queden fuera de ese rango.
- **RF-006**: El sistema DEBE asignar el rol administrador a la primera cuenta
  registrada correctamente cuando no existan cuentas y el rol usuario a las
  siguientes. Ningún registro posterior DEBE crear otro administrador por defecto.
- **RF-007**: El sistema DEBE permitir que una persona con cuenta inicie sesión con
  su correo y contraseña válidos.
- **RF-008**: Si el inicio de sesión falla por correo inexistente o contraseña
  incorrecta, el sistema DEBE mostrar el mismo mensaje genérico en español y no
  indicar cuál de los datos fue incorrecto.
- **RF-009**: El sistema DEBE permitir cerrar la sesión y dejar de reconocer como
  actual al usuario que la cerró.
- **RF-010**: Una sesión iniciada DEBE mantenerse después de recargar la página hasta
  que se cierre sesión o los datos de sesión no puedan validarse.
- **RF-011**: El sistema DEBE exponer a las funcionalidades dependientes un modelo
  público `User` que identifique al usuario e incluya su nombre, correo y rol, sin
  exponer la contraseña ni su hash.
- **RF-012**: El sistema DEBE exponer la sesión actual y consultas explícitas para
  saber si hay una persona conectada, quién es y si su rol es administrador.
- **RF-013**: El sistema DEBE validar en tiempo de ejecución los datos de cuenta y
  sesión recuperados del almacenamiento. Los datos no válidos DEBEN producir un
  resultado de error y no una excepción ni una aceptación implícita.
- **RF-014**: Si los datos guardados de cuentas o sesiones están corruptos, el sistema
  DEBE iniciar sin cuentas ni sesión activa y mostrar un aviso comprensible en
  español.
- **RF-015**: Las contraseñas NUNCA DEBEN guardarse ni recuperarse en texto plano; el
  sistema solo DEBE conservar un hash de la contraseña y NO DEBE incluirlo en el
  modelo público `User`.
- **RF-016**: Las operaciones de dominio DEBEN representar los errores de validación,
  registro, acceso y almacenamiento mediante `Result<T, E>` y NO DEBEN lanzar
  excepciones.
- **RF-017**: Los mensajes dirigidos al usuario DEBEN estar en español y explicar
  cómo corregir errores de validación sin revelar información de cuentas durante
  un inicio de sesión fallido.
- **RF-018**: La documentación de la funcionalidad DEBE advertir que la autenticación
  local es didáctica y no reemplaza la autenticación ni la autorización realizadas
  por un servidor.

### Entidades clave

- **User**: Cuenta pública de una persona registrada; contiene identificador, nombre,
  correo y rol (`usuario` o `admin`). No incluye contraseña ni hash.
- **Sesión**: Estado que identifica al `User` actualmente conectado y permite conocer
  si hay una sesión activa; persiste entre recargas y deja de estar activa al cerrar
  sesión.
- **Rol**: Nivel de acceso asociado a la cuenta. Solo admite `usuario` y `admin`; la
  primera cuenta registrada recibe `admin` y las siguientes reciben `usuario`.
- **Credencial**: Correo y contraseña presentados para acceder. La contraseña
  original no se conserva; el sistema guarda únicamente su hash.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **CE-001**: Una persona puede completar un registro válido en menos de 2 minutos.
- **CE-002**: El 100 % de los intentos de registro verificados respeta los límites de
  nombre y contraseña, valida el correo y evita duplicados sin distinguir
  mayúsculas.
- **CE-003**: En el 100 % de los casos verificados, solo la primera cuenta creada en
  un conjunto vacío recibe rol administrador y las cuentas posteriores reciben rol
  usuario.
- **CE-004**: El 100 % de los casos verificados de inicio de sesión incorrecto
  presenta el mismo mensaje genérico, tanto si el correo no existe como si la
  contraseña es incorrecta.
- **CE-005**: En el 100 % de las recargas verificadas, una sesión válida permanece
  activa y una sesión cerrada no se restaura.
- **CE-006**: En el 100 % de las pruebas de recuperación con datos corruptos, la
  aplicación inicia sin usuarios ni sesión activa y presenta un aviso en español.
- **CE-007**: Ninguna cuenta expone ni conserva una contraseña en texto plano, y las
  funcionalidades dependientes pueden determinar de forma inequívoca el usuario
  conectado y si es administrador.

## Suposiciones

- Los espacios en blanco al inicio o al final del nombre y del correo se eliminan
  antes de validar y guardar; la comparación de correo no distingue mayúsculas.
- La contraseña se valida y verifica exactamente como se proporciona, sin quitar
  espacios.
- La primera cuenta se define como la primera cuenta válida que se guarda cuando el
  conjunto local de cuentas está vacío. El rol no se elige durante el registro.
- La sesión persiste en el mismo navegador y perfil local; no se sincroniza entre
  dispositivos ni navegadores.
- El restablecimiento de contraseña, la verificación de correo y la recuperación de
  cuentas no forman parte de esta funcionalidad.
- La autenticación local tiene fines didácticos y no se considera un límite de
  seguridad frente a quien controla el navegador o sus datos.
- El almacenamiento disponible es local y puede llenarse o contener datos alterados;
  la aplicación informa de fallos en vez de aparentar que una operación tuvo éxito.
