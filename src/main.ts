import "./shared/styles.css";
import { createAuthService } from "./auth";
import type { AuthService } from "./auth";
import { mountAuthView } from "./auth";
import { localStoragePort } from "./shared/local-storage";
import { webLockPort } from "./shared/web-lock";
import { createSpaceService, mountSpacesView } from "./spaces";
import { createBookingService, mountBookingsView, systemClock } from "./bookings";
import { createAdminService, mountAdminView } from "./admin";

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
  {
    // Requisitos 003: RF-001–RF-016; enchufar reservas. Usa su propia instancia de
    // SpaceService porque la de 002 no se expone; ambas releen el almacenamiento.
    mount(root, auth) {
      const main = root.querySelector<HTMLElement>("#main-content");
      if (!main) return;
      const spaces = createSpaceService({
        storage: localStoragePort,
        lock: webLockPort,
        auth,
      });
      spaces.initialize();
      const bookings = createBookingService({
        storage: localStoragePort,
        lock: webLockPort,
        auth,
        spaces,
        clock: systemClock,
      });
      const initializedBookings = bookings.initialize();
      mountBookingsView(main, {
        auth,
        spaces,
        bookings,
        clock: systemClock,
        startupWarning: initializedBookings.ok
          ? undefined
          : initializedBookings.error.message,
      });
    },
  },
  {
    // Requisito 004: la autorización vuelve a verificarse en el servicio admin.
    mount(root, auth) {
      const main = root.querySelector<HTMLElement>("#main-content");
      if (!main) return;
      const admin = createAdminService({
        storage: localStoragePort,
        lock: webLockPort,
        auth,
        clock: systemClock,
      });
      mountAdminView(main, { auth, admin });
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
