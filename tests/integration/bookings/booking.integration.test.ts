import { describe, expect, it } from "vitest";
import { createBookingService } from "../../../src/bookings/service";
import { createSpaceService } from "../../../src/spaces/service";
import { createSpaceAuth } from "../../helpers/spaces";
import {
  createFakeAuth,
  createFakeClock,
  MemoryBookingStorage,
  RecordingLock,
  storedBookings,
  usuario,
} from "../../helpers/bookings";

// Entorno con el catálogo real de 002 y reservas sobre el mismo almacenamiento.
async function entorno() {
  const storage = new MemoryBookingStorage();
  const lock = new RecordingLock();
  const admin = createSpaceService({ storage, lock, auth: createSpaceAuth("admin") });
  admin.initialize();
  const sala = await admin.createSpace({ name: "Sala Azul", type: "sala", capacity: 8 });
  const cancha = await admin.createSpace({ name: "Cancha Central", type: "cancha", capacity: 20 });
  if (!sala.ok || !cancha.ok) throw new Error("No se pudieron crear los espacios de prueba");

  const auth = createFakeAuth(usuario("ana"));
  const spaces = createSpaceService({ storage, lock, auth });
  spaces.initialize();
  const time = createFakeClock("2026-11-01T09:00");
  const service = createBookingService({ storage, lock, auth, spaces, clock: time.clock });
  service.initialize();
  lock.names.length = 0;
  return { storage, lock, admin, auth, service, time, salaId: sala.value.id, canchaId: cancha.value.id };
}

const pedido = (spaceId: string, startTime = "10:00", durationHours = 2) => ({
  spaceId,
  date: "2026-11-02",
  startTime,
  durationHours,
});

describe("integración de reservas con el catálogo real (RF-002, RF-003, RF-015, RF-016)", () => {
  it("reserva un espacio activo y guarda solo ids de usuario y espacio", async () => {
    const env = await entorno();
    const result = await env.service.reservar(pedido(env.salaId));
    expect(result.ok).toBe(true);
    const texto = storedBookings(env.storage) ?? "";
    expect(texto).toContain(env.salaId);
    expect(texto).toContain('"userId":"ana"');
    expect(texto).not.toContain("Sala Azul");
    expect(texto).not.toContain("ana@example.com");
    expect(env.lock.names).toEqual(["reservalocal.spaces.v1"]);
  });

  it("rechaza un espacio desactivado y conserva su reserva anterior", async () => {
    const env = await entorno();
    const previa = await env.service.reservar(pedido(env.salaId));
    await env.admin.deactivateSpace(env.salaId);
    const nueva = await env.service.reservar(pedido(env.salaId, "15:00", 1));
    expect(nueva.ok ? "" : nueva.error.code).toBe("SPACE_NOT_AVAILABLE");
    expect(env.service.listarMisReservas()).toEqual({ ok: true, value: [previa.ok ? previa.value : null] });
  });

  it("rechaza un espacio inexistente y una persona sin sesión", async () => {
    const env = await entorno();
    const inexistente = await env.service.reservar(pedido("no-existe"));
    expect(inexistente.ok ? "" : inexistente.error.code).toBe("SPACE_NOT_AVAILABLE");
    env.auth.current = null;
    const anonimo = await env.service.reservar(pedido(env.salaId));
    expect(anonimo.ok ? "" : anonimo.error.code).toBe("NOT_AUTHENTICATED");
    expect(storedBookings(env.storage)).toBeUndefined();
  });

  it("no informa éxito si falla la escritura de la reserva", async () => {
    const env = await entorno();
    env.storage.failWritesFor.add("reservalocal.bookings.v1");
    const result = await env.service.reservar(pedido(env.salaId));
    expect(result.ok ? "" : result.error.code).toBe("STORAGE_WRITE_FAILED");
    expect(storedBookings(env.storage)).toBeUndefined();
  });

  it("dos reservas simultáneas de la misma franja: solo una gana (T041)", async () => {
    const env = await entorno();
    const beto = createFakeAuth(usuario("beto"));
    const spacesBeto = createSpaceService({ storage: env.storage, lock: env.lock, auth: beto });
    spacesBeto.initialize();
    const otraPestana = createBookingService({
      storage: env.storage,
      lock: env.lock,
      auth: beto,
      spaces: spacesBeto,
      clock: env.time.clock,
    });
    const [a, b] = await Promise.all([
      env.service.reservar(pedido(env.salaId)),
      otraPestana.reservar(pedido(env.salaId, "11:00", 1)),
    ]);
    const codigos = [a, b].map((r) => (r.ok ? "OK" : r.error.code)).sort();
    expect(codigos).toEqual(["OK", "OVERLAP"]);
  });
});

describe("horas libres con el catálogo real (RF-012)", () => {
  it("refleja reservas y cancelaciones", async () => {
    const env = await entorno();
    expect(env.service.horasLibres(env.salaId, "2026-11-02")).toMatchObject({ ok: true, value: { length: 14 } });
    const r = await env.service.reservar(pedido(env.salaId));
    const conReserva = env.service.horasLibres(env.salaId, "2026-11-02");
    expect(conReserva.ok && conReserva.value).not.toContain("10:00");
    expect(conReserva.ok && conReserva.value.length).toBe(12);
    if (r.ok) await env.service.cancelar(r.value.id);
    expect(env.service.horasLibres(env.salaId, "2026-11-02")).toMatchObject({ ok: true, value: { length: 14 } });
  });

  it("rechaza espacios desactivados y fechas inválidas", async () => {
    const env = await entorno();
    await env.admin.deactivateSpace(env.canchaId);
    const inactivo = env.service.horasLibres(env.canchaId, "2026-11-02");
    expect(inactivo.ok ? "" : inactivo.error.code).toBe("SPACE_NOT_AVAILABLE");
    const fecha = env.service.horasLibres(env.salaId, "2026-02-30");
    expect(fecha.ok ? "" : fecha.error.code).toBe("INVALID_DATE");
  });
});
