import "./bookings.css";
import type { AuthService } from "../auth";
import type { Space, SpaceService } from "../spaces";
import { DURACION_MAXIMA, DURACION_MINIMA } from "./model";
import type { Booking, BookingService, Clock } from "./model";
import { bloquesDelHorario } from "./rules";
import { fechaDe, horaDe, leerReloj } from "./time";

export interface BookingsViewDependencies {
  readonly auth: AuthService;
  readonly spaces: Pick<SpaceService, "listActiveSpaces">;
  readonly bookings: BookingService;
  readonly clock: Clock;
  readonly startupWarning?: string;
}

// Requisito: RF-002; crear una etiqueta asociada a un control.
function createLabel(document: Document, htmlFor: string, text: string): HTMLLabelElement {
  const label = document.createElement("label");
  label.htmlFor = htmlFor;
  label.textContent = text;
  return label;
}

// Requisito: RF-002; crear un selector con opciones fijas.
function createSelect(
  document: Document,
  id: string,
  options: readonly { readonly value: string; readonly label: string }[],
): HTMLSelectElement {
  const select = document.createElement("select");
  select.id = id;
  select.name = id;
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    select.append(element);
  }
  return select;
}

// Requisito: RF-008; texto legible de una franja.
function describirFranja(booking: Booking): string {
  return `${fechaDe(booking.start)} · ${booking.start.slice(11)}–${booking.end.slice(11)}`;
}

