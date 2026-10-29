// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { mountAdminView } from "../../../src/admin";
import { createAdminTestContext } from "../../helpers/admin";
import { reserva, seedBookings } from "../../helpers/bookings";

describe("vista de administración (jsdom)", () => {
  it("muestra la lista global solo al administrador y limpia datos al cambiar de sesión", () => {
    document.body.innerHTML = '<main id="root"></main>';
    const root = document.getElementById("root") as HTMLElement;
    const ctx = createAdminTestContext();
    seedBookings(ctx.storage, [
      reserva({ id: "ajena", userId: "beto" }),
    ]);
    mountAdminView(root, { auth: ctx.auth, admin: ctx.admin });

    expect(root.textContent).toContain("beto");
    expect(root.querySelector(".admin-bookings__item")).not.toBeNull();

    ctx.auth.current = {
      id: "usuario",
      name: "Usuario",
      email: "usuario@example.com",
      role: "usuario",
    };
    document.dispatchEvent(new Event("reservalocal:session-change"));

    expect(root.querySelector(".admin-bookings__item")).toBeNull();
    expect(root.textContent).toContain("No tienes permiso para administrar las reservas.");
    expect(ctx.storage.writes).toBe(0);
  });

  it("cancela desde el botón y presenta el resultado", async () => {
    document.body.innerHTML = '<main id="root"></main>';
    const root = document.getElementById("root") as HTMLElement;
    const ctx = createAdminTestContext();
    ctx.time.now = "2026-11-02T09:00";
    seedBookings(ctx.storage, [reserva({ id: "r1", userId: "beto" })]);
    mountAdminView(root, { auth: ctx.auth, admin: ctx.admin });

    (root.querySelector(".admin-bookings__cancel") as HTMLButtonElement).click();

    await expect.poll(() =>
      root.querySelector(".admin-bookings__item")?.textContent,
    ).toContain("Cancelada");
    expect(root.querySelector(".admin-bookings__feedback")?.textContent).toBe(
      "Reserva cancelada.",
    );
  });
});
