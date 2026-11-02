import { describe, expect, it } from "vitest";
import {
  bloquesDelHorario,
  calcularHorasLibres,
  horasReservadas,
} from "../../../src/bookings/rules";
import { reserva } from "../../helpers/bookings";

const fecha = "2026-11-02";

describe("horas libres (RF-012)", () => {
  it("el horario tiene 14 bloques de 08:00 a 21:00", () => {
    const bloques = bloquesDelHorario();
    expect(bloques).toHaveLength(14);
    expect(bloques[0]).toBe("08:00");
    expect(bloques[13]).toBe("21:00");
  });

  it("un espacio sin reservas tiene los 14 bloques libres", () => {
    expect(calcularHorasLibres([], "sala-1", fecha)).toEqual(bloquesDelHorario());
  });

  it("una reserva de 10:00 a 12:00 ocupa los bloques de 10:00 y 11:00", () => {
    const bookings = [reserva({ id: "r1" })];
    expect(horasReservadas(bookings, "sala-1", fecha)).toEqual(["10:00", "11:00"]);
    const libres = calcularHorasLibres(bookings, "sala-1", fecha);
    expect(libres).toHaveLength(12);
    expect(libres).not.toContain("10:00");
    expect(libres).not.toContain("11:00");
    expect(libres).toContain("12:00");
  });

  it("una reserva cancelada no ocupa bloques (RF-010)", () => {
    const cancelada = reserva({ id: "r1", status: "cancelada", cancelledAt: "2026-11-01T09:00" });
    expect(calcularHorasLibres([cancelada], "sala-1", fecha)).toHaveLength(14);
  });

  it("las reservas de otra fecha u otro espacio no afectan", () => {
    const otras = [
      reserva({ id: "r1", spaceId: "cancha-1" }),
      reserva({ id: "r2", start: "2026-11-03T10:00", end: "2026-11-03T12:00" }),
    ];
    expect(calcularHorasLibres(otras, "sala-1", fecha)).toHaveLength(14);
  });

  it("un día completo reservado no deja horas libres", () => {
    const dia = [8, 11, 14, 17, 20].map((hora, index) =>
      reserva({
        id: `r${index}`,
        start: `${fecha}T${String(hora).padStart(2, "0")}:00`,
        end: `${fecha}T${String(Math.min(hora + 3, 22)).padStart(2, "0")}:00`,
      }),
    );
    expect(calcularHorasLibres(dia, "sala-1", fecha)).toEqual([]);
  });
});
