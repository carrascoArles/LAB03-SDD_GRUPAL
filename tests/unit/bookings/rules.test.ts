import { describe, expect, it } from "vitest";
import {
  hayChoque,
  ordenarPorInicio,
  puedeCancelar,
  seSolapan,
} from "../../../src/bookings/rules";
import { reserva } from "../../helpers/bookings";

const existente = reserva({ id: "r1", start: "2026-11-02T10:00", end: "2026-11-02T12:00" });

// Franja de prueba en la sala del ejemplo.
function franja(start: string, end: string, spaceId = "sala-1") {
  return { spaceId, start: `2026-11-02T${start}`, end: `2026-11-02T${end}` };
}

describe("detección de choques (RF-007)", () => {
  it("una reserva adyacente no choca, ni antes ni después", () => {
    expect(hayChoque([existente], franja("12:00", "13:00"))).toBe(false);
    expect(hayChoque([existente], franja("08:00", "10:00"))).toBe(false);
  });

  it("un solapamiento parcial o total sí choca", () => {
    expect(hayChoque([existente], franja("11:00", "12:00"))).toBe(true);
    expect(hayChoque([existente], franja("09:00", "11:00"))).toBe(true);
    expect(hayChoque([existente], franja("09:00", "13:00"))).toBe(true);
    expect(hayChoque([existente], franja("10:00", "12:00"))).toBe(true);
  });

  it("el mismo horario en otro espacio u otra fecha no choca", () => {
    expect(hayChoque([existente], franja("10:00", "12:00", "cancha-1"))).toBe(false);
    expect(
      hayChoque([existente], { spaceId: "sala-1", start: "2026-11-03T10:00", end: "2026-11-03T12:00" }),
    ).toBe(false);
  });

  it("una reserva cancelada no choca (RF-010)", () => {
    const cancelada = { ...existente, status: "cancelada" as const, cancelledAt: "2026-11-01T09:00" };
    expect(hayChoque([cancelada], franja("10:00", "12:00"))).toBe(false);
  });

  it("seSolapan es simétrica", () => {
    const a = franja("10:00", "12:00");
    const b = franja("11:00", "14:00");
    expect(seSolapan(a, b)).toBe(seSolapan(b, a));
  });
});

describe("margen de cancelación (RF-009)", () => {
  it("se puede cancelar justo 1 hora antes", () => {
    expect(puedeCancelar(existente, "2026-11-02T09:00")).toBe(true);
  });

  it("no se puede cancelar 59 minutos antes", () => {
    expect(puedeCancelar(existente, "2026-11-02T09:01")).toBe(false);
  });

  it("el margen funciona a través de la medianoche", () => {
    const temprano = reserva({ id: "r2", start: "2026-11-02T08:00", end: "2026-11-02T09:00" });
    expect(puedeCancelar(temprano, "2026-11-01T23:59")).toBe(true);
  });
});

describe("orden de mis reservas (RF-008)", () => {
  it("ordena por inicio sin modificar la lista original", () => {
    const tarde = reserva({ id: "b", start: "2026-11-03T15:00", end: "2026-11-03T16:00" });
    const lista = [tarde, existente];
    expect(ordenarPorInicio(lista).map((r) => r.id)).toEqual(["r1", "b"]);
    expect(lista.map((r) => r.id)).toEqual(["b", "r1"]);
  });
});
