import type { AuthService } from "../auth";
import type { Space, SpaceService, SpaceType } from "./model";
import { validateSpaceInput } from "./validation";

const spaceTypes: readonly SpaceType[] = [
  "cancha",
  "sala",
  "consultorio",
];

// Requisito: RF-004–RF-007; crear controles con valores accesibles y explícitos.
function createSpaceForm(document: Document): HTMLFormElement {
  const form = document.createElement("form");
  form.className = "form-stack";
  form.noValidate = true;
  const nameLabel = document.createElement("label");
  nameLabel.htmlFor = "space-name";
  nameLabel.textContent = "Nombre (3 a 50 caracteres)";
  const name = document.createElement("input");
  name.id = "space-name";
  name.name = "name";
  name.required = true;
  name.maxLength = 50;

  const typeLabel = document.createElement("label");
  typeLabel.htmlFor = "space-type";
  typeLabel.textContent = "Tipo";
  const type = document.createElement("select");
  type.id = "space-type";
  type.name = "type";
  type.required = true;
  for (const value of spaceTypes) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    type.append(option);
  }

  const capacityLabel = document.createElement("label");
  capacityLabel.htmlFor = "space-capacity";
  capacityLabel.textContent = "Capacidad (1 a 100)";
  const capacity = document.createElement("input");
  capacity.id = "space-capacity";
  capacity.name = "capacity";
  capacity.type = "number";
  capacity.min = "1";
  capacity.max = "100";
  capacity.step = "1";
  capacity.required = true;

  const descriptionLabel = document.createElement("label");
  descriptionLabel.htmlFor = "space-description";
  descriptionLabel.textContent = "Descripción (opcional, máximo 200 caracteres)";
  const description = document.createElement("textarea");
  description.id = "space-description";
  description.name = "description";
  description.maxLength = 200;
  description.rows = 3;

  const submit = document.createElement("button");
  submit.className = "btn btn-primary";
  submit.type = "submit";
  submit.textContent = "Crear espacio";
  const cancel = document.createElement("button");
  cancel.className = "btn btn-secondary";
  cancel.type = "button";
  cancel.textContent = "Cancelar edición";
  cancel.hidden = true;
  cancel.dataset.cancelEdit = "true";
  form.append(
    nameLabel,
    name,
    typeLabel,
    type,
    capacityLabel,
    capacity,
    descriptionLabel,
    description,
    submit,
    cancel,
  );
  return form;
}

