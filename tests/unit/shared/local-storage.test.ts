import { afterEach, describe, expect, it, vi } from "vitest";
import { localStoragePort } from "../../../src/shared/local-storage";

// Requisitos RF-013 y RF-016: traducir fallos del almacenamiento del navegador.
describe("adaptador de localStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devuelve un error tipado cuando se agota la cuota", () => {
    const storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      },
      removeItem: () => undefined,
    };
    vi.stubGlobal("localStorage", storage);

    expect(localStoragePort.set("reservalocal.auth.v1", "{}")).toMatchObject({
      ok: false,
      error: { code: "STORAGE_WRITE_FAILED" },
    });
  });
});
