import "./admin.css";
import type { AuthService } from "../auth";
import type { Booking } from "../bookings";
import type { AdminService } from "./model";
import { mensajesAdmin } from "./model";

export interface AdminViewDependencies {
  readonly auth: AuthService;
  readonly admin: AdminService;
}

// Requisitos: RF-001, RF-007 y RF-008; montar una vista accesible sin confiar en ella como autorización.
export function mountAdminView(
  root: HTMLElement,
  dependencies: AdminViewDependencies,
): void {
  const section = document.createElement("section");
  section.className = "admin-bookings";
  section.setAttribute("aria-labelledby", "admin-bookings-title");

  const heading = document.createElement("h2");
  heading.id = "admin-bookings-title";
  heading.textContent = "Administración de reservas";

  const feedback = document.createElement("p");
  feedback.className = "admin-bookings__feedback";
  feedback.setAttribute("role", "status");
  feedback.setAttribute("aria-live", "polite");

  const list = document.createElement("ul");
  list.className = "admin-bookings__list";
  section.append(heading, feedback, list);
  root.append(section);

  function showBooking(booking: Booking): HTMLLIElement {
    const item = document.createElement("li");
    item.className = "admin-bookings__item";
    item.dataset.bookingId = booking.id;

    const detail = document.createElement("p");
    detail.textContent = `${booking.start.replace("T", " ")}–${booking.end.slice(11)} · Espacio ${booking.spaceId} · Usuario ${booking.userId}`;
    const status = document.createElement("span");
    status.className = `admin-bookings__status admin-bookings__status--${booking.status}`;
    status.textContent = booking.status === "activa" ? "Activa" : "Cancelada";
    item.append(detail, status);

    if (booking.status === "activa") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "admin-bookings__cancel";
      button.textContent = "Cancelar";
      button.setAttribute("aria-label", `Cancelar reserva ${booking.id}`);
      button.addEventListener("click", async () => {
        button.disabled = true;
        const result = await dependencies.admin.cancelarReserva(booking.id);
        if (!result.ok) {
          feedback.textContent = result.error.message;
          button.disabled = false;
          return;
        }
        render();
        feedback.textContent = "Reserva cancelada.";
      });
      item.append(button);
    }
    return item;
  }

  function render(): void {
    list.replaceChildren();
    const authorization = dependencies.auth.isAdmin();
    if (!authorization.ok) {
      feedback.textContent = mensajesAdmin.AUTH_STATE_UNAVAILABLE;
      return;
    }
    if (!authorization.value) {
      feedback.textContent = mensajesAdmin.PERMISSION_DENIED;
      return;
    }

    const result = dependencies.admin.listarReservas();
    if (!result.ok) {
      feedback.textContent = result.error.message;
      return;
    }
    feedback.textContent =
      result.value.length === 0 ? "No hay reservas." : "";
    for (const booking of result.value) list.append(showBooking(booking));
  }

  document.addEventListener("reservalocal:session-change", render);
  render();
}
