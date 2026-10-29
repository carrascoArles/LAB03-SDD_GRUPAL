import { describe, expect, it } from "vitest";
import { createSpaceService } from "../../../src/spaces/service";
import { mountSpacesView } from "../../../src/spaces/view";
import { createSpaceAuth, createSpaceTestDependencies } from "../../helpers/spaces";

describe("integración de la vista de espacios", () => {
  it("permite crear desde formulario y muestra detalles del espacio", async () => {
    const dependencies = createSpaceTestDependencies("admin");
    const service = createSpaceService(dependencies);
    service.initialize();
    const root = document.createElement("main");
    document.body.append(root);
    mountSpacesView(root, createSpaceAuth("admin"), service);

    const form = root.querySelector("form");
    expect(form).not.toBeNull();
    const name = form?.querySelector<HTMLInputElement>("#space-name");
    const type = form?.querySelector<HTMLSelectElement>("#space-type");
    const capacity = form?.querySelector<HTMLInputElement>("#space-capacity");
    const description =
      form?.querySelector<HTMLTextAreaElement>("#space-description");
    if (!name || !type || !capacity || !description || !form) return;
    name.value = "Sala comunitaria";
    type.value = "sala";
    capacity.value = "12";
    description.value = "Con acceso al patio";
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(root.textContent).toContain("Sala comunitaria");
    expect(root.textContent).toContain("sala · Capacidad: 12");
    expect(root.textContent).toContain("Con acceso al patio");
  });

  it("no presenta catálogo ni controles de administración a una persona anónima", () => {
    const dependencies = createSpaceTestDependencies("admin");
    const service = createSpaceService(dependencies);
    service.initialize();
    const root = document.createElement("main");
    mountSpacesView(root, createSpaceAuth(null), service);
    expect(root.textContent).toContain(
      "Inicia sesión para consultar los espacios.",
    );
    expect(root.querySelector("form")).not.toBeNull();
    expect(
      root.querySelector<HTMLElement>(
        "section[aria-labelledby='spaces-management-title']",
      )?.hidden,
    ).toBe(true);
    expect(root.querySelector(".space-card")).toBeNull();
  });
});
