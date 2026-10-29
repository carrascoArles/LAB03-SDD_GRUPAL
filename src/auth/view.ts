import type { AuthService } from "./service";

interface AuthFieldOptions {
  readonly id: string;
  readonly label: string;
  readonly type: "email" | "password" | "text";
  readonly autocomplete: HTMLInputElement["autocomplete"];
}

// Requisitos: RF-001–RF-005; construir campos de formulario accesibles.
function createField(
  document: Document,
  options: AuthFieldOptions,
): HTMLElement {
  const label = document.createElement("label");
  label.htmlFor = options.id;
  label.textContent = options.label;

  const input = document.createElement("input");
  input.id = options.id;
  input.name = options.id;
  input.type = options.type;
  input.autocomplete = options.autocomplete;
  input.required = true;
  input.setAttribute("aria-describedby", `${options.id}-error`);

  const error = document.createElement("p");
  error.id = `${options.id}-error`;
  error.className = "field-error";
  error.hidden = true;
  error.setAttribute("aria-live", "polite");
  error.setAttribute("role", "alert");

  const wrapper = document.createElement("div");
  wrapper.className = "form-field";
  wrapper.append(label, input);
  wrapper.append(error);
  return wrapper;
}

// Requisito: RF-013; obtener solo texto de formularios antes de validarlo.
function formText(data: FormData, name: string): string {
  const value = data.get(name);
  return typeof value === "string" ? value : "";
}

