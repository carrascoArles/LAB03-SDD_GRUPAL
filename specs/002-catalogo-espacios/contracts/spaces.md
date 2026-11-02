# Contrato público: catálogo de espacios

Este contrato define la interfaz de la funcionalidad `src/spaces` para la vista y
otros módulos, incluida la funcionalidad de reservas. Los consumidores no leen ni
escriben directamente en `localStorage`.

## Tipos públicos

```ts
import type { Result } from "../shared/result";

export type SpaceType = "cancha" | "sala" | "consultorio";

export interface Space {
  readonly id: string;
  readonly name: string;
  readonly type: SpaceType;
  readonly capacity: number;
  readonly description?: string;
  readonly active: boolean;
}

export interface SpaceInput {
  readonly name: string;
  readonly type: SpaceType;
  readonly capacity: number;
  readonly description?: string;
}

export type SpaceErrorCode =
  | "INVALID_NAME"
  | "DUPLICATE_NAME"
  | "INVALID_TYPE"
  | "INVALID_CAPACITY"
  | "INVALID_DESCRIPTION"
  | "SPACE_NOT_FOUND"
  | "NOT_AUTHENTICATED"
  | "PERMISSION_DENIED"
  | "AUTH_STATE_UNAVAILABLE"
  | "CORRUPT_STORAGE"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_READ_FAILED"
  | "STORAGE_WRITE_FAILED"
  | "LOCK_UNAVAILABLE"
  | "LOCK_FAILED"
  | "ID_UNAVAILABLE";

export interface SpaceError {
  readonly code: SpaceErrorCode;
  readonly message: string;
}

export interface SpaceService {
  initialize(): Result<void, SpaceError>;
  createSpace(input: SpaceInput): Promise<Result<Space, SpaceError>>;
  updateSpace(
    id: string,
    input: SpaceInput,
  ): Promise<Result<Space, SpaceError>>;
  deactivateSpace(id: string): Promise<Result<Space, SpaceError>>;
  listActiveSpaces(): Result<readonly Space[], SpaceError>;
  listManagedSpaces(): Result<readonly Space[], SpaceError>;
  getActiveSpace(id: string): Result<Space, SpaceError>;
  existeYEstaActivo(id: string): Result<boolean, SpaceError>;
}
```

Todas las funciones que representan operaciones de dominio retornan un `Result`.
Las escrituras retornan `Promise<Result<...>>` porque esperan al bloqueo compartido.
La interfaz DOM comunica los mensajes de `SpaceError` en español; no reemplaza los
controles de permiso del servicio.

## Validación de entrada

- `name`: texto de 3 a 50 puntos de código Unicode; se compara sin distinguir
  mayúsculas para unicidad. Los espacios inactivos también reservan su nombre y una
  edición excluye el id del espacio que está modificando.
- `type`: exactamente `cancha`, `sala` o `consultorio`.
- `capacity`: número entero de 1 a 100 inclusive.
- `description`: opcional, de hasta 200 puntos de código Unicode.
- Cualquier fallo de validación rechaza la operación completa, sin persistencia
  parcial, y devuelve el código correspondiente en español.

## Operaciones

### `initialize()`

- Lee y valida el documento de espacios a través de `StoragePort`.
- Si no hay datos previos, inicia con un catálogo vacío y devuelve `Ok(undefined)`.
- Si hay datos corruptos, devuelve `CORRUPT_STORAGE`; no presenta datos inválidos
  como un catálogo vacío exitoso ni restaura espacios no validados.
- Un fallo de lectura se devuelve como error tipado.

### `createSpace(input)`

- Requiere una sesión activa con rol `admin`, comprobado por el servicio mediante
  `AuthService`.
- Valida todos los campos antes de mutar el documento.
- Bajo bloqueo exclusivo, relee el documento vigente, comprueba unicidad sin
  distinguir mayúsculas e incorpora el espacio activo.
- Devuelve el espacio público solo después de confirmar la escritura.

### `updateSpace(id, input)`

- Requiere el rol `admin` y valida la totalidad de la entrada.
- Relee y actualiza el espacio dentro de la operación coordinada.
- Rechaza ids inexistentes y nombres duplicados en otros espacios. La comparación
  excluye el espacio que se está editando.
- Conserva id y estado activo/inactivo; no ofrece reactivación. Si `description` se
  omite en la entrada completa de actualización, se elimina la descripción previa.

### `deactivateSpace(id)`

- Requiere el rol `admin`.
- Marca como inactivo el espacio existente y persiste el cambio bajo el bloqueo
  exclusivo.
- No elimina ni altera el espacio ni las reservas existentes.
- Devuelve error si el id no existe, el permiso no es válido o la persistencia falla.

### `listActiveSpaces()`, `listManagedSpaces()` y `getActiveSpace(id)`

- Devuelven únicamente espacios activos, validados desde el documento actual.
- `listManagedSpaces()` requiere rol `admin` y devuelve espacios activos e
  inactivos para permitir su edición administrativa.
- `getActiveSpace` devuelve `SPACE_NOT_FOUND` si el id no existe o está inactivo,
  sin exponerlo como opción disponible.
- `listActiveSpaces()` y `getActiveSpace()` requieren sesión iniciada; un usuario
  anónimo recibe un error en español.

### `existeYEstaActivo(id)`

- Devuelve `Ok(true)` solo si existe un espacio activo con ese id.
- Devuelve `Ok(false)` para espacios ausentes o inactivos.
- Devuelve `Err(SpaceError)` ante fallos de lectura o datos corruptos.
- La funcionalidad de reservas debe invocarla al aceptar una reserva nueva, dentro
  de la misma sección exclusiva que persiste dicha reserva. La desactivación usa
  `reservalocal.spaces.v1`; la escritura de reservas debe compartir ese mismo
  bloqueo para evitar carreras con la desactivación.

## Errores visibles

| Código | Tratamiento |
|---|---|
| `INVALID_NAME`, `INVALID_TYPE`, `INVALID_CAPACITY`, `INVALID_DESCRIPTION` | Indicar en español el campo y el límite que debe corregirse. |
| `DUPLICATE_NAME` | Informar en español que ya existe un espacio con ese nombre. |
| `SPACE_NOT_FOUND` | Informar en español que el espacio no existe o no está disponible. |
| `NOT_AUTHENTICATED` | Indicar en español que debe iniciar sesión. |
| `PERMISSION_DENIED` | Para rol `usuario`, mostrar «No tienes permiso para gestionar espacios». |
| `AUTH_STATE_UNAVAILABLE` | Informar que no se pudo comprobar la sesión o el rol; no mutar. |
| `CORRUPT_STORAGE` | Informar del estado corrupto en español, sin presentar datos inválidos como correctos. |
| `STORAGE_UNAVAILABLE`, `STORAGE_READ_FAILED`, `STORAGE_WRITE_FAILED` | Informar del error sin presentar como exitosa una operación no persistida. |
| `LOCK_UNAVAILABLE`, `LOCK_FAILED` | Informar que la operación no pudo coordinarse de forma segura; no escribir fuera del bloqueo. |
| `ID_UNAVAILABLE` | Informar que no se pudo crear un identificador seguro; no guardar el espacio. |

## Dependencias

- `StoragePort` para persistencia local con errores explícitos.
- `LockPort` para coordinar cambios entre pestañas; las pruebas inyectan una
  implementación determinista.
- `AuthService` para consultar sesión y rol administrador.
- `Result<T, E>` como resultado discriminado compartido.

La autenticación local y el control de roles son didácticos y no reemplazan la
autenticación ni autorización de un servidor.
