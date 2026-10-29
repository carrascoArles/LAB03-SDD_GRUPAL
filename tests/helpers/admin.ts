import { err, ok } from "../../src/shared/result";
import type { Clock } from "../../src/bookings";
import { createAdminService } from "../../src/admin/service";
import type { AdminService } from "../../src/admin/model";
import {
  createBookingTestContext,
  MemoryBookingStorage,
} from "./bookings";

export class CountingAdminStorage extends MemoryBookingStorage {
  reads = 0;
  writes = 0;

  override get(key: string) {
    this.reads += 1;
    return super.get(key);
  }

  override set(key: string, value: string) {
    this.writes += 1;
    return super.set(key, value);
  }
}

export interface AdminTestContext {
  readonly storage: CountingAdminStorage;
  readonly lock: ReturnType<typeof createBookingTestContext>["lock"];
  readonly auth: ReturnType<typeof createBookingTestContext>["auth"];
  readonly time: ReturnType<typeof createBookingTestContext>["time"];
  readonly admin: AdminService;
}

export function createAdminTestContext(options: {
  readonly clock?: Clock;
  readonly role?: "usuario" | "admin";
} = {}): AdminTestContext {
  const bookings = createBookingTestContext();
  const storage = new CountingAdminStorage();
  const auth = bookings.auth;
  auth.current = {
    id: "admin-1",
    name: "Admin Uno",
    email: "admin@example.com",
    role: options.role ?? "admin",
  };
  auth.isAdmin = () =>
    auth.unavailable
      ? err({ code: "STORAGE_UNAVAILABLE", message: "Fallo de sesión simulado." })
      : ok(auth.current?.role === "admin");

  const admin = createAdminService({
    storage,
    lock: bookings.lock,
    auth,
    clock: options.clock ?? bookings.time.clock,
  });

  return {
    storage,
    lock: bookings.lock,
    auth,
    time: bookings.time,
    admin,
  };
}
