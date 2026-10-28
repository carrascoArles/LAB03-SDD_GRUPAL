# Plan de implementación: Cuentas y sesión

**Rama configurada**: `001-cuentas-sesion` (rama activa: `main`) | **Fecha**:
2026-10-28 | **Especificación**: [spec.md](./spec.md)

**Entrada**: Especificación de `specs/001-cuentas-sesion/spec.md` y requisitos técnicos
del usuario para TypeScript estricto, Vite, Web Crypto, almacenamiento local y pruebas.

## Resumen

Crear la base de autenticación local de ReservaLocal: registro, inicio y cierre de
sesión persistente, identificación del usuario actual y consulta de permisos. El
diseño separa el modelo público `User` de los registros privados con hash y sal,
valida cada dato cargado desde el almacenamiento y comunica fallos con `Result<T, E>`.
`main.ts` ensamblará los módulos y reservará un punto de conexión para funcionalidades
futuras. Las credenciales y sesiones permanecerán en el navegador; la documentación
advertirá que esta autenticación es didáctica, no un límite de seguridad.

## Contexto técnico

**Lenguaje/versión**: TypeScript en modo `strict`.

**Dependencias principales**: Vite, Vitest y fast-check; Web Crypto y Web Locks
provistos por el navegador.

**Almacenamiento**: `localStorage` detrás de `StoragePort` de `src/shared`, con
almacenamiento simulado para pruebas. La persistencia se concentra en una entrada de
estado de autenticación validada en tiempo de ejecución. Un `LockPort` basado en Web
Locks serializa las operaciones de lectura-modificación-escritura entre pestañas.

**Pruebas**: Vitest en niveles unitario, basado en propiedades e integración.
Cada requisito funcional tendrá pruebas unitarias, propiedades fast-check de al menos
100 ejecuciones e integración con `StoragePort` simulado. Se incluirá la ida y vuelta
de serialización sin pérdida de datos.

**Plataforma destino**: SPA para navegadores modernos en contexto seguro, como HTTPS
o localhost, con Web Crypto, Web Locks y `localStorage`.

**Tipo de proyecto**: Aplicación web de una sola página, sin framework de interfaz ni
backend.

**Objetivos de rendimiento**: El flujo de registro e inicio de sesión no depende de
servicios de red; el hash se calcula de forma asíncrona para no bloquear la interfaz.
La especificación no exige una latencia numérica para estas operaciones.

**Restricciones**: API pública desacoplada bajo `src/auth`; datos externos siempre
validados; operaciones de dominio expresadas con `Result<T, E>` sin excepciones;
mensajes para usuario en español; comentarios de requisito en cada función; no
almacenar contraseñas en texto plano; sal por cuenta y hash SHA-256 conforme al
requisito del usuario. Los errores de persistencia no deben presentarse como éxito.

**Alcance**: Registro con asignación del primer rol `admin`, autenticación,
persistencia de sesión, consulta de identidad/rol, recuperación de almacenamiento
corrupto, vista de auth y contratos para módulos dependientes. No incluye backend,
verificación de correo, restablecimiento de contraseña ni autenticación entre
dispositivos.

## Comprobación de la constitución

**Puerta inicial: APROBADA.**

- Arquitectura: módulos pequeños en `src/auth` y `src/shared`; la lógica de dominio
  queda separada del DOM y los efectos; `src/main.ts` ensambla dependencias.
- Errores y validación: contratos de dominio con `Result<T, E>`; validación en
  ejecución para formularios y persistencia; ninguna conversión de tipo sustituye la
  validación.
- Seguridad: Web Crypto calcula hash y sal; el modelo público no expone secretos; el
  login presenta un error genérico; la autenticación local se documenta como
  didáctica y no autoritativa.
- Pruebas: Vitest con pruebas unitarias, propiedades (mínimo 100 ejecuciones) e
  integración con almacenamiento simulado, incluidos datos corruptos y fallos de
  persistencia.
- Gobernanza: cualquier cambio posterior a un contrato ya publicado en `main` debe
  proponerse primero al grupo.
- Almacenamiento y localización: se usa `StoragePort`; Web Locks coordina las
  operaciones de escritura; los fallos no rompen el arranque y todo mensaje visible
  a personas usuarias está en español.

No se identifica ninguna excepción a la constitución; no se necesita justificación
de complejidad.

## Estructura del proyecto

### Documentación de esta funcionalidad

```text
specs/001-cuentas-sesion/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── auth.md
└── tasks.md
```

`tasks.md` corresponde a `/speckit-tasks`; no se genera en esta fase.

### Código fuente y pruebas

```text
src/
├── auth/
│   ├── model.ts
│   ├── validation.ts
│   ├── password.ts
│   ├── service.ts
│   ├── session.ts
│   └── view.ts
├── shared/
│   ├── result.ts
│   ├── storage-port.ts
│   ├── local-storage.ts
│   ├── lock-port.ts
│   └── web-lock.ts
└── main.ts

tests/
├── unit/
│   └── auth/
├── property/
│   └── auth/
└── integration/
    └── auth/
```

**Decisión de estructura**: SPA única organizada por funcionalidad. `src/auth` es
dueña del modelo y reglas de cuentas; `src/shared` ofrece tipos y adaptadores
reutilizables; `src/main.ts` compone los servicios, la vista y los puntos de
extensión. Las pruebas se agrupan por nivel para distinguir lógica pura, invariantes
generativas e interacción con persistencia. El registro calcula el hash antes de
entrar en el bloqueo exclusivo y, dentro del bloqueo, vuelve a leer las cuentas,
asigna el primer rol y confirma el cambio en `localStorage`. Las demás operaciones de
lectura-modificación-escritura usan el mismo bloqueo.

## Complejidad

No se agregan proyectos, servicios remotos ni capas sin necesidad. Los archivos
separados corresponden a responsabilidades exigidas por el usuario y a la separación
de lógica, DOM y efectos que establece la constitución.

## Puertas posteriores al diseño

**Puerta posterior al diseño: APROBADA.**

- Los artefactos de diseño describen entidades y contratos con validación y errores
  tipados.
- El almacenamiento se trata como entrada externa no confiable y su simulación hace
  comprobables los fallos.
- Web Locks serializa el registro y otras escrituras entre pestañas del mismo origen,
  permitiendo asignar el primer rol administrador de forma coherente. Si el navegador
  no ofrece Web Locks, las operaciones de escritura fallan explícitamente; no se
  continúa sin coordinación. Esta coordinación no protege contra la manipulación de
  datos locales ni equivale a autorización de servidor.
- SHA-256 con sal satisface el algoritmo solicitado, pero es una función rápida y no
  una derivación de contraseña diseñada para resistir ataques de fuerza bruta. Dado
  el alcance didáctico y el requisito explícito, se conserva esa decisión y se
  documenta la limitación; cualquier cambio a una derivación más resistente requiere
  modificar el contrato de credenciales antes de publicar la funcionalidad.
