# Informe de análisis de la especificación: Reservas

Salida de `/speckit-analyze` sobre `spec.md`, `plan.md`, `tasks.md` y la constitución,
antes de implementar. El análisis es de solo lectura; las correcciones se aplicaron
después, en un paso aparte (ver «Remediación aplicada»).

## Hallazgos

| ID | Categoría | Severidad | Ubicación | Resumen | Recomendación |
|----|-----------|-----------|-----------|---------|---------------|
| C1 | Constitución | CRÍTICA | tasks.md (fases 3–6) | El principio IV exige pruebas unitarias, de propiedades y de integración para **cada** requisito. RF-001, RF-008, RF-011, RF-013, RF-014 y RF-015 no tienen ninguna propiedad fast-check, y RF-001 solo se prueba al reservar (no al listar, cancelar ni consultar horas libres). | Añadir una propiedad de aislamiento entre usuarios y sesión (RF-001, RF-008, RF-011, RF-015), una de recuperación ante cualquier texto corrupto (RF-014) y comprobar el mensaje en español en la propiedad de entradas inválidas (RF-013). |
| I1 | Inconsistencia | ALTA | spec.md RF-012; contracts/bookings.md; tasks.md T029 | El contrato y T029 dicen que `horasLibres` de un espacio inactivo o inexistente devuelve `SPACE_NOT_AVAILABLE`, pero la especificación no define ese caso. | Añadir la regla a RF-012 y un escenario de aceptación en la historia 3. |
| U1 | Subespecificación | ALTA | plan.md «Integración con 001 y 002»; tasks.md | El plan elige un bloqueo compartido para que dos pestañas no reserven la misma franja, pero ninguna tarea prueba dos reservas simultáneas: la propiedad T013 ejecuta las operaciones en secuencia. | Añadir una prueba de integración con dos `reservar` concurrentes sobre la misma franja: exactamente una debe tener éxito. |
| U2 | Subespecificación | MEDIA | spec.md Supuestos; plan.md «Vista» | Las reservas de un espacio desactivado «se siguen viendo», pero el contrato de 002 solo da nombres de espacios activos (`listActiveSpaces`, `getActiveSpace`) a un usuario normal. El plan dice que `listActiveSpaces()` da los nombres de la lista, lo que no cubre ese caso. | Mostrar «Espacio desactivado» cuando el espacio no está en la lista de activos y registrarlo como limitación del contrato de 002 para proponerla al grupo. |
| G1 | Cobertura | MEDIA | tasks.md T015, T020, T023 | RF-016 («un fallo al guardar no se comunica como éxito») solo se prueba en `reservar`; `cancelar` no tiene prueba de fallo de escritura ni de bloqueo. | Añadir el caso a T023. |
| G2 | Constitución | MEDIA | tasks.md T037 | La revisión de comentarios de requisito cubre `src/bookings/`, pero no las líneas nuevas de `src/main.ts` ni los helpers de prueba. Es el mismo hallazgo (C1) que tuvo la funcionalidad 001. | Ampliar T037 a `src/main.ts` y `tests/helpers/bookings.ts`. |
| G3 | Cobertura | BAJA | spec.md CE-005 | «Completar una reserva en menos de 1 minuto» no tiene ninguna tarea de verificación. | Añadir un paso cronometrado a `quickstart.md`. |
| T1 | Terminología | BAJA | contracts/bookings.md | Mezcla de nombres en inglés (`Booking`, `start`, `status`) y en español (`reservar`, `Franja`, `horasLibres`). | Mantener los tipos en inglés como en 001 y 002 y las operaciones en español como pide la guía del grupo; dejarlo escrito en el contrato. |

## Cobertura de requisitos

| Requisito | ¿Tiene tarea? | Tareas | Notas |
|-----------|---------------|--------|-------|
| RF-001 | Sí | T015 | Solo al reservar (C1). |
| RF-002 | Sí | T015, T018, T019 | |
| RF-003 | Sí | T015, T018 | |
| RF-004 | Sí | T011, T016 | |
| RF-005 | Sí | T011, T016 | |
| RF-006 | Sí | T011, T016 | |
| RF-007 | Sí | T012, T013, T017, T018, T022 | Sin prueba concurrente (U1). |
| RF-008 | Sí | T023, T025, T026 | Sin propiedad (C1). |
| RF-009 | Sí | T020, T021, T024, T025 | |
| RF-010 | Sí | T023 | |
| RF-011 | Sí | T020, T023 | Sin propiedad (C1). |
| RF-012 | Sí | T027–T032 | Caso de espacio inactivo fuera de la especificación (I1). |
| RF-013 | Sí | T011, T016 | Sin propiedad (C1). |
| RF-014 | Sí | T009, T010 | Sin propiedad (C1). |
| RF-015 | Sí | T015 | Sin propiedad (C1). |
| RF-016 | Sí | T014, T015 | Falta en `cancelar` (G1). |

## Alineación con la constitución

- C1 (principio IV, CRÍTICA) y G2 (flujo de desarrollo, MEDIA).

## Tareas sin requisito asociado

- Ninguna. T001–T002 (setup) y T033–T038 (pulido) son transversales.

## Métricas

- Requisitos funcionales: 16
- Tareas: 38
- Cobertura (requisitos con al menos una tarea): 100 %
- Ambigüedades: 0 (RF-013 se corrigió durante `/speckit-specify`)
- Duplicaciones: 0
- Problemas críticos: 1

## Siguientes acciones

Hay un problema CRÍTICO: resolver C1 antes de `/speckit-implement`. Conviene resolver
también I1 y U1. G1–G3 y T1 se pueden aplicar en la misma pasada.

## Remediación aplicada

Se aprobaron todas las recomendaciones y se aplicaron así:

- **C1**: nuevas tareas T039 (propiedad de aislamiento y sesión) y T040 (propiedad de
  recuperación); T014 ahora comprueba también el mensaje en español.
- **I1**: RF-012 y la historia 3 definen el caso de espacio inactivo o inexistente.
- **U1**: nueva tarea T041 con dos reservas concurrentes.
- **U2**: supuesto nuevo en spec.md, nota en plan.md y tarea T026 ajustada.
- **G1**: T023 incluye fallo de escritura y de bloqueo al cancelar.
- **G2**: T037 incluye `src/main.ts` y `tests/helpers/bookings.ts`.
- **G3**: paso cronometrado en `quickstart.md`.
- **T1**: nota de nombres en `contracts/bookings.md`.
