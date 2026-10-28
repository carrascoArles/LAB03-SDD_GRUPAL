import { describe, expect, it, vi } from "vitest";
import { mountAuthView } from "../../../src/auth/view";
import { createAuthService } from "../../../src/auth/service";
import { MemoryLock, MemoryStorage } from "../../helpers/auth";

// Requisitos RF-001–RF-010, RF-014 y RF-017: probar los flujos visibles en español.
describe("vista de autenticación", () => {
  it("muestra la advertencia y permite registrar, iniciar y cerrar sesión", async () => {
    const root = document.createElement("main");
    const storage = new MemoryStorage();
    storage.values.set("reservalocal.auth.v1", "{corrupto");
    const auth = createAuthService({ storage, lock: new MemoryLock() });
    const initialized = auth.initialize();
    mountAuthView(
      root,
      auth,
      initialized.ok ? undefined : initialized.error.message,
    );

    expect(root.textContent).toContain("Los datos guardados están dañados.");
    expect(root.querySelector("label[for=register-name]")).not.toBeNull();
    expect(
      root
        .querySelector<HTMLInputElement>("#register-name")
        ?.getAttribute("aria-describedby"),
    ).toBe("register-name-error");
    const registration = root.querySelector("form");
    expect(registration).not.toBeNull();
    if (!registration) return;
    setField(registration, "register-name", "Ana");
    setField(registration, "register-email", "ana@example.com");
    setField(registration, "register-password", "password1");
    registration.dispatchEvent(
      new SubmitEvent("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() => {
      expect(root.textContent).toContain("rol de administrador");
    });

    const login = root.querySelectorAll("form")[1];
    expect(login).toBeDefined();
    if (!login) return;
    setField(login, "login-email", "ana@example.com");
    setField(login, "login-password", "incorrecta");
    login.dispatchEvent(
      new SubmitEvent("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() => {
      expect(root.textContent).toContain(
        "El correo o la contraseña no son correctos.",
      );
    });
    expect(
      root.querySelector("#login-password-error")?.textContent,
    ).toBe("El correo o la contraseña no son correctos.");

    setField(login, "login-email", "inexistente@example.com");
    setField(login, "login-password", "incorrecta");
    login.dispatchEvent(
      new SubmitEvent("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() => {
      expect(
        root.querySelector("#login-password-error")?.textContent,
      ).toBe("El correo o la contraseña no son correctos.");
    });

    setField(login, "login-email", "ana@example.com");
    setField(login, "login-password", "password1");
    login.dispatchEvent(
      new SubmitEvent("submit", { bubbles: true, cancelable: true }),
    );
    await vi.waitFor(() => {
      expect(root.textContent).toContain("Sesión iniciada. Hola, Ana.");
    });
    expect(root.querySelector(".topbar")?.textContent).toContain("Ana");
    expect(
      root.querySelector<HTMLButtonElement>(".topbar button")?.hidden,
    ).toBe(false);

    root.querySelector<HTMLButtonElement>("button[type=button]")?.click();
    await vi.waitFor(() => {
      expect(root.textContent).toContain("Has cerrado sesión.");
      expect(root.querySelector(".session-name")?.textContent).toBe(
        "Sesión no iniciada",
      );
      expect(
        root.querySelector<HTMLButtonElement>(".topbar button")?.hidden,
      ).toBe(true);
    });
  });
});

// Requisito: RF-013; poblar entradas DOM como datos externos de formularios.
function setField(form: HTMLFormElement, name: string, value: string): void {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement) field.value = value;
}
