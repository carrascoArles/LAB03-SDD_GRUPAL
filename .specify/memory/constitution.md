<!--
Informe de impacto de sincronización
Cambio de versión: 1.0.1 -> 1.1.0 (excepción temporal de acceso entre funcionalidades)
Principios modificados: I. Arquitectura modular por funcionalidades; añade una
  excepción acotada para la funcionalidad 004.
Secciones añadidas: Ninguna.
Secciones eliminadas: Ninguna.
Pendientes: Confirmar la fecha original de ratificación. Retirar la excepción de
  004 cuando 003 publique los helpers autorizados en su contrato.
-->

# Constitución de ReservaLocal

## Principios fundamentales

### I. Arquitectura modular por funcionalidades
La aplicación DEBE ser una aplicación de una sola página, escrita en TypeScript con
modo estricto y construida con Vite, sin backend. El código fuente DEBE organizarse en
carpetas pequeñas y desacopladas por funcionalidad dentro de `src/`. La lógica de
dominio DEBE mantenerse pura y separada del DOM y de los efectos secundarios. Los
módulos DEBEN comunicarse únicamente mediante los contratos definidos en las
especificaciones de funcionalidades. Esta separación permite comprender y probar cada
funcionalidad de forma independiente.

Como excepción temporal y aprobada por el grupo, `src/admin` de la funcionalidad 004
PUEDE reutilizar directamente `leerReservas`, `guardarReservas`, `marcarCancelada`,
`puedeCancelar`, `reemplazarReserva` y `ordenarPorInicio` de `src/bookings`, sin
modificar archivos de la funcionalidad 003. `leerReservas` ya se exporta desde
`src/bookings/index.ts`; los demás helpers pueden importarse desde sus módulos
internos. La excepción se limita a esos helpers y a 004: no autoriza otros imports
internos ni cambios al contrato de 003. Se registra como deuda técnica porque 003 no
publica todos los helpers necesarios y su operación `cancelar()` solo permite
cancelar reservas de la persona propietaria. La excepción DEBE retirarse cuando 003
publique esos helpers en su contrato; entonces 004 DEBE depender solo de la interfaz
publicada.

### II. Resultados explícitos del dominio y validación
Las operaciones de dominio DEBEN informar éxito o error mediante `Result<T, E>` y NO
DEBEN lanzar excepciones. Todo valor recibido de un formulario o almacenamiento DEBE
validarse en tiempo de ejecución, incluidos su tipo, campos obligatorios y rangos
permitidos; un cast de tipos por sí solo NO DEBE considerarse validación. Los datos no
válidos DEBEN producir un error tipado, nunca una excepción ni una aceptación
implícita.

### III. Seguridad y control de acceso
Las contraseñas NUNCA DEBEN almacenarse en texto plano; la aplicación DEBE guardar un
hash calculado con Web Crypto. Los mensajes de inicio de sesión fallido NO DEBEN
revelar si existe una dirección de correo electrónico. Las operaciones de
administración DEBEN restringirse al rol `admin`. La documentación DEBE indicar que
la autenticación local tiene fines didácticos y no sustituye la autenticación ni la
autorización en un servidor.

### IV. Pruebas basadas en requisitos
Las pruebas con Vitest son obligatorias. Cada requisito funcional DEBE contar con
pruebas unitarias que incluyan casos límite, pruebas basadas en propiedades con
fast-check y un mínimo de 100 ejecuciones por propiedad, y pruebas de integración con
almacenamiento simulado. Las pruebas DEBEN incluir estas propiedades: nunca hay
reservas activas solapadas en un mismo espacio; las entradas no válidas siempre
devuelven errores y nunca lanzan excepciones; y la serialización seguida de la
deserialización conserva los datos.

### V. Almacenamiento local resiliente
Los datos DEBEN persistirse en `localStorage` mediante una interfaz de almacenamiento
que pueda simularse en las pruebas. Un `localStorage` lleno o corrupto DEBE manejarse
sin interrumpir la aplicación. Los mensajes dirigidos al usuario DEBEN estar en
español. Los errores de almacenamiento DEBEN representarse y comunicarse mediante el
manejo de errores de la aplicación, nunca tratarse silenciosamente como éxito.

## Restricciones de implementación

La aplicación DEBE acceder al almacenamiento local únicamente mediante la interfaz de
almacenamiento. Las lecturas y escrituras son entradas externas y efectos, por lo que
DEBEN cumplir los requisitos de validación y `Result<T, E>` anteriores. La
implementación NO DEBE incorporar un backend salvo que se modifique esta constitución.

## Flujo de desarrollo

Cada función DEBE incluir un comentario de código que identifique el requisito que
cubre. Los cambios DEBEN incluir la cobertura Vitest requerida para los requisitos
funcionales afectados. Todo cambio a un contrato de funcionalidad publicado en `main`
DEBE proponerse primero al grupo antes de implementarse.

## Gobernanza

Esta constitución rige la arquitectura, implementación, pruebas y revisión del
proyecto. Las modificaciones DEBEN proponerse al grupo junto con su justificación e
impacto antes de adoptarse. Los cambios a contratos de funcionalidades publicados
DEBEN seguir el proceso de propuesta descrito en «Flujo de desarrollo». Cada
modificación DEBE actualizar la versión y la fecha de última enmienda de este
documento.

El versionado DEBE seguir el versionado semántico: MAJOR para cambios incompatibles
en la gobernanza o los principios; MINOR para principios nuevos o requisitos
ampliados sustancialmente; y PATCH para aclaraciones y cambios de redacción sin efecto
semántico.

Las revisiones DEBEN comprobar el cumplimiento de esta constitución, incluida la
validación en tiempo de ejecución con tipos seguros, las reglas de control de acceso,
la cobertura de pruebas funcionales y la tolerancia a fallos del almacenamiento. Los
cambios que no cumplan estos requisitos DEBEN corregirse o resolverse explícitamente
mediante una enmienda constitucional antes de adoptarse.

**Versión**: 1.1.0 | **Ratificada**: TODO(FECHA_DE_RATIFICACIÓN): fecha original de adopción no registrada | **Última enmienda**: 2026-10-29