// Requisito: RF-001–RF-013; montar catálogo, detalle y gestión en la sección principal.
export function mountSpacesView(
  root: HTMLElement,
  auth: AuthService,
  service: SpaceService,
  startupError?: string,
): void {
  const document = root.ownerDocument;
  const section = document.createElement("section");
  section.className = "card spaces-section";
  section.setAttribute("aria-labelledby", "spaces-title");
  const heading = document.createElement("h2");
  heading.id = "spaces-title";
  heading.textContent = "Catálogo de espacios";
  const feedback = document.createElement("p");
  feedback.className = "alert global-feedback";
  feedback.setAttribute("aria-live", "polite");
  feedback.hidden = true;
  const catalog = document.createElement("div");
  catalog.className = "spaces-list";
  const management = document.createElement("section");
  management.setAttribute("aria-labelledby", "spaces-management-title");
  const managementHeading = document.createElement("h3");
  managementHeading.id = "spaces-management-title";
  managementHeading.textContent = "Gestionar espacios";
  const form = createSpaceForm(document);
  const managedList = document.createElement("div");
  managedList.className = "spaces-list";
  management.append(managementHeading, form, managedList);
  section.append(heading, feedback, catalog, management);
  root.append(section);

  const name = form.querySelector<HTMLInputElement>("#space-name");
  const type = form.querySelector<HTMLSelectElement>("#space-type");
  const capacity = form.querySelector<HTMLInputElement>("#space-capacity");
  const description =
    form.querySelector<HTMLTextAreaElement>("#space-description");
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const cancel = form.querySelector<HTMLButtonElement>(
    '[data-cancel-edit="true"]',
  );
  if (
    !name ||
    !type ||
    !capacity ||
    !description ||
    !submit ||
    !cancel
  ) {
    feedback.textContent = "No se pudo cargar el formulario de espacios.";
    feedback.hidden = false;
    feedback.classList.add("alert-error");
    return;
  }
  const nameInput = name;
  const typeInput = type;
  const capacityInput = capacity;
  const descriptionInput = description;
  const submitButton = submit;
  const cancelButton = cancel;

  let editingId: string | null = null;
  let initialError = startupError;

  // Requisito: RF-017; publicar errores y estados con texto seguro.
  function showFeedback(message: string, isError = false): void {
    feedback.textContent = message;
    feedback.hidden = message.length === 0;
    feedback.classList.toggle("alert-error", isError);
    feedback.classList.toggle("alert-success", !isError && message.length > 0);
    feedback.setAttribute("role", isError ? "alert" : "status");
  }

  // Requisito: RF-001–RF-003; ocultar datos y controles según sesión y rol.
  function render(): void {
    catalog.replaceChildren();
    if (initialError) {
      management.hidden = true;
      showFeedback(initialError, true);
      return;
    }
    const current = auth.getCurrentUser();
    if (!current.ok) {
      management.hidden = true;
      showFeedback(current.error.message, true);
      return;
    }
    if (current.value === null) {
      management.hidden = true;
      showFeedback("Inicia sesión para consultar los espacios.");
      return;
    }

    const spaces = service.listActiveSpaces();
    if (!spaces.ok) {
      management.hidden = true;
      showFeedback(spaces.error.message, true);
      return;
    }
    if (spaces.value.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Todavía no hay espacios activos.";
      catalog.append(empty);
    }
    for (const space of spaces.value) catalog.append(createSpaceCard(space));

    const isAdmin = current.value.role === "admin";
    management.hidden = !isAdmin;
    if (isAdmin) {
      const managed = service.listManagedSpaces();
      if (!managed.ok) {
        showFeedback(managed.error.message, true);
        return;
      }
      managedList.replaceChildren();
      for (const space of managed.value.filter((candidate) => !candidate.active)) {
        managedList.append(createInactiveRow(space));
      }
    }
  }

  // Requisito: RF-002; mostrar todos los datos del espacio activo seleccionado.
  function createSpaceCard(space: Space): HTMLElement {
    const card = document.createElement("article");
    card.className = "space-card";
    const title = document.createElement("h3");
    title.textContent = space.name;
    const summary = document.createElement("p");
    summary.textContent = `${space.type} · Capacidad: ${space.capacity}`;
    const details = document.createElement("details");
    const summaryLabel = document.createElement("summary");
    summaryLabel.textContent = "Ver detalle";
    const descriptionText = document.createElement("p");
    descriptionText.textContent = space.description ?? "Sin descripción.";
    details.append(summaryLabel, descriptionText);
    card.append(title, summary, details);

    const current = auth.getCurrentUser();
    if (current.ok && current.value?.role === "admin") {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "btn btn-secondary";
      edit.textContent = "Editar";
      edit.addEventListener("click", () => beginEdit(space));
      const deactivate = document.createElement("button");
      deactivate.type = "button";
      deactivate.className = "btn btn-secondary";
      deactivate.textContent = "Desactivar";
      deactivate.addEventListener("click", () => {
        void (async () => {
          const result = await service.deactivateSpace(space.id);
          if (!result.ok) showFeedback(result.error.message, true);
          else {
            showFeedback("Espacio desactivado.");
            render();
          }
        })();
      });
      card.append(edit, deactivate);
    }
    return card;
  }

  // Requisito: RF-003; ofrecer edición también para registros inactivos.
  function createInactiveRow(space: Space): HTMLElement {
    const row = document.createElement("article");
    row.className = "space-card";
    const title = document.createElement("h4");
    title.textContent = `${space.name} (inactivo)`;
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "btn btn-secondary";
    edit.textContent = "Editar espacio inactivo";
    edit.addEventListener("click", () => beginEdit(space));
    row.append(title, edit);
    return row;
  }

  // Requisito: RF-003; cargar datos sin alterar la disponibilidad guardada.
  function beginEdit(space: Space): void {
    editingId = space.id;
    nameInput.value = space.name;
    typeInput.value = space.type;
    capacityInput.value = String(space.capacity);
    descriptionInput.value = space.description ?? "";
    submitButton.textContent = "Guardar cambios";
    cancelButton.hidden = false;
    nameInput.focus();
  }

  // Requisito: RF-003; limpiar formulario y abandonar una edición explícitamente.
  function cancelEdit(): void {
    editingId = null;
    form.reset();
    submitButton.textContent = "Crear espacio";
    cancelButton.hidden = true;
  }

  // Requisitos: RF-003–RF-008; validar la entrada de DOM y publicar el resultado.
  async function saveSpace(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    showFeedback("");
    const raw: Record<string, unknown> = {
      name: nameInput.value,
      type: typeInput.value,
      capacity:
        capacityInput.value === "" ? Number.NaN : Number(capacityInput.value),
      description: descriptionInput.value,
    };
    const validated = validateSpaceInput(raw);
    if (!validated.ok) {
      showFeedback(validated.error.message, true);
      return;
    }
    const wasEditing = editingId !== null;
    const result = editingId
      ? await service.updateSpace(editingId, validated.value)
      : await service.createSpace(validated.value);
    if (!result.ok) {
      showFeedback(result.error.message, true);
      return;
    }
    cancelEdit();
    showFeedback(wasEditing ? "Espacio actualizado." : "Espacio creado.");
    render();
  }

  form.addEventListener("submit", (event) => {
    void saveSpace(event);
  });
  cancel.addEventListener("click", cancelEdit);
  document.addEventListener("reservalocal:session-change", render);
  render();
}
