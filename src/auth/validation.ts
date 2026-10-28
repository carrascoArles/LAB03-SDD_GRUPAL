import { err, ok, type Result } from "../shared/result";

export type ValidationErrorCode =
  | "INVALID_NAME"
  | "INVALID_EMAIL"
  | "INVALID_PASSWORD";

export interface ValidationError {
  readonly code: ValidationErrorCode;
  readonly message: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

// Requisito: RF-002; recortar y validar el nombre en puntos de código Unicode.
export function validateName(input: unknown): Result<string, ValidationError> {
  if (typeof input !== "string") {
    return err({
      code: "INVALID_NAME",
      message: "El nombre debe contener entre 2 y 50 caracteres.",
    });
  }

  const name = input.trim();
  const length = Array.from(name).length;
  if (length < 2 || length > 50) {
    return err({
      code: "INVALID_NAME",
      message: "El nombre debe contener entre 2 y 50 caracteres.",
    });
  }

  return ok(name);
}

// Requisitos: RF-003 y RF-004; validar y normalizar el correo.
export function validateEmail(input: unknown): Result<string, ValidationError> {
  if (typeof input !== "string") {
    return err({
      code: "INVALID_EMAIL",
      message: "Introduce un correo electrónico válido.",
    });
  }

  const email = input.trim().toLowerCase();
  if (email.length > 254 || !emailPattern.test(email)) {
    return err({
      code: "INVALID_EMAIL",
      message: "Introduce un correo electrónico válido.",
    });
  }

  return ok(email);
}

// Requisito: RF-005; conservar la contraseña exactamente como se proporciona.
export function validatePassword(
  input: unknown,
): Result<string, ValidationError> {
  if (typeof input !== "string") {
    return err({
      code: "INVALID_PASSWORD",
      message: "La contraseña debe contener entre 8 y 64 caracteres.",
    });
  }

  const length = Array.from(input).length;
  if (length < 8 || length > 64) {
    return err({
      code: "INVALID_PASSWORD",
      message: "La contraseña debe contener entre 8 y 64 caracteres.",
    });
  }

  return ok(input);
}
