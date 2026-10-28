# Contrato público: autenticación

Este contrato es la interfaz de la funcionalidad `src/auth` para la vista y los
módulos dependientes. Los consumidores importan únicamente tipos y operaciones
públicas descritas aquí; no acceden al almacenamiento ni a los registros privados.

## Tipos públicos

```ts
export type UserRole = "usuario" | "admin";

export interface User {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
}

export interface Session {
  readonly userId: string;
}

export interface RegisterInput {
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

export type AuthErrorCode =
  | "INVALID_NAME"
  | "INVALID_EMAIL"
  | "INVALID_PASSWORD"
  | "EMAIL_ALREADY_USED"
  | "INVALID_CREDENTIALS"
  | "CORRUPT_STORAGE"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "LOCK_UNAVAILABLE"
  | "CRYPTO_UNAVAILABLE";

export interface AuthError {
  readonly code: AuthErrorCode;
  readonly message: string;
}

export interface AuthService {
  initialize(): Result<void, AuthError>;
  registerUser(input: RegisterInput): Promise<Result<User, AuthError>>;
  login(input: LoginInput): Promise<Result<User, AuthError>>;
  logout(): Promise<Result<void, AuthError>>;
  getCurrentUser(): Result<User | null, AuthError>;
  getSession(): Result<Session | null, AuthError>;
  isAdmin(): Result<boolean, AuthError>;
}
```

`Result<T, E>` se importa desde `src/shared/result.ts`. La implementación concreta
mantiene la lógica de error en `AuthError`; los mensajes que se muestran a las
personas usuarias están en español.

## Operaciones

### `initialize()`

- Valida en tiempo de ejecución el documento de autenticación persistido.
- Si no hay documento, prepara el estado inicial vacío y devuelve `Ok(undefined)`.
- Si detecta datos corruptos, cambia a un estado en memoria sin cuentas ni sesión,
  devuelve `CORRUPT_STORAGE` para que `main.ts` muestre un aviso y permite que la
  aplicación continúe. El estado vacío puede reemplazar el documento corrupto en el
  siguiente registro válido, solo después de confirmar la escritura.
- No confía en un objeto de sesión guardado sin validar la cuenta referenciada.

### `registerUser(input)`

- Recorta nombre y correo, valida nombre de 2–50 caracteres, formato de correo y
  contraseña de 8–64 caracteres.
- Normaliza el correo sin distinguir mayúsculas; detecta duplicados con esa forma.
- Genera el hash con sal antes de entrar al bloqueo, luego relee el documento dentro
  del bloqueo exclusivo y asigna `admin` solo si aún no existen cuentas.
- Si el arranque detectó datos corruptos, usa el estado vacío recuperado y reemplaza
  el documento corrupto solo tras validar la entrada y confirmar la nueva escritura.
- Devuelve el `User` público únicamente después de que la persistencia se confirme.
- Errores de validación son específicos; el hash y la sal nunca forman parte del
  valor devuelto.

### `login(input)`

- Normaliza y valida el correo, busca la cuenta y verifica la contraseña.
- Para correo inexistente y contraseña incorrecta devuelve el mismo código
  `INVALID_CREDENTIALS` y el mismo mensaje genérico en español.
- Solo establece la sesión tras verificar las credenciales y confirmar el cambio
  persistido bajo el mismo bloqueo exclusivo.
- Nunca devuelve ni incluye credenciales en mensajes de error.

### `logout()`

- Bajo bloqueo exclusivo cambia la referencia de sesión a `null`.
- Devuelve `Ok(undefined)` solo tras confirmar la escritura. Un error de
  almacenamiento se devuelve como error y no se comunica como cierre exitoso.

### `getCurrentUser()`

- Lee el estado validado y devuelve el usuario público conectado, o `null` si no hay
  sesión.
- No expone `UserRecord`, sal ni hash. Los errores de lectura o integridad son
  `Err(AuthError)`, no excepciones ni un valor ficticio.

### `getSession()`

- Devuelve la sesión pública actual `{ userId }` o `null`.
- Comprueba que el identificador de la sesión existe y que la cuenta es válida.

### `isAdmin()`

- Devuelve `Ok(true)` solo si existe una sesión válida cuyo rol es `admin`.
- Devuelve `Ok(false)` para personas anónimas y usuarios con rol `usuario`.
- Devuelve `Err(AuthError)` si no puede validar la sesión o leer el estado.

## Errores visibles

| Código | Tratamiento |
|---|---|
| `INVALID_NAME`, `INVALID_EMAIL`, `INVALID_PASSWORD` | Indicar en español qué campo debe corregirse. |
| `EMAIL_ALREADY_USED` | Informar en español que el correo ya está registrado. |
| `INVALID_CREDENTIALS` | Usar exactamente el mismo mensaje genérico para correo inexistente y contraseña incorrecta. |
| `CORRUPT_STORAGE` | Mostrar un aviso en español; continuar sin cuentas ni sesión. |
| `STORAGE_UNAVAILABLE`, `STORAGE_READ_FAILED`, `STORAGE_WRITE_FAILED` | Informar del problema; no indicar que una operación no persistida tuvo éxito. |
| `LOCK_UNAVAILABLE` | Informar que no se pudo completar la operación de forma segura; no escribir sin coordinación. |
| `CRYPTO_UNAVAILABLE` | Informar que no se pudo procesar la credencial y no crear una cuenta ni iniciar sesión. |

Los mensajes no revelan detalles internos de credenciales. Los mensajes de acceso
fallido no distinguen existencia de correo.

## Dependencias internas

- `StoragePort`: lectura, escritura y borrado con errores explícitos tipados.
- `LockPort`: ejecución de una operación exclusiva coordinada entre pestañas; en
  navegador se implementa con Web Locks. Las pruebas inyectan una implementación
  determinista.
- Generador/hasher de credenciales: adaptador Web Crypto sustituible en pruebas.
- `Result<T, E>`: resultado discriminado compartido.

## Límites de compatibilidad

Los módulos externos dependen de `User`, `Session`, `AuthService` y `AuthError`, no
del formato JSON ni del registro privado. Todo cambio incompatible a este contrato,
una vez publicado en `main`, se propone primero al grupo conforme a la constitución.
La autenticación y los roles locales son didácticos y no autorizan operaciones
sensibles fuera del navegador controlado por la aplicación.
