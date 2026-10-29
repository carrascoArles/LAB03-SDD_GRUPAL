import { describe, expect, it } from "vitest";
import { decodeBookingState, serializeBookingState } from "../../../src/bookings/state";
import { reserva } from "../../helpers/bookings";

// Devuelve el código de error o "OK" al decodificar.
function codigo(value: unknown): string {
  const result = decodeBookingState(value);
  return result.ok ? "OK" : result.error.code;
}

const documento = (bookings: unknown[]) => JSON.stringify({ schemaVersion: 1, bookings });

describe("documento guardado de reservas (RF-014)", () => {
  it("acepta un documento vacío y uno con reservas activas y canceladas", () => {
    expect(codigo(documento([]))).toBe("OK");
    expect(
      codigo(
        documento([
          reserva({ id: "r1" }),
          reserva({ id: "r2", status: "cancelada", cancelledAt: "2026-11-01T09:00" }),
        ]),
      ),
    ).toBe("OK");
  });

  it("marca como corrupto el JSON roto y las formas inesperadas", () => {
    expect(codigo("{roto")).toBe("CORRUPT_STORAGE");
    expect(codigo("[]")).toBe("CORRUPT_STORAGE");
    expect(codigo(JSON.stringify({ schemaVersion: 2, bookings: [] }))).toBe("CORRUPT_STORAGE");
    expect(codigo(JSON.stringify({ schemaVersion: 1, bookings: [], extra: 1 }))).toBe("CORRUPT_STORAGE");
  });

  it("rechaza reservas con campos desconocidos o copias de datos (RF-015)", () => {
    expect(codigo(documento([{ ...reserva({ id: "r1" }), userName: "Ana" }]))).toBe("CORRUPT_STORAGE");
  });

  it("rechaza ids repetidos y estados inválidos", () => {
    expect(codigo(documento([reserva({ id: "r1" }), reserva({ id: "r1", spaceId: "cancha-1" })]))).toBe(
      "CORRUPT_STORAGE",
    );
    expect(codigo(documento([{ ...reserva({ id: "r1" }), status: "pendiente" }]))).toBe("CORRUPT_STORAGE");
  });

  it("rechaza franjas fuera del horario o con duración inválida", () => {
    expect(codigo(documento([reserva({ id: "r1", start: "2026-11-02T07:00", end: "2026-11-02T08:00" })]))).toBe(
      "CORRUPT_STORAGE",
    );
    expect(codigo(documento([reserva({ id: "r1", start: "2026-11-02T10:00", end: "2026-11-02T14:00" })]))).toBe(
      "CORRUPT_STORAGE",
    );
    expect(codigo(documento([reserva({ id: "r1", start: "2026-11-02T10:30", end: "2026-11-02T11:30" })]))).toBe(
      "CORRUPT_STORAGE",
    );
  });

  it("exige cancelledAt solo en reservas canceladas", () => {
    expect(codigo(documento([reserva({ id: "r1", cancelledAt: "2026-11-01T09:00" })]))).toBe("CORRUPT_STORAGE");
    expect(codigo(documento([reserva({ id: "r1", status: "cancelada" })]))).toBe("CORRUPT_STORAGE");
  });

  it("rechaza dos reservas activas solapadas en el mismo espacio", () => {
    expect(
      codigo(
        documento([
          reserva({ id: "r1" }),
          reserva({ id: "r2", start: "2026-11-02T11:00", end: "2026-11-02T12:00" }),
        ]),
      ),
    ).toBe("CORRUPT_STORAGE");
  });

  it("serializa solo los campos del modelo y conserva los datos", () => {
    const bookings = [reserva({ id: "r1" })];
    const texto = serializeBookingState({ schemaVersion: 1, bookings });
    expect(decodeBookingState(texto)).toEqual({ ok: true, value: { schemaVersion: 1, bookings } });
    expect(texto).not.toContain("cancelledAt");
  });
});
