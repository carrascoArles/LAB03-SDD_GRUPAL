import { describe, expect, it } from "vitest";
import { mensajes } from "../../../src/bookings/model";
import { validarNoPasado, validarSolicitud } from "../../../src/bookings/validation";

const base = { spaceId: "sala-1", date: "2026-11-02", startTime: "10:00", durationHours: 2 };

// Devuelve el código de error o "OK".
function codigo(input: unknown): string {
  const result = validarSolicitud(input);
  return result.ok ? "OK" : result.error.code;
}

describe("validación de la solicitud de reserva (RF-004, RF-005)", () => {
  it("convierte una solicitud válida en una franja de inicio y fin", () => {
    expect(validarSolicitud(base)).toEqual({
      ok: true,
      value: { spaceId: "sala-1", start: "2026-11-02T10:00", end: "2026-11-02T12:00" },
    });
  });

  it("aplica el horario 08:00–22:00 en sus bordes", () => {
    expect(codigo({ ...base, startTime: "07:00", durationHours: 1 })).toBe("OUTSIDE_OPENING_HOURS");
    expect(codigo({ ...base, startTime: "08:00", durationHours: 1 })).toBe("OK");
    expect(codigo({ ...base, startTime: "21:00", durationHours: 1 })).toBe("OK");
    expect(codigo({ ...base, startTime: "21:00", durationHours: 2 })).toBe("OUTSIDE_OPENING_HOURS");
    expect(codigo({ ...base, startTime: "20:00", durationHours: 2 })).toBe("OK");
    expect(codigo({ ...base, startTime: "19:00", durationHours: 3 })).toBe("OK");
    expect(codigo({ ...base, startTime: "22:00", durationHours: 1 })).toBe("OUTSIDE_OPENING_HOURS");
  });

  it("acepta duraciones de 1 a 3 horas y rechaza 0, 4 y decimales", () => {
    expect(codigo({ ...base, durationHours: 1 })).toBe("OK");
    expect(codigo({ ...base, durationHours: 3 })).toBe("OK");
    expect(codigo({ ...base, durationHours: 0 })).toBe("INVALID_DURATION");
    expect(codigo({ ...base, durationHours: 4 })).toBe("INVALID_DURATION");
    expect(codigo({ ...base, durationHours: 1.5 })).toBe("INVALID_DURATION");
    expect(codigo({ ...base, durationHours: Number.NaN })).toBe("INVALID_DURATION");
    expect(codigo({ ...base, durationHours: "2" })).toBe("INVALID_DURATION");
  });

  it("exige horas en punto (bloques de una hora)", () => {
    expect(codigo({ ...base, startTime: "10:30" })).toBe("INVALID_START_TIME");
    expect(codigo({ ...base, startTime: "9:00" })).toBe("INVALID_START_TIME");
    expect(codigo({ ...base, startTime: "25:00" })).toBe("INVALID_START_TIME");
    expect(codigo({ ...base, startTime: "" })).toBe("INVALID_START_TIME");
  });

  it("rechaza fechas inexistentes y espacios vacíos", () => {
    expect(codigo({ ...base, date: "2026-02-30" })).toBe("INVALID_DATE");
    expect(codigo({ ...base, date: "" })).toBe("INVALID_DATE");
    expect(codigo({ ...base, spaceId: "  " })).toBe("INVALID_SPACE");
    expect(codigo(null)).toBe("INVALID_SPACE");
    expect(codigo([base])).toBe("INVALID_SPACE");
  });

  it("usa los mensajes en español del catálogo (RF-013)", () => {
    const result = validarSolicitud({ ...base, durationHours: 4 });
    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_DURATION", message: mensajes.INVALID_DURATION },
    });
    expect(mensajes.INVALID_DURATION).toBe("La duración debe ser de 1, 2 o 3 horas.");
  });
});

describe("no reservar en el pasado (RF-006)", () => {
  const franja = { spaceId: "sala-1", start: "2026-11-02T10:00", end: "2026-11-02T11:00" };

  it("acepta un inicio igual a la hora actual", () => {
    expect(validarNoPasado(franja, "2026-11-02T10:00").ok).toBe(true);
  });

  it("rechaza un inicio un minuto anterior a la hora actual", () => {
    expect(validarNoPasado(franja, "2026-11-02T10:01")).toEqual({
      ok: false,
      error: { code: "PAST_DATETIME", message: mensajes.PAST_DATETIME },
    });
  });

  it("rechaza fechas de días anteriores aunque la hora sea posterior", () => {
    expect(validarNoPasado(franja, "2026-11-03T08:00").ok).toBe(false);
  });
});
