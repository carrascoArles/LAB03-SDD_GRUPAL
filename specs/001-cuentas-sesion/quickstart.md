# Guía rápida de validación: Cuentas y sesión

Esta guía valida los flujos descritos en [spec.md](./spec.md), el modelo de
[data-model.md](./data-model.md) y el contrato [auth.md](./contracts/auth.md).
Instalar las dependencias con `npm install` antes de ejecutar la aplicación o las
pruebas.

## Requisitos previos

- Node.js y npm compatibles con la versión elegida para el proyecto.
- Un navegador moderno en un contexto seguro: HTTPS o localhost.
- Dependencias instaladas con `npm install`.

## Pruebas automatizadas

Desde la raíz del proyecto:

```text
npm test
npm run build
```

El comando debe ejecutar Vitest e incluir:

1. **Unitarias**: nombre de 1, 2, 50 y 51 caracteres; contraseña de 7, 8, 64 y 65
   caracteres; correo vacío o inválido; normalización y errores de dominio.
2. **Propiedades**: al menos 100 ejecuciones por propiedad para hash no igual a
   contraseña en texto plano, unicidad de correo sin distinguir mayúsculas, entradas
   inválidas que producen errores sin lanzar excepciones, ida y vuelta de
   serialización sin pérdida de datos e invariantes de registro y sesión. Guardar
   semilla y ruta si una propiedad falla.
3. **Integración**: usar almacenamiento y bloqueo simulados para registro, primer rol
   administrador, segundo rol usuario, login, logout, recarga, datos corruptos y
   errores de lectura/escritura.

Las propiedades del hash y del registro ejercitan Web Crypto para validar el
comportamiento real del adaptador; la suite mantiene el volumen acotado y Vitest
informa la semilla y ruta para reproducir una propiedad fallida.

## Validación manual en navegador

Iniciar la aplicación local:

```text
npm run dev
```

1. Borrar el almacenamiento del origen local y registrar una cuenta válida. Confirmar
   que el rol indicado para esa cuenta es `admin`.
2. Registrar una segunda cuenta con otro correo. Confirmar que su rol es `usuario`.
3. Probar nombres de 1 y 51 caracteres y contraseñas de 7 y 65 caracteres. Confirmar
   que no se crea ninguna cuenta y que los mensajes en español indican cómo corregir
   la entrada. Confirmar que los límites 2/50 y 8/64 se aceptan.
4. Intentar registrar el mismo correo con cambios de mayúsculas. Confirmar que se
   rechaza como duplicado.
5. Iniciar sesión con correo y contraseña correctos, recargar la página y confirmar
   que la sesión y el usuario actual se mantienen.
6. Probar un correo inexistente y una contraseña incorrecta. Confirmar que ambos
   intentos muestran el mismo mensaje genérico en español.
7. Cerrar sesión, recargar y confirmar que no se restaura la sesión.
8. Corromper el documento `reservalocal.auth.v1` en las herramientas de desarrollo y
   recargar. Confirmar que la aplicación arranca sin usuarios ni sesión y muestra un
   aviso en español.
9. Ejecutar `npm test` y confirmar que las pruebas de almacenamiento simulado
   fuerzan fallos de escritura (incluida la cuota agotada) y comprueban que se muestra
   un error sin anunciar éxito.
10. Comprobar el documento persistido: contiene sal y hash, pero no la contraseña
   original. Confirmar que la interfaz no muestra ni exporta el hash.
11. Abrir dos pestañas del mismo origen e intentar el primer registro desde ambas.
    Confirmar que el bloqueo exclusivo permite exactamente un rol `admin` y que la
    otra cuenta, si se registra, recibe `usuario`.

## Resultados esperados

- Las operaciones no válidas devuelven errores tipados y no generan excepciones de
  dominio.
- El login fallido no permite inferir mediante su mensaje si el correo está
  registrado.
- La sesión persiste entre recargas hasta cerrar sesión.
- Datos corruptos o fallos de almacenamiento no se presentan como autenticación o
  persistencia exitosa.
- La autenticación local se considera didáctica; no reemplaza controles de servidor.
