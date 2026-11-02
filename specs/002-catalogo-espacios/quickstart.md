# Guía rápida de validación: Catálogo de espacios

Esta guía valida los flujos de [spec.md](./spec.md), el modelo de
[data-model.md](./data-model.md) y el contrato de [spaces.md](./contracts/spaces.md).
La implementación reutiliza las dependencias del proyecto.

## Requisitos previos

- Node.js y npm compatibles con la versión del proyecto.
- Dependencias instaladas con `npm install`.
- Navegador moderno con `localStorage` y Web Locks en HTTPS o localhost para probar
  la coordinación entre pestañas.

## Pruebas automatizadas

Desde la raíz del proyecto:

```text
npm test
npm run build
```

La validación debe incluir:

1. **Unitarias**: nombres de 2, 3, 50 y 51 caracteres; capacidades 0, 1, 100, 101 y
   decimales; tipo fuera del conjunto permitido; descripción de 200 y 201 caracteres;
   unicidad insensible a mayúsculas y edición conservando el propio nombre.
2. **Propiedades**: mínimo 100 ejecuciones por propiedad para aceptar o rechazar
   longitudes de nombre, validar enteros de capacidad, rechazar nombres duplicados
   aunque cambien mayúsculas, rechazar entradas inválidas sin lanzar y conservar el
   estado al serializar y deserializar.
3. **Integración**: `StoragePort` y `LockPort` simulados para inicialización, alta,
   edición, desactivación, consulta activa, permisos, almacenamiento corrupto,
   errores de lectura/escritura y operaciones sin sesión.
4. **Build**: comprobación de tipos estricta y compilación de producción.

Conservar la semilla y ruta que Vitest informe si una propiedad falla para
reproducirla.

## Validación manual en navegador

Iniciar la aplicación:

```text
npm run dev
```

1. Iniciar sesión con una cuenta `admin` y crear una cancha con nombre válido,
   capacidad 1 y descripción vacía. Confirmar que queda activa en el catálogo.
2. Crear una sala y un consultorio; intentar crear nombres que solo difieran en
   mayúsculas y confirmar que el duplicado se rechaza.
3. Probar límites de nombre de 2, 3, 50 y 51 caracteres, capacidad 0, 1, 100 y 101,
   y descripción de 200 y 201 caracteres. Confirmar errores en español y ausencia de
   cambios ante entradas inválidas.
4. Editar el nombre de un espacio conservando su propio nombre y después intentar
   asignar a otro espacio un nombre equivalente sin distinguir mayúsculas.
5. Iniciar sesión con una cuenta `usuario` e intentar crear, editar y desactivar un
   espacio. Confirmar el mensaje «No tienes permiso para gestionar espacios» y que
   los datos no cambian.
6. Desde una sesión iniciada, consultar el catálogo y el detalle. Confirmar que se
   muestran todos los campos previstos para espacios activos, sin incluir
   desactivados.
7. Desactivar un espacio con una reserva existente y confirmar que el espacio y la
   reserva histórica se conservan, pero que no se ofrecen reservas nuevas.
8. Consultar el catálogo y el detalle sin sesión. Confirmar que la aplicación indica
   en español que es necesario iniciar sesión.
9. Corromper el documento `reservalocal.spaces.v1` y recargar. Confirmar que no se
   presenta el documento corrupto como un catálogo vacío exitoso y se notifica el
   error en español.
10. Simular almacenamiento lleno, no disponible o de solo lectura. Confirmar que la
    interfaz muestra el error y no anuncia éxito.
11. Con dos pestañas del mismo origen, coordinar una reserva con la desactivación.
    Confirmar que comparten `reservalocal.spaces.v1` y que una reserva nueva no se
    confirma una vez desactivado el espacio.

## Resultados esperados

- Los resultados de dominio son `Result` tipados; los errores no se convierten en
  excepciones ni en éxitos por defecto.
- El nombre es único sin distinguir mayúsculas y los límites de nombre y capacidad
  se cumplen en todas las entradas generadas por las propiedades.
- Solo `admin` puede gestionar espacios; un usuario normal recibe el error de
  permiso en español.
- Las consultas exponen exclusivamente espacios activos y una reserva nueva no
  puede usar un espacio desactivado.
- La desactivación conserva los datos y las reservas existentes.
- Ninguna operación de persistencia fallida se presenta como exitosa.
