import { describe, expect, it } from "vitest";
import {
  aMinutos,
  componerFechaHora,
  esFechaHoraValida,
  esFechaValida,
  formatearFechaHoraLocal,
  leerReloj,
} from "../../../src/bookings/time";

describe("fechas locales (time.ts)", () => {
  it("acepta el 29 de febrero solo en años bisiestos", () => {
    expect(esFechaValida("2028-02-29")).toBe(true);
    expect(esFechaValida("2026-02-29")).toBe(false);
    expect(esFechaValida("2000-02-29")).toBe(true);
    expect(esFechaValida("1900-02-29")).toBe(false);
  });

  it("rechaza fechas inexistentes o con formato distinto", () => {
    expect(esFechaValida("2026-02-30")).toBe(false);
    expect(esFechaValida("2026-13-01")).toBe(false);
    expect(esFechaValida("2026-04-31")).toBe(false);
    expect(esFechaValida("2026-4-01")).toBe(false);
    expect(esFechaValida("02/11/2026")).toBe(false);
    expect(esFechaValida(20261102)).toBe(false);
  });

  it("valida horas 00–23 y minutos 00–59", () => {
    expect(esFechaHoraValida("2026-11-02T00:00")).toBe(true);
    expect(esFechaHoraValida("2026-11-02T23:59")).toBe(true);
    expect(esFechaHoraValida("2026-11-02T24:00")).toBe(false);
    expect(esFechaHoraValida("2026-11-02T10:60")).toBe(false);
    expect(esFechaHoraValida("2026-11-02T10:00Z")).toBe(false);
    expect(esFechaHoraValida("2026-02-30T10:00")).toBe(false);
  });

  it("calcula diferencias en minutos entre días y meses sin zona horaria", () => {
    expect(aMinutos("2026-11-02T10:00") - aMinutos("2026-11-02T09:00")).toBe(60);
    expect(aMinutos("2026-11-01T00:00") - aMinutos("2026-10-31T23:00")).toBe(60);
    expect(aMinutos("2027-01-01T08:00") - aMinutos("2026-12-31T08:00")).toBe(1440);
  });

  it("compone inicios de bloque con hora de dos dígitos", () => {
    expect(componerFechaHora("2026-11-02", 8)).toBe("2026-11-02T08:00");
    expect(componerFechaHora("2026-11-02", 22)).toBe("2026-11-02T22:00");
  });

  it("formatea un Date con la hora local", () => {
    expect(formatearFechaHoraLocal(new Date(2026, 10, 2, 7, 5))).toBe("2026-11-02T07:05");
  });

  it("devuelve error, sin lanzar, si el reloj falla o da un formato inválido", () => {
    expect(leerReloj(() => "2026-11-02T07:05")).toEqual({ ok: true, value: "2026-11-02T07:05" });
    expect(leerReloj(() => "ayer").ok).toBe(false);
    const roto = leerReloj(() => {
      throw new Error("sin reloj");
    });
    expect(roto).toEqual({
      ok: false,
      error: { code: "CLOCK_UNAVAILABLE", message: "No se pudo leer la hora actual del dispositivo." },
    });
  });
});
