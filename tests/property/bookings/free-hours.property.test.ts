import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Booking } from "../../../src/bookings/model";
import {
  bloquesDelHorario,
  calcularHorasLibres,
  horasReservadas,
} from "../../../src/bookings/rules";
import { bookingShapeArb, espacios, fechas } from "./arbitraries";

describe("propiedad: horas libres + horas reservadas = horario (RF-012)", () => {
  it("son disjuntas y juntas forman los 14 bloques, para cualquier conjunto de reservas", () => {
    fc.assert(
      fc.property(
        fc.array(bookingShapeArb, { maxLength: 30 }),
        fc.constantFrom(...espacios),
        fc.constantFrom(...fechas),
        (shapes, spaceId, date) => {
          const bookings: Booking[] = shapes.map((shape, index) => ({ id: `r${index}`, ...shape }));
          const libres = calcularHorasLibres(bookings, spaceId, date);
          const reservadas = horasReservadas(bookings, spaceId, date);
          const union = new Set([...libres, ...reservadas]);

          expect(libres.filter((h) => reservadas.includes(h))).toEqual([]);
          expect(union.size).toBe(14);
          expect([...union].sort()).toEqual([...bloquesDelHorario()]);
          expect(libres.length + reservadas.length).toBe(14);
        },
      ),
      { numRuns: 100 },
    );
  });
});
