import { describe, expect, it } from "vitest";
import {
  validateEmail,
  validateName,
  validatePassword,
} from "../../../src/auth/validation";

// Requisitos RF-002–RF-005: límites inclusivos y validación de formularios.
describe("validación de registro", () => {
  it("rechaza nombres de 1 y 51 caracteres y acepta 2 y 50", () => {
    expect(validateName("a").ok).toBe(false);
    expect(validateName("ab").ok).toBe(true);
    expect(validateName("a".repeat(50)).ok).toBe(true);
    expect(validateName("a".repeat(51)).ok).toBe(false);
  });

  it("cuenta puntos de código Unicode al validar nombres", () => {
    expect(validateName("😀a").ok).toBe(true);
    expect(validateName("😀").ok).toBe(false);
  });

  it("recorta nombre válido", () => {
    const result = validateName("  Ana  ");
    expect(result.ok && result.value).toBe("Ana");
  });

  it("rechaza contraseñas de 7 y 65 caracteres y acepta 8 y 64", () => {
    expect(validatePassword("a".repeat(7)).ok).toBe(false);
    expect(validatePassword("a".repeat(8)).ok).toBe(true);
    expect(validatePassword("a".repeat(64)).ok).toBe(true);
    expect(validatePassword("a".repeat(65)).ok).toBe(false);
  });

  it("no recorta la contraseña", () => {
    const result = validatePassword("  123456  ");
    expect(result.ok && result.value).toBe("  123456  ");
  });

  it("rechaza correos vacíos o mal formados y normaliza los válidos", () => {
    expect(validateEmail("").ok).toBe(false);
    expect(validateEmail("ana@").ok).toBe(false);
    expect(validateEmail("ana@ejemplo.com").ok).toBe(true);
    const normalized = validateEmail(" ANA@Ejemplo.COM ");
    expect(normalized.ok && normalized.value).toBe("ana@ejemplo.com");
  });

  it("devuelve errores tipados en vez de lanzar ante tipos inválidos", () => {
    expect(() => validateName(null)).not.toThrow();
    expect(validateName(null).ok).toBe(false);
    expect(validateEmail(42).ok).toBe(false);
    expect(validatePassword(undefined).ok).toBe(false);
  });
});
