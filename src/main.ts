import "./shared/styles.css";
import { createAuthService } from "./auth";
import type { AuthService } from "./auth";
import { mountAuthView } from "./auth";
import { localStoragePort } from "./shared/local-storage";
import { webLockPort } from "./shared/web-lock";
import { createSpaceService, mountSpacesView } from "./spaces";

interface FeatureModule {
  mount(root: HTMLElement, auth: AuthService): void;
}

// Requisito: arquitectura modular; agregar aquí los módulos futuros de la SPA.
const featureModules: readonly FeatureModule[] = [
  {
    mount(root, auth) {
      const main = root.querySelector<HTMLElement>("#main-content");
      if (!main) return;
      const spaces = createSpaceService({
        storage: localStoragePort,
        lock: webLockPort,
        auth,
      });
      const initializedSpaces = spaces.initialize();
      mountSpacesView(
        main,
        auth,
        spaces,
        initializedSpaces.ok ? undefined : initializedSpaces.error.message,
      );
    },
  },
];

// Requisitos: RF-013–RF-017; ensamblar dependencias y avisar de datos corruptos.
function startApplication(): void {
  const root = document.getElementById("app");
  if (!(root instanceof HTMLElement)) {
    document.body.textContent =
      "No se pudo iniciar ReservaLocal: falta el punto de montaje.";
    return;
  }

  const auth = createAuthService({
    storage: localStoragePort,
    lock: webLockPort,
  });
  const initialized = auth.initialize();
  const startupWarning = initialized.ok
    ? undefined
    : initialized.error.message;

  mountAuthView(root, auth, startupWarning);
  for (const feature of featureModules) feature.mount(root, auth);
}

startApplication();