// Requisitos: RF-001–RF-010 y RF-017; montar la interfaz de cuentas en español.
export function mountAuthView(
  root: HTMLElement,
  auth: AuthService,
  startupWarning?: string,
): void {
  const document = root.ownerDocument;
  root.replaceChildren();

  const topbar = document.createElement("header");
  topbar.className = "topbar";
  const brand = document.createElement("a");
  brand.className = "brand";
  brand.href = "/";
  brand.setAttribute("aria-label", "ReservaLocal, inicio");
  const brandMark = document.createElement("span");
  brandMark.className = "brand-mark";
  brandMark.setAttribute("aria-hidden", "true");
  brandMark.textContent = "R";
  const brandName = document.createElement("span");
  brandName.textContent = "ReservaLocal";
  brand.append(brandMark, brandName);

  const topbarSession = document.createElement("div");
  topbarSession.className = "topbar-session";
  const sessionUser = document.createElement("div");
  sessionUser.className = "session-user";
  const sessionName = document.createElement("span");
  sessionName.className = "session-name";
  const sessionDetail = document.createElement("span");
  sessionDetail.className = "session-detail";
  sessionUser.append(sessionName, sessionDetail);

  const logoutButton = document.createElement("button");
  logoutButton.type = "button";
  logoutButton.className = "btn btn-secondary";
  logoutButton.textContent = "Cerrar sesión";
  topbarSession.append(sessionUser, logoutButton);
  topbar.append(brand, topbarSession);

  const appMain = document.createElement("main");
  appMain.className = "app-main";
  appMain.id = "main-content";

  const welcome = document.createElement("section");
  welcome.className = "welcome";
  welcome.setAttribute("aria-labelledby", "welcome-title");
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Tu espacio empieza aquí";
  const heading = document.createElement("h1");
  heading.id = "welcome-title";
  heading.textContent = "Bienvenido a ReservaLocal";
  const description = document.createElement("p");
  description.className = "welcome-description";
  description.textContent = "Crea una cuenta o inicia sesión para continuar.";
  welcome.append(eyebrow, heading, description);

  const feedback = document.createElement("p");
  feedback.className = "alert global-feedback";
  feedback.setAttribute("aria-live", "polite");
  feedback.setAttribute("role", "status");
  feedback.hidden = true;
  if (startupWarning) {
    feedback.textContent = startupWarning;
    feedback.classList.add("alert-error");
    feedback.hidden = false;
    feedback.setAttribute("role", "alert");
  }

  const authGrid = document.createElement("div");
  authGrid.className = "auth-grid";
  const registrationHeading = document.createElement("h2");
  registrationHeading.textContent = "Crear cuenta";
  registrationHeading.id = "register-title";
  const registrationIntro = document.createElement("p");
  registrationIntro.textContent =
    "Regístrate para empezar a gestionar tus reservas.";
  const registrationForm = document.createElement("form");
  registrationForm.className = "form-stack";
  registrationForm.noValidate = true;
  registrationForm.append(
    createField(document, {
      id: "register-name",
      label: "Nombre",
      type: "text",
      autocomplete: "name",
    }),
    createField(document, {
      id: "register-email",
      label: "Correo electrónico",
      type: "email",
      autocomplete: "email",
    }),
    createField(document, {
      id: "register-password",
      label: "Contraseña",
      type: "password",
      autocomplete: "new-password",
    }),
  );
  const registerButton = document.createElement("button");
  registerButton.type = "submit";
  registerButton.className = "btn btn-primary form-submit";
  registerButton.textContent = "Registrarme";
  registrationForm.append(registerButton);

  const loginHeading = document.createElement("h2");
  loginHeading.textContent = "Iniciar sesión";
  loginHeading.id = "login-title";
  const loginIntro = document.createElement("p");
  loginIntro.textContent = "Continúa donde lo dejaste.";
  const loginForm = document.createElement("form");
  loginForm.className = "form-stack";
  loginForm.noValidate = true;
  loginForm.append(
    createField(document, {
      id: "login-email",
      label: "Correo electrónico",
      type: "email",
      autocomplete: "email",
    }),
    createField(document, {
      id: "login-password",
      label: "Contraseña",
      type: "password",
      autocomplete: "current-password",
    }),
  );
  const loginButton = document.createElement("button");
  loginButton.type = "submit";
  loginButton.className = "btn btn-primary form-submit";
  loginButton.textContent = "Entrar";
  loginForm.append(loginButton);

  const registrationSection = document.createElement("section");
  registrationSection.className = "card auth-card";
  registrationSection.setAttribute("aria-labelledby", "register-title");
  const registrationCardHeading = document.createElement("div");
  registrationCardHeading.className = "card-heading";
  registrationCardHeading.append(registrationHeading, registrationIntro);
  registrationSection.append(registrationCardHeading, registrationForm);

  const loginSection = document.createElement("section");
  loginSection.className = "card auth-card";
  loginSection.setAttribute("aria-labelledby", "login-title");
  const loginCardHeading = document.createElement("div");
  loginCardHeading.className = "card-heading";
  loginCardHeading.append(loginHeading, loginIntro);
  loginSection.append(loginCardHeading, loginForm);
  authGrid.append(registrationSection, loginSection);
  appMain.append(welcome, feedback, authGrid);
  root.append(topbar, appMain);

  // Requisito: RF-017; anunciar mensajes y errores accesibles en español.
  function showFeedback(message: string, isError = false): void {
    feedback.textContent = message;
    feedback.hidden = message.length === 0;
    feedback.classList.toggle("alert-error", isError);
    feedback.classList.toggle("alert-success", !isError && message.length > 0);
    feedback.setAttribute("role", isError ? "alert" : "status");
  }

  // Requisito: RF-011–RF-012; mostrar solo la identidad pública de la sesión.
  function renderSession(): void {
    const current = auth.getCurrentUser();
    if (!current.ok) {
      sessionName.textContent = current.error.message;
      sessionDetail.textContent = "";
      topbarSession.hidden = true;
      logoutButton.hidden = true;
      root.dispatchEvent(
        new Event("reservalocal:session-change", { bubbles: true }),
      );
      return;
    }

    if (current.value === null) {
      sessionName.textContent = "Sesión no iniciada";
      sessionDetail.textContent = "";
      topbarSession.hidden = true;
      logoutButton.hidden = true;
      root.dispatchEvent(
        new Event("reservalocal:session-change", { bubbles: true }),
      );
      return;
    }

    sessionName.textContent = current.value.name;
    sessionDetail.textContent = `${current.value.email} · ${current.value.role}`;
    topbarSession.hidden = false;
    logoutButton.hidden = false;
    root.dispatchEvent(
      new Event("reservalocal:session-change", { bubbles: true }),
    );
  }

  // Requisito: RF-017; asociar errores de validación visibles a su campo.
  function showFieldError(
    form: HTMLFormElement,
    fieldName: string,
    message: string,
  ): void {
    const field = form.elements.namedItem(fieldName);
    const error = form.querySelector<HTMLElement>(`#${fieldName}-error`);
    if (!(field instanceof HTMLInputElement) || !error) return;
    error.textContent = message;
    error.hidden = message.length === 0;
    if (message.length > 0) field.setAttribute("aria-invalid", "true");
    else field.removeAttribute("aria-invalid");
  }

  // Requisito: RF-017; limpiar los errores asociados antes de un nuevo envío.
  function clearFieldErrors(form: HTMLFormElement): void {
    for (const field of form.querySelectorAll<HTMLInputElement>("input")) {
      showFieldError(form, field.name, "");
    }
  }

  // Requisitos: RF-001–RF-006 y RF-017; publicar éxito tras guardar la cuenta.
  async function handleRegistration(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    clearFieldErrors(registrationForm);
    showFeedback("");
    const data = new FormData(registrationForm);
    const result = await auth.registerUser({
      name: formText(data, "register-name"),
      email: formText(data, "register-email"),
      password: formText(data, "register-password"),
    });

    if (!result.ok) {
      let fieldName: string | null = null;
      switch (result.error.code) {
        case "INVALID_NAME":
          fieldName = "register-name";
          break;
        case "INVALID_EMAIL":
        case "EMAIL_ALREADY_USED":
          fieldName = "register-email";
          break;
        case "INVALID_PASSWORD":
          fieldName = "register-password";
          break;
      }
      if (fieldName) {
        showFieldError(registrationForm, fieldName, result.error.message);
      } else {
        showFeedback(result.error.message, true);
      }
      return;
    }

    registrationForm.reset();
    clearFieldErrors(registrationForm);
    showFeedback(
      result.value.role === "admin"
        ? "Cuenta creada. Se te asignó el rol de administrador."
        : "Cuenta creada. Ya puedes iniciar sesión.",
    );
    renderSession();
  }

  // Requisitos: RF-007–RF-008 y RF-017; mantener genérico el error de acceso.
  async function handleLogin(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    clearFieldErrors(loginForm);
    showFeedback("");
    const data = new FormData(loginForm);
    const result = await auth.login({
      email: formText(data, "login-email"),
      password: formText(data, "login-password"),
    });

    if (!result.ok) {
      if (result.error.code === "INVALID_CREDENTIALS") {
        showFieldError(loginForm, "login-password", result.error.message);
      } else {
        showFeedback(result.error.message, true);
      }
      return;
    }

    loginForm.reset();
    clearFieldErrors(loginForm);
    showFeedback(`Sesión iniciada. Hola, ${result.value.name}.`);
    renderSession();
  }

  // Requisito: RF-009; cerrar sesión solo tras confirmar su persistencia.
  async function handleLogout(): Promise<void> {
    const result = await auth.logout();
    if (!result.ok) {
      showFeedback(result.error.message, true);
      return;
    }
    showFeedback("Has cerrado sesión.");
    renderSession();
  }

  registrationForm.addEventListener("submit", (event) => {
    void handleRegistration(event);
  });
  loginForm.addEventListener("submit", (event) => {
    void handleLogin(event);
  });
  logoutButton.addEventListener("click", () => {
    void handleLogout();
  });

  renderSession();
}
