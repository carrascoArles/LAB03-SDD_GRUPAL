# Modelo de datos: Catálogo de espacios

## Entidades

### `Space` — modelo público

Representa un espacio conservado en ReservaLocal. Las vistas y otros módulos reciben
solo los campos de dominio declarados por el contrato.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `string` | Identificador único, no vacío e inmutable. |
| `name` | `string` | De 3 a 50 caracteres inclusive; único ignorando mayúsculas. |
| `type` | `SpaceType` | Exactamente `cancha`, `sala` o `consultorio`. |
| `capacity` | `number` | Entero de 1 a 100 inclusive. |
| `description` | `string \| undefined` | Opcional; máximo 200 caracteres cuando se proporciona. |
| `active` | `boolean` | `true` si se ofrece en el catálogo y admite nuevas reservas. |

El identificador, nombre y tipo son cadenas; la capacidad se valida en tiempo de
ejecución para excluir valores no numéricos, decimales y valores fuera de rango.
Los textos se miden por puntos de código Unicode, siguiendo el modelo de cuentas
existente; no se eliminan ni truncan caracteres implícitamente.

### `SpaceType`

Unión cerrada de valores permitidos: `"cancha" | "sala" | "consultorio"`.

### `SpaceInput`

Datos proporcionados para crear o editar un espacio: `name`, `type`, `capacity` y
`description` opcional. No incluye `id` ni `active`; el servicio asigna el
identificador y los espacios nuevos empiezan activos. Los campos requeridos se
validan antes de cualquier escritura.

### `SpaceState` — documento persistido

Documento JSON único con versión de esquema y todos los espacios:

| Campo | Tipo | Regla |
|---|---|---|
| `schemaVersion` | `1` | Versión del formato de almacenamiento. |
| `spaces` | `Space[]` | Espacios activos e inactivos, validados al cargar. |

La clave de almacenamiento es `reservalocal.spaces.v1`. El documento se considera
entrada externa: se comprueban estructura, tipos, rangos, valores de tipo, ids
únicos, nombres únicos sin distinguir mayúsculas y coherencia de `active`. Campos
desconocidos o datos malformados producen un error tipado de almacenamiento
corrupto; no se aceptan como un catálogo vacío exitoso.

### `SpaceError`

Error de dominio con código y mensaje en español. Expresa validación, duplicidad,
ausencia, autorización, estado de autenticación, corrupción, almacenamiento y
coordinación. No incluye excepciones, datos de persistencia completos ni un éxito
ficticio.

## Invariantes

1. Los identificadores de espacios son únicos y no vacíos.
2. Los nombres se comparan normalizados a minúsculas para verificar unicidad,
   incluyendo espacios inactivos; editar un espacio excluye su propio id de la
   comprobación.
3. La normalización de unicidad no distingue mayúsculas; no se exige equivalencia de
   acentos ni se cambia el nombre presentado.
4. Nombre, tipo, capacidad y descripción cumplen sus límites antes de crear o
   actualizar el documento.
5. Una entrada no válida no modifica datos ni guarda actualizaciones parciales.
6. La creación genera un espacio activo; la desactivación cambia `active` a `false`
   sin borrar el espacio ni sus datos.
7. El catálogo y el detalle disponibles para consulta contienen solo espacios
   activos.
8. `existeYEstaActivo(id)` devuelve `Ok(true)` solo si el espacio existe y está
   activo; devuelve `Ok(false)` si no existe o está inactivo, y `Err` ante fallos de
   lectura o integridad.
9. Solo `admin` puede crear, editar o desactivar. La vista no sustituye la
   comprobación de permiso del servicio.
10. Las mutaciones leen el documento actual dentro del bloqueo, validan el estado
    resultante y devuelven éxito solo cuando la escritura se confirma.
11. Una reserva nueva no puede usar un espacio inactivo. La creación de reservas debe
    comprobar disponibilidad dentro de la coordinación compartida con la
    desactivación.
12. Las reservas existentes no se borran ni modifican al desactivar un espacio.

## Transiciones de estado

| Estado previo | Operación | Resultado |
|---|---|---|
| Espacio ausente, nombre válido y sesión admin | Crear | Nuevo espacio activo, si nombre e id son únicos y la escritura se confirma. |
| Nombre duplicado, sin distinguir mayúsculas | Crear o renombrar | Error de nombre duplicado; catálogo sin cambios. |
| Espacio existente | Editar con datos válidos | Se actualizan los campos editables; se conserva id y estado activo/inactivo. |
| Espacio activo | Desactivar | Se conserva el espacio con `active: false`; no se eliminan reservas. |
| Espacio inactivo | Consultar catálogo o detalle | No aparece como opción disponible. |
| Espacio activo | `existeYEstaActivo(id)` | `Ok(true)`. |
| Espacio inactivo o ausente | `existeYEstaActivo(id)` | `Ok(false)`. |
| Operación de gestión por usuario sin rol admin | Crear, editar o desactivar | `Err` de permiso en español; no hay mutación. |
| Documento corrupto o fallo de lectura | Inicializar o consultar | `Err` tipado y mensaje en español; nunca se presenta catálogo vacío como lectura exitosa. |
| Error de bloqueo o escritura | Mutación | `Err`; no se comunica la operación como exitosa. |

No se ofrece transición de reactivación ni borrado permanente en esta funcionalidad.
