# Investigación: Catálogo de espacios

## Persistencia del estado de espacios

**Decisión**: Persistir un documento versionado que incluya todos los espacios,
activos e inactivos, mediante `StoragePort`, con la clave
`reservalocal.spaces.v1`.

**Justificación**: La especificación requiere conservar los espacios desactivados.
`StoragePort` y el adaptador `localStoragePort` ya aíslan efectos del navegador y
representan explícitamente errores de lectura y escritura. Validar el documento al
cargar evita confiar en datos externos no comprobados.

**Alternativas consideradas**: Una clave por espacio complica detectar nombres
duplicados y mantener una actualización coherente; no se necesita almacenamiento
remoto ni una base de datos porque el proyecto es una SPA sin backend.

## Cambios coherentes entre pestañas

**Decisión**: Usar el `LockPort` compartido para todas las operaciones de
lectura-modificación-escritura, con el nombre de bloqueo `reservalocal.spaces.v1`.
La creación de reservas debe comprobar la disponibilidad de espacios dentro de la
misma coordinación que emplea la desactivación.

**Justificación**: La unicidad de nombres debe seguir siendo válida ante
actualizaciones concurrentes. Coordinar las comprobaciones y escrituras evita
duplicados y permite ordenar una reserva concurrente con la desactivación.
`webLockPort` ya devuelve errores tipados cuando Web Locks no está disponible o falla.

**Alternativas consideradas**: Escribir sin bloqueo podría sobrescribir cambios de
otra pestaña o aceptar nombres duplicados. Añadir una biblioteca de base de datos
sería desproporcionado para el almacenamiento local actual.

## Tipado de errores y contratos de funcionalidad

**Decisión**: Reutilizar `Result<T, E>` para operaciones síncronas y
`Promise<Result<T, E>>` para escrituras coordinadas; publicar la API a través de
`src/spaces/index.ts` y documentarla en `contracts/spaces.md`.

**Justificación**: Coincide con la constitución y el contrato de cuentas existente,
permite expresar errores de validación, permisos y almacenamiento sin excepciones y
da a módulos dependientes un punto de integración estable.

**Alternativas consideradas**: Lanzar excepciones o devolver valores por defecto
ocultaría errores y contravendría el contrato compartido del proyecto.

## Pruebas basadas en propiedades

**Decisión**: Usar la versión existente de fast-check junto a Vitest, declarando
explícitamente `numRuns: 100` como mínimo para cada propiedad requerida.

**Justificación**: El proyecto ya cuenta con pruebas de propiedades que usan esta
convención. Propiedades separadas ejercitarán límites de nombres, límites enteros de
capacidad, unicidad insensible a mayúsculas e invariantes de datos inválidos.

**Alternativas consideradas**: Añadir otro framework generativo duplicaría
dependencias y no aportaría valor frente al patrón existente.

## Composición de la interfaz y autorización

**Decisión**: Inyectar `AuthService` y dependencias de persistencia al servicio de
espacios; mantener la vista DOM en `src/spaces/view.ts`. El servicio verifica el rol
administrador antes de cada mutación.

**Justificación**: La sesión y `isAdmin()` ya forman parte del contrato de cuentas.
Comprobar el permiso también en el dominio evita que ocultar controles en la vista
sea la única protección. La arquitectura de SPA preserva la separación de lógica y
DOM.

**Alternativas consideradas**: Consultar el DOM para inferir identidad o confiar
solo en ocultar botones acoplaría autorización e interfaz y permitiría eludir las
reglas desde otras llamadas del módulo.
