# Plan de implementación: Catálogo de espacios

**Rama configurada**: `002-catalogo-espacios` (rama activa:
`feature/002-catalogo-espacios`) | **Fecha**: 2026-10-29 | **Especificación**:
[spec.md](./spec.md)

**Entrada**: Especificación de `specs/002-catalogo-espacios/spec.md` y requisitos
técnicos del usuario para TypeScript estricto, Vite, almacenamiento local, dominio
separado de la vista, resultados tipados y pruebas con fast-check.

## Resumen

Agregar un módulo `src/spaces` para gestionar y consultar espacios activos. El
servicio validará entradas y datos persistidos, aplicará unicidad de nombre sin
distinguir mayúsculas, verificará permisos con la sesión existente y persistirá los
cambios mediante `StoragePort`. Las operaciones de dominio expondrán
`Result<T, E>`; las escrituras serán asíncronas porque usan el `LockPort` compartido
para serializar cambios. El contrato público ofrecerá `Space` y
`existeYEstaActivo()` para que la funcionalidad de reservas verifique que un espacio
siga disponible antes de aceptar una reserva. La vista permanecerá separada de las
reglas de dominio y de los efectos de almacenamiento.

## Contexto técnico

**Lenguaje/versión**: TypeScript, con `strict` activado en `tsconfig.json`.

**Dependencias principales**: Vite, Vitest y fast-check ya están declarados en el
proyecto; `StoragePort`, `Result<T, E>`, `LockPort` y `AuthService` son dependencias
internas existentes.

**Almacenamiento**: `localStorage` detrás de `src/shared/storage-port.ts`, inyectado
en el servicio; las pruebas usarán almacenamiento simulado. Un documento validado
con versión de esquema bajo `reservalocal.spaces.v1` contendrá tanto espacios activos
como desactivados. Las operaciones de escritura usarán `LockPort` y devolverán
errores si no se puede coordinar o persistir un cambio.

**Pruebas**: Vitest con pruebas unitarias, basadas en propiedades e integración con
almacenamiento simulado. Cada requisito funcional tendrá pruebas unitarias de casos
límite e integración cuando intervengan persistencia, permisos o flujo de vista.
fast-check ejecutará un mínimo de 100 casos por propiedad; incluirá longitudes de
nombre, valores de capacidad, unicidad sin distinguir mayúsculas y rechazo de
entradas inválidas sin excepciones. Se verificará la ida y vuelta de serialización.

**Plataforma destino**: SPA para navegadores modernos; `localStorage` y Web Locks se
usan mediante adaptadores compartidos.

**Tipo de proyecto**: Aplicación web de una sola página construida con Vite, sin
backend.

**Objetivos de rendimiento**: No hay un objetivo temporal especificado. La prueba de
aceptación existente verifica consulta de datos con un catálogo de 20 espacios.

**Restricciones**: API pública desacoplada bajo `src/spaces`; validación en tiempo de
ejecución para formularios y almacenamiento; lógica de dominio pura y separada del
DOM; operaciones de dominio con `Result<T, E>` (o `Promise<Result<T, E>>` cuando
requieren bloqueo); mensajes visibles en español; comentarios de requisito en cada
función. El servicio DEBE comprobar la autorización de escritura mediante
`AuthService.isAdmin()` y no depender únicamente de la vista. La autorización y el
almacenamiento locales son didácticos y no sustituyen controles de servidor. Ningún
fallo de persistencia o coordinación se presentará como éxito.

**Alcance**: Contrato, modelo, validación, persistencia, creación, edición,
desactivación, consulta de espacios activos y su detalle, integración de la vista y
verificación de disponibilidad para reservas nuevas. No incluye backend,
reactivación, borrado permanente ni modificación de reservas existentes.

## Comprobación de la constitución

**Puerta inicial: APROBADA.**

- **Arquitectura**: `src/spaces` separa modelo, validación, servicio y vista; la lógica
  de dominio no depende del DOM. `src/main.ts` compone los adaptadores y servicios.
- **Resultados y validación**: las operaciones públicas retornan `Result<T, E>` o
  `Promise<Result<T, E>>`; formularios y almacenamiento se validan en tiempo de
  ejecución y no se confía en casts.
- **Autorización**: mutaciones verifican el rol `admin` mediante el servicio de
  cuentas y sesión; los errores dirigidos a personas usuarias están en español. La
  documentación indica que los roles locales no constituyen una barrera de servidor.
