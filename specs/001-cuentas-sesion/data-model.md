# Modelo de datos: Cuentas y sesión

## Entidades

### `User` — modelo público

Representa la identidad segura para consumo por la vista y los módulos dependientes.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `string` | Identificador único, no vacío e inmutable. |
| `name` | `string` | Texto recortado, de 2 a 50 puntos de código Unicode inclusive. |
| `email` | `string` | Correo validado, recortado y normalizado a minúsculas; único tras normalizar. |
| `role` | `UserRole` | `admin` o `usuario`, asignado por la regla de primer registro. |

`User` nunca contiene contraseña, sal ni hash. Los módulos de espacios, reservas y
administración reciben esta proyección pública, no el registro privado de credenciales.

### `UserRole`

Unión cerrada de los roles `admin` y `usuario`. Si no hay usuarios registrados, no
hay roles asignados. Si hay usuarios, el primer registro válido es el único `admin`
y los posteriores son `usuario`.

### `UserRecord` — persistencia privada

Contiene los campos de `User` y la información privada necesaria para verificar la
contraseña.

| Campo | Tipo | Regla |
|---|---|---|
| `passwordAlgorithm` | `"sha256-salt-v1"` | Identifica el formato vigente de verificación. |
| `salt` | `string` hexadecimal | Sal aleatoria única de 16 bytes (32 caracteres hexadecimales). |
| `passwordHash` | `string` hexadecimal | Digest SHA-256 de 32 bytes (64 caracteres hexadecimales). |

La contraseña se codifica en UTF-8 y se anteponen los bytes de la sal al calcular
`SHA-256(salBytes || UTF8(contraseña))`. La contraseña original no se serializa, no
se registra y no se devuelve desde el servicio. SHA-256 con sal es una restricción
expresa del alcance didáctico; no tiene el coste deliberado de una función de
derivación de contraseñas.

### `Session`

Identifica la cuenta actualmente conectada.

| Campo | Tipo | Regla |
|---|---|---|
| `userId` | `string` | Debe corresponder a un `UserRecord` válido. |

La sesión anónima se representa como `null`. En almacenamiento se persiste solo el
identificador de usuario, no una copia no validada de `User`. Cerrar sesión cambia
ese identificador a `null`.

### `AuthState` — documento persistido

Un único documento JSON bajo la clave `reservalocal.auth.v1` mantiene coherentes la
lista de cuentas y la sesión.

| Campo | Tipo | Regla |
|---|---|---|
| `schemaVersion` | `1` | Versión del formato de almacenamiento. |
| `users` | `UserRecord[]` | Cuentas en orden de registro, validadas al cargar. |
| `sessionUserId` | `string \| null` | Identificador de sesión; debe existir en `users`. |

La serialización incluye el esquema de credenciales, sal y hash, pero nunca el texto
de la contraseña. La lectura valida estructura, tipos, rangos, unicidad de
identificadores y correos, valores de rol, formato de hash/sal e integridad de la
referencia de sesión. Se rechazan campos desconocidos para evitar aceptar datos
secretos inesperados.

## Invariantes

1. Los identificadores de usuario son únicos.
2. Los correos normalizados son únicos, independientemente de las mayúsculas del
   valor introducido.
3. Cada nombre tiene entre 2 y 50 puntos de código Unicode después de recortar
   espacios en los extremos.
4. Cada contraseña presentada tiene entre 8 y 64 puntos de código Unicode. No se
   recortan ni transforman sus caracteres.
5. Si `users` está vacío, `sessionUserId` es `null`. Si hay cuentas, el primer
   elemento tiene rol `admin` y todos los siguientes tienen rol `usuario`.
6. `sessionUserId` es `null` o referencia una cuenta existente y validada.
7. El modelo público `User` nunca incluye campos de contraseña, sal o hash.
8. La persistencia nunca incluye una contraseña en texto plano.
9. Operaciones concurrentes de lectura-modificación-escritura se ejecutan bajo el
   bloqueo exclusivo compartido; sin Web Locks, no se realiza ninguna escritura.
10. Datos ausentes representan un estado inicial vacío. Datos corruptos no se aceptan
    como cuentas: la aplicación arranca con estado vacío, notifica el problema y no
    restaura una sesión no validada.

## Transiciones de estado

| Estado previo | Operación | Resultado |
|---|---|---|
| Sin cuentas, sesión anónima | Registro válido | Primera cuenta creada como `admin`; la sesión permanece anónima. |
| Con cuentas, sesión anónima | Registro válido | Nueva cuenta `usuario`; la sesión existente sigue anónima. |
| Correo ya registrado | Registro | Error de correo duplicado; no cambia el documento. |
| Cuenta válida, sesión anónima | Login válido | `sessionUserId` se actualiza al identificador de esa cuenta. |
| Cualquier estado | Login inválido | Error genérico `INVALID_CREDENTIALS`; sin cambios de sesión. |
| Sesión activa | Cierre de sesión | `sessionUserId` pasa a `null`. |
| Documento válido | Recarga | Se valida el documento y se restaura la sesión solo si la cuenta sigue válida. |
| Documento corrupto | Inicio de aplicación | Estado en memoria vacío, sin sesión, error recuperable para mostrar un aviso. |
| Cualquier mutación | Error de bloqueo o escritura | Devuelve error; no presenta la mutación como exitosa. |

El registro no inicia automáticamente una sesión. El flujo de especificación exige
crear la cuenta; iniciar sesión es una operación separada.
