# Guía rápida de validación: Administración de reservas

Valida los flujos de [spec.md](./spec.md), el diseño de [plan.md](./plan.md), el
modelo de [data-model.md](./data-model.md) y el contrato de
[contracts/admin.md](./contracts/admin.md).

## Estado de gobernanza

La constitución v1.1.0 autoriza temporalmente a 004 a importar los seis helpers
internos enumerados en su principio I. La excepción es deuda técnica y no permite
cambiar `src/bookings`; se retira cuando 003 publique esos helpers en su contrato.

## Requisitos previos

- Node.js y npm; dependencias instaladas con `npm install`.
- Funcionalidades 001 y 003 disponibles en el workspace.
- Para recorrido manual: navegador moderno y almacenamiento local del origen.

## Validación automatizada

```text
npm test
npm run build
```

La validación de 004 debe incluir:

1. **Unitarias**: la lista devuelve activas y canceladas de diferentes usuarios y
   está ordenada; un usuario normal y una sesión no verificable no reciben datos;
   una reserva inexistente falla; se acepta cancelar con exactamente 60 minutos,
   se rechaza con 59 y una cancelación repetida no vuelve a escribir ni depende de
   que el reloj esté disponible.
2. **Propiedades**: cada propiedad usa al menos 100 ejecuciones. Verificar que la
   lista administrativa contiene todos los elementos y está ordenada; que todo rol
   no administrador recibe error sin datos; que cancelar una reserva cancelada es
   idempotente; y que el límite temporal coincide con `puedeCancelar`.
3. **Integración**: servicio administrativo con `StoragePort` y `LockPort`
   simulados y `AuthService` configurado para admin y usuario normal. Confirmar que
   admin cancela una reserva ajena y actualiza el documento que lee 003; que
   usuarios normales no listan ni cancelan; y que un fallo de lectura, bloqueo o
   escritura nunca se presenta como éxito.
4. **Vista**: jsdom comprueba que la sección está disponible para admin, se oculta
   o queda inaccesible al cambiar a un usuario normal, los errores se muestran en
   español y las acciones actualizan la lista.

## Validación manual

```text
npm run dev
```

1. Registrar las cuentas de prueba necesarias; la primera cuenta tiene rol
   `admin`, las siguientes son usuarios normales.
2. Como usuario normal, crear reservas futuras de más de una hora de antelación.
3. Iniciar sesión como admin y comprobar que la sección de administración incluye
   reservas activas y canceladas de todos los usuarios en orden de inicio.
4. Cancelar una reserva ajena que empieza en exactamente 60 minutos: debe
   confirmarse y desaparecer como activa.
5. Intentar cancelar otra reserva con 59 minutos de antelación: debe mostrarse el
   error de margen y la reserva debe quedar intacta.
6. Volver a cancelar una reserva ya cancelada: debe confirmarse sin error ni
   cambios en `cancelledAt`.
7. Iniciar sesión como usuario normal: la sección global no debe mostrar reservas;
   invocar las operaciones administrativas debe mostrar el error de permiso en
   español y no debe modificar el almacenamiento.

## Resultado esperado

La suite Vitest y la compilación TypeScript/Vite terminan correctamente. Todas las
propiedades ejecutan como mínimo 100 casos y la prueba manual confirma autorización,
visibilidad global ordenada, margen temporal e idempotencia.

## Verificación de esta implementación

- `npm test`: 57 archivos y 218 pruebas pasaron; todas las propiedades de 004
  ejecutan al menos 100 casos.
- `npm run build`: TypeScript y Vite completaron correctamente.
- El recorrido manual del navegador descrito arriba todavía no se ha ejecutado.