- **Pruebas**: Vitest cubre requisitos y límites; fast-check usa al menos 100
  ejecuciones por propiedad; la integración inyecta almacenamiento simulado. Se
  comprueban corrupción, errores de lectura/escritura, unicidad y serialización.
- **Almacenamiento**: todas las lecturas y escrituras atraviesan `StoragePort`. Las
  mutaciones coordinadas fallan explícitamente cuando no se dispone de Web Locks; no
  escriben sin coordinación.
- **Gobernanza**: los cambios a contratos publicados deben proponerse al grupo antes
  de implementarse. Las funciones tendrán comentarios que indiquen los requisitos
  que cubren.

No se identifica ninguna excepción a la constitución ni se requiere complejidad
adicional.

## Estructura del proyecto

### Documentación de esta funcionalidad

```text
specs/002-catalogo-espacios/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── spaces.md
└── tasks.md
```

`tasks.md` corresponde a `/speckit-tasks`; no se genera en esta fase.

### Código fuente y pruebas

```text
src/
├── spaces/
│   ├── model.ts
│   ├── validation.ts
│   ├── state.ts
│   ├── service.ts
│   ├── view.ts
│   └── index.ts
├── auth/
│   └── ... (AuthService existente)
├── shared/
│   ├── result.ts
│   ├── storage-port.ts
│   ├── local-storage.ts
│   ├── lock-port.ts
│   └── web-lock.ts
└── main.ts

tests/
├── unit/
│   └── spaces/
├── property/
│   └── spaces/
├── integration/
│   └── spaces/
└── helpers/
    └── ... (almacenamiento y bloqueo simulados existentes)
```

**Decisión de estructura**: SPA única organizada por funcionalidades y siguiendo
`src/auth` y `src/shared`. `model.ts` contiene tipos y errores; `validation.ts`
valida datos externos; `state.ts` valida y serializa el documento persistido; y
`service.ts` implementa reglas, permisos y persistencia sin dependencias del DOM.
`view.ts` presenta el catálogo, detalle y gestión, y `index.ts` publica únicamente el
contrato soportado. `main.ts` inyecta `StoragePort`, `LockPort` y `AuthService`. Las
pruebas quedan separadas por nivel y pueden ejecutar la lógica sin navegador real.

Las operaciones que cambian el estado de espacios usan el bloqueo compartido
`reservalocal.spaces.v1`. El contrato publica `SpaceService.existeYEstaActivo(id)`.
El flujo de reservas, fuera de este módulo, debe consultar ese método dentro de la
misma operación exclusiva que persiste la reserva, usando el mismo bloqueo; así una
desactivación y una reserva concurrentes se serializan. Ese flujo también es
responsable de probar la regla de que no existan reservas activas solapadas para un
mismo espacio. La comprobación de rol es responsabilidad del servicio, no de la vista.

## Complejidad

No se agregan proyectos, dependencias, backend ni abstracciones nuevas. Los archivos
propuestos se limitan a separar responsabilidades establecidas por la constitución y
reutilizan los adaptadores, los tipos de resultado y el servicio de autenticación
existentes.

## Puertas posteriores al diseño

**Puerta posterior al diseño: APROBADA.**

- El modelo y el contrato definen las entradas, invariantes, resultados y errores en
  español; no quedan decisiones técnicas pendientes.
- El documento de almacenamiento se valida como entrada externa; las pruebas pueden
  simular almacenamiento ausente, corrupto, de solo lectura y lleno.
- El contrato publica `Space` y `existeYEstaActivo(id)`. Una reserva nueva debe
  comprobar el estado activo dentro de la coordinación compartida con la
  desactivación; los espacios inactivos y sus datos se conservan.
- Los permisos se evalúan en el servicio con `AuthService`; la restricción local se
  documenta como didáctica y no como autorización de servidor.
- Las propiedades de longitudes, capacidad y unicidad se prueban con un mínimo de
  100 ejecuciones cada una; las entradas inválidas deben producir errores y no
  excepciones.
- Cada RF de esta funcionalidad tendrá pruebas unitarias con límites, propiedades
  fast-check con al menos 100 ejecuciones por propiedad e integración con
  almacenamiento simulado, según la matriz de pruebas de `tasks.md`.
- La garantía de no solapamiento pertenece al modelo y servicio de reservas y deberá
  cubrirse con su propiedad fast-check cuando se especifique esa funcionalidad; el
  catálogo no crea ni modifica reservas.

La implementación queda dentro de los principios constitucionales, sin excepciones
que requieran justificar.
