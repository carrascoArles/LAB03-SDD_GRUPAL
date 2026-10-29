import { describe, expect, it } from "vitest";
import { createSpaceService } from "../../../src/spaces/service";
import { createSpaceTestDependencies } from "../../helpers/spaces";

const input = {
  name: "Sala principal",
  type: "sala" as const,
  capacity: 15,
};

describe("consulta del catálogo", () => {
  it("solo presenta espacios activos y su detalle", async () => {
    const adminDependencies = createSpaceTestDependencies("admin");
    const admin = createSpaceService(adminDependencies);
    admin.initialize();
    const active = await admin.createSpace(input);
    const inactive = await admin.createSpace({
      ...input,
      name: "Consultorio norte",
      type: "consultorio",
    });
    expect(active.ok && inactive.ok).toBe(true);
    if (!active.ok || !inactive.ok) return;
    await admin.deactivateSpace(inactive.value.id);

    const user = createSpaceService({
      ...adminDependencies,
      auth: createSpaceTestDependencies("usuario").auth,
    });
    user.initialize();
    expect(user.listActiveSpaces()).toMatchObject({
      ok: true,
      value: [{ id: active.value.id, name: input.name, active: true }],
    });
    expect(user.getActiveSpace(active.value.id)).toMatchObject({
      ok: true,
      value: { type: "sala", capacity: 15, active: true },
    });
    expect(user.getActiveSpace(inactive.value.id)).toMatchObject({
      ok: false,
      error: { code: "SPACE_NOT_FOUND" },
    });
  });

  it("no permite consultar sin sesión y exige admin para ver inactivos", () => {
    const anonymousDependencies = createSpaceTestDependencies(null);
    const anonymous = createSpaceService(anonymousDependencies);
    anonymous.initialize();
    expect(anonymous.listActiveSpaces()).toMatchObject({
      ok: false,
      error: {
        code: "NOT_AUTHENTICATED",
        message: "Debes iniciar sesión para consultar los espacios.",
      },
    });

    const user = createSpaceService({
      ...anonymousDependencies,
      auth: createSpaceTestDependencies("usuario").auth,
    });
    user.initialize();
    expect(user.listManagedSpaces()).toMatchObject({
      ok: false,
      error: { code: "PERMISSION_DENIED" },
    });
  });
});