// Requisitos: RF-001–RF-014; montar la sección de reservas en la página principal.
export function mountBookingsView(
  root: HTMLElement,
  dependencies: BookingsViewDependencies,
): void {
  const { auth, spaces, bookings, clock } = dependencies;
  const document = root.ownerDocument;

  const section = document.createElement("section");
  section.className = "card bookings-section";
  section.setAttribute("aria-labelledby", "bookings-title");
  const heading = document.createElement("h2");
  heading.id = "bookings-title";
  heading.textContent = "Reservas";
  const feedback = document.createElement("p");
  feedback.className = "alert bookings-feedback";
  feedback.setAttribute("aria-live", "polite");
  feedback.hidden = true;
  const anonymous = document.createElement("p");
  anonymous.className = "bookings-anonymous";
  anonymous.textContent = "Inicia sesión para reservar espacios y ver tus reservas.";

  const grid = document.createElement("div");
  grid.className = "bookings-grid";

  const form = document.createElement("form");
  form.className = "form-stack bookings-form";
  form.noValidate = true;
  const formTitle = document.createElement("h3");
  formTitle.textContent = "Nueva reserva";
  const spaceSelect = createSelect(document, "booking-space", []);
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.id = "booking-date";
  dateInput.name = "booking-date";
  const startSelect = createSelect(
    document,
    "booking-start",
    bloquesDelHorario().map((bloque) => ({ value: bloque, label: bloque })),
  );
  const durationOptions: { value: string; label: string }[] = [];
  for (let horas = DURACION_MINIMA; horas <= DURACION_MAXIMA; horas += 1) {
    durationOptions.push({
      value: String(horas),
      label: horas === 1 ? "1 hora" : `${horas} horas`,
    });
  }
  const durationSelect = createSelect(document, "booking-duration", durationOptions);
  const actions = document.createElement("div");
  actions.className = "bookings-actions";
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "btn btn-primary";
  submit.textContent = "Reservar";
  const freeHoursButton = document.createElement("button");
  freeHoursButton.type = "button";
  freeHoursButton.className = "btn btn-secondary";
  freeHoursButton.textContent = "Ver horas libres";
  actions.append(submit, freeHoursButton);
  const freeHours = document.createElement("div");
  freeHours.className = "free-hours";
  freeHours.setAttribute("aria-live", "polite");
  form.append(
    formTitle,
    createLabel(document, "booking-space", "Espacio"),
    spaceSelect,
    createLabel(document, "booking-date", "Fecha"),
    dateInput,
    createLabel(document, "booking-start", "Hora de inicio"),
    startSelect,
    createLabel(document, "booking-duration", "Duración"),
    durationSelect,
    actions,
    freeHours,
  );

  const mine = document.createElement("div");
  mine.className = "my-bookings";
  const mineTitle = document.createElement("h3");
  mineTitle.textContent = "Mis reservas";
  const list = document.createElement("ul");
  list.className = "bookings-list";
  mine.append(mineTitle, list);

  grid.append(form, mine);
  section.append(heading, feedback, anonymous, grid);
  root.append(section);

  let spaceNames = new Map<string, string>();
  let freeHoursVisible = false;

  // Requisito: RF-013; mostrar mensajes en español de forma accesible.
  function showFeedback(message: string, isError = false): void {
    feedback.textContent = message;
    feedback.hidden = message.length === 0;
    feedback.classList.toggle("alert-error", isError);
    feedback.classList.toggle("alert-success", !isError && message.length > 0);
    feedback.setAttribute("role", isError ? "alert" : "status");
  }

  // Requisito: RF-003; ofrecer solo espacios activos y conservar la selección.
  function refreshSpaces(): void {
    const result = spaces.listActiveSpaces();
    const active: readonly Space[] = result.ok ? result.value : [];
    const selected = spaceSelect.value;
    spaceNames = new Map(active.map((space) => [space.id, space.name]));
    spaceSelect.replaceChildren();
    if (active.length === 0) {
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "No hay espacios activos";
      spaceSelect.append(empty);
    }
    for (const space of active) {
      const option = document.createElement("option");
      option.value = space.id;
      option.textContent = `${space.name} (${space.type})`;
      spaceSelect.append(option);
    }
    if (spaceNames.has(selected)) spaceSelect.value = selected;
  }

  // Requisitos: RF-008–RF-011; dibujar solo las reservas de la sesión.
  function renderList(): void {
    list.replaceChildren();
    const result = bookings.listarMisReservas();
    if (!result.ok) {
      showFeedback(result.error.message, true);
      return;
    }
    if (result.value.length === 0) {
      const empty = document.createElement("li");
      empty.className = "bookings-empty";
      empty.textContent = "Todavía no tienes reservas.";
      list.append(empty);
      return;
    }
    for (const booking of result.value) {
      const item = document.createElement("li");
      item.className = `booking-item booking-${booking.status}`;
      item.dataset.bookingId = booking.id;
      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = spaceNames.get(booking.spaceId) ?? "Espacio desactivado";
      const when = document.createElement("span");
      when.textContent = describirFranja(booking);
      const status = document.createElement("span");
      status.className = "booking-status";
      status.textContent = booking.status === "activa" ? "Activa" : "Cancelada";
      info.append(name, when, status);
      item.append(info);
      if (booking.status === "activa") {
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "btn btn-secondary";
        cancel.textContent = "Cancelar";
        cancel.addEventListener("click", () => {
          void handleCancel(booking.id);
        });
        item.append(cancel);
      }
      list.append(item);
    }
  }

  // Requisito: RF-012; mostrar los 14 bloques marcando libres, ocupados y pasados.
  function renderFreeHours(): void {
    freeHours.replaceChildren();
    const result = bookings.horasLibres(spaceSelect.value, dateInput.value);
    if (!result.ok) {
      showFeedback(result.error.message, true);
      return;
    }
    const libres = new Set(result.value);
    const ahora = leerReloj(clock);
    const title = document.createElement("p");
    title.className = "free-hours-title";
    title.textContent = `Horas libres el ${dateInput.value}:`;
    const chips = document.createElement("div");
    chips.className = "free-hours-grid";
    for (const bloque of bloquesDelHorario()) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "hour-chip";
      const pasada =
        ahora.ok &&
        fechaDe(ahora.value) === dateInput.value &&
        Number(bloque.slice(0, 2)) < horaDe(ahora.value);
      if (!libres.has(bloque)) {
        chip.textContent = `${bloque} ocupada`;
        chip.classList.add("hour-busy");
        chip.disabled = true;
      } else if (pasada) {
        chip.textContent = `${bloque} pasada`;
        chip.classList.add("hour-past");
        chip.disabled = true;
      } else {
        chip.textContent = bloque;
        chip.classList.add("hour-free");
        chip.addEventListener("click", () => {
          startSelect.value = bloque;
          startSelect.focus();
        });
      }
      chips.append(chip);
    }
    freeHours.append(title, chips);
  }

  // Requisito: RF-001; mostrar la sección según la sesión actual.
  function render(): void {
    const current = auth.getCurrentUser();
    const loggedIn = current.ok && current.value !== null;
    anonymous.hidden = loggedIn;
    grid.hidden = !loggedIn;
    freeHours.replaceChildren();
    freeHoursVisible = false;
    if (!loggedIn) return;
    refreshSpaces();
    renderList();
  }

  // Requisitos: RF-002–RF-007 y RF-013; enviar la reserva al servicio.
  async function handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    showFeedback("");
    const result = await bookings.reservar({
      spaceId: spaceSelect.value,
      date: dateInput.value,
      startTime: startSelect.value,
      durationHours: Number(durationSelect.value),
    });
    if (!result.ok) {
      showFeedback(result.error.message, true);
      return;
    }
    const name = spaceNames.get(result.value.spaceId) ?? "el espacio";
    showFeedback(
      `Reserva confirmada: ${name}, ${describirFranja(result.value)}.`,
    );
    renderList();
    if (freeHoursVisible) renderFreeHours();
  }

  // Requisitos: RF-009 y RF-010; cancelar y refrescar la disponibilidad.
  async function handleCancel(bookingId: string): Promise<void> {
    showFeedback("");
    const result = await bookings.cancelar(bookingId);
    if (!result.ok) {
      showFeedback(result.error.message, true);
      return;
    }
    showFeedback("Reserva cancelada. El horario quedó libre.");
    renderList();
    if (freeHoursVisible) renderFreeHours();
  }

  form.addEventListener("submit", (event) => {
    void handleSubmit(event);
  });
  freeHoursButton.addEventListener("click", () => {
    showFeedback("");
    freeHoursVisible = true;
    renderFreeHours();
  });
  spaceSelect.addEventListener("focus", refreshSpaces);
  document.addEventListener("reservalocal:session-change", render);

  const hoy = leerReloj(clock);
  if (hoy.ok) {
    dateInput.value = fechaDe(hoy.value);
    dateInput.min = fechaDe(hoy.value);
  }
  render();
  if (dependencies.startupWarning) {
    showFeedback(dependencies.startupWarning, true);
  }
}
