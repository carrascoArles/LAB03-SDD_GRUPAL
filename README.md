# ReservaLocal

Aplicación web de una sola página para gestionar cuentas y, en futuras
funcionalidades, reservas de espacios de un local.

## Desarrollo

Requiere Node.js y npm. Desde la raíz del proyecto:

```sh
npm install
npm run dev
npm test
npm run build
```

La aplicación de cuentas usa `localStorage`, Web Crypto y Web Locks del navegador.
Está pensada para ejecutarse en localhost o en un origen HTTPS.

## Límite de seguridad

La autenticación y los roles almacenados localmente son didácticos: una persona que
controle el navegador puede inspeccionar o modificar el almacenamiento. Esto no
reemplaza la autenticación, autorización ni validación de un servidor y no debe
usarse como mecanismo de seguridad para operaciones sensibles.
