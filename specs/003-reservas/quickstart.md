# Guía rápida de validación: Reservas

Valida los flujos de [spec.md](./spec.md) con el modelo de
[data-model.md](./data-model.md) y el contrato de
[contracts/bookings.md](./contracts/bookings.md).

## Requisitos previos

- Node.js y npm; dependencias instaladas con `npm install`.
- Funcionalidades 001 (cuentas) y 002 (espacios) presentes en la rama.
- Navegador moderno en `localhost` (Web Locks y `localStorage`).

## Pruebas automatizadas

```text
npm test
npm run build
```

Deben pasar:

1. **Unitarias**: reserva adyacente aceptada; 07:00 rechazada; 21:00 con duración 2
   rechazada; 08:00 y fin a las 22:00 aceptadas; duración 0, 4 y 1,5 rechazadas;
   10:30 rechazada; 30 de febrero rechazado; cancelar con 60 minutos aceptado y con
   59 rechazado; inicio igual a la hora actual aceptado.
2. **Propiedades** (mínimo 100 ejecuciones): no solapamiento tras cualquier secuencia
   de reservas y cancelaciones; libres + reservadas = 14 bloques; cancelar dos veces
   equivale a una; entradas inválidas devuelven error sin lanzar; ida y vuelta de
   serialización.
3. **Integración**: servicio con `StoragePort` y `LockPort` simulados y el servicio
   real de espacios: reservar, listar solo lo propio, cancelar libera la franja,
   espacio desactivado rechaza reservas nuevas, datos corruptos con respaldo y vista
   en jsdom.

## Validación manual

```text
npm run dev
```

1. Registrar una cuenta (será `admin`) y otra cuenta `usuario`.
2. Con `admin`, crear dos espacios en el catálogo.
3. Con `usuario`, consultar horas libres de mañana: aparecen 14 bloques.
4. Reservar mañana de 10:00 a 12:00. Volver a consultar: faltan 10:00 y 11:00.
5. Intentar reservar el mismo espacio de 11:00 a 12:00: mensaje de horario ocupado.
6. Reservar de 12:00 a 13:00: se acepta (adyacente).
7. Intentar reservar a las 21:00 con duración 2: mensaje del horario de atención.
8. Cancelar la reserva de 10:00: pasa a cancelada y 10:00 y 11:00 vuelven a estar
   libres.
9. Cerrar sesión, entrar con `admin`: no ve las reservas de `usuario` en «Mis
   reservas».
10. Con `admin`, desactivar un espacio: no aparece en el selector y su reserva
    existente se conserva.
11. Cronometrar con una persona que no conoce la app: desde «Ver horas libres» hasta
    ver la reserva confirmada debe tardar menos de 1 minuto (CE-005).
12. En las herramientas del navegador, poner `reservalocal.bookings.v1` en `{roto` y
    recargar: aparece el aviso, la lista está vacía y existe
    `reservalocal.bookings.v1.respaldo` con el valor original.
