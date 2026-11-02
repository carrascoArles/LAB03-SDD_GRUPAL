import { describe, expect, it, vi } from "vitest";
import { ok } from "../../../src/shared/result";
import type { Space } from "../../../src/spaces";
import { mountBookingsView } from "../../../src/bookings/view";
import { createBookingTestContext } from "../../helpers/bookings";

const salas: readonly Space[] = [
  { id: "sala-1", name: "Sala Azul", type: "sala", capacity: 8, active: true },
  { id: "cancha-1", name: "Cancha Central", type: "cancha", capacity: 20, active: true },
];

// Montar la vista con dobles deterministas.
function montar(startupWarning?: string) {
  document.body.innerHTML = '<main id="main-content"></main>';
  const root = document.getElementById("main-content") as HTMLElement;
  const ctx = createBookingTestContext();
  mountBookingsView(root, {
    auth: ctx.auth,
    spaces: { listActiveSpaces: () => ok(salas) },
    bookings: ctx.service,
    clock: ctx.time.clock,
    ...(startupWarning ? { startupWarning } : {}),
  });
  return { root, ctx };
}

// Elegir un valor en un control del formulario.
function elegir(id: string, value: string): void {
  const control = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
  control.value = value;
}

describe("vista de reservas (jsdom)", () => {
  it("reserva desde el formulario, muestra la reserva y la cancela", async () => {
    const { root } = montar();
    elegir("booking-space", "sala-1");
    elegir("booking-date", "2026-11-02");
    elegir("booking-start", "10:00");
    elegir("booking-duration", "2");
    root.querySelector("form")?.dispatchEvent(new Event("submit", { cancelable: true }));

    await vi.waitFor(() => {
      expect(root.querySelector(".bookings-feedback")?.textContent).toContain("Reserva confirmada");
    });
    const item = root.querySelector(".booking-item");
    expect(item?.textContent).toContain("Sala Azul");
    expect(item?.textContent).toContain("10:00–12:00");
    expect(item?.textContent).toContain("Activa");

    (item?.querySelector("button") as HTMLButtonElement).click();
    await vi.waitFor(() => {
      expect(root.querySelector(".booking-item")?.textContent).toContain("Cancelada");
    });
  });

  it("muestra el mensaje en español si la reserva es inválida", async () => {
    const { root } = montar();
    elegir("booking-date", "2026-11-02");
    elegir("booking-start", "21:00");
    elegir("booking-duration", "2");
    root.querySelector("form")?.dispatchEvent(new Event("submit", { cancelable: true }));
    await vi.waitFor(() => {
      expect(root.querySelector(".bookings-feedback")?.textContent).toContain("El local atiende de 08:00 a 22:00");
    });
  });

  it("marca horas libres, ocupadas y pasadas", async () => {
    const { root, ctx } = montar();
    await ctx.service.reservar({ spaceId: "sala-1", date: "2026-11-01", startTime: "12:00", durationHours: 1 });
    elegir("booking-space", "sala-1");
    elegir("booking-date", "2026-11-01");
    const verHoras = [...root.querySelectorAll("button")].find((b) => b.textContent === "Ver horas libres");
    verHoras?.click();
    const chips = [...root.querySelectorAll(".hour-chip")].map((chip) => chip.textContent);
    expect(chips).toHaveLength(14);
    expect(chips).toContain("08:00 pasada");
    expect(chips).toContain("12:00 ocupada");
    expect(chips).toContain("13:00");
  });

  it("sin sesión pide iniciar sesión y muestra el aviso de arranque", () => {
    document.body.innerHTML = "";
    const { root, ctx } = montar("Los datos de reservas estaban dañados.");
    expect(root.querySelector(".bookings-feedback")?.textContent).toBe("Los datos de reservas estaban dañados.");
    ctx.auth.current = null;
    document.dispatchEvent(new Event("reservalocal:session-change"));
    expect((root.querySelector(".bookings-grid") as HTMLElement).hidden).toBe(true);
    expect((root.querySelector(".bookings-anonymous") as HTMLElement).hidden).toBe(false);
  });
});
