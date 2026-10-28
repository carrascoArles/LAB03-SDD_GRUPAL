import { err, ok, type Result } from "../shared/result";

export interface PasswordCredential {
  readonly passwordAlgorithm: "sha256-salt-v1";
  readonly salt: string;
  readonly passwordHash: string;
}

export interface PasswordError {
  readonly code: "CRYPTO_UNAVAILABLE";
  readonly message: string;
}

const encoder = new TextEncoder();

// Requisito: RF-015; generar una sal independiente con el generador criptográfico.
function createSalt(): Uint8Array {
  const salt = new Uint8Array(16);
  globalThis.crypto.getRandomValues(salt);
  return salt;
}

// Requisito: RF-015; codificar bytes en hexadecimal sin almacenar la contraseña.
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Requisito: RF-015; calcular SHA-256 de sal y contraseña UTF-8.
async function digestPassword(
  password: string,
  salt: Uint8Array,
): Promise<string> {
  const passwordBytes = encoder.encode(password);
  const input = new Uint8Array(salt.length + passwordBytes.length);
  input.set(salt);
  input.set(passwordBytes, salt.length);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", input);
  return toHex(new Uint8Array(digest));
}

// Requisito: RF-015; crear y devolver solo material de verificación.
export async function hashPassword(
  password: string,
): Promise<Result<PasswordCredential, PasswordError>> {
  try {
    const salt = createSalt();
    return ok({
      passwordAlgorithm: "sha256-salt-v1",
      salt: toHex(salt),
      passwordHash: await digestPassword(password, salt),
    });
  } catch {
    return err({
      code: "CRYPTO_UNAVAILABLE",
      message: "No se pudo procesar la contraseña en este navegador.",
    });
  }
}

// Requisito: RF-007 y RF-015; comparar la credencial sin exponerla.
export async function verifyPassword(
  password: string,
  credential: PasswordCredential,
): Promise<Result<boolean, PasswordError>> {
  try {
    const salt = Uint8Array.from(
      credential.salt.match(/.{2}/gu) ?? [],
      (pair) => Number.parseInt(pair, 16),
    );
    if (salt.length !== 16 || credential.passwordAlgorithm !== "sha256-salt-v1") {
      return ok(false);
    }

    const hash = await digestPassword(password, salt);
    let difference = hash.length ^ credential.passwordHash.length;
    for (let index = 0; index < hash.length; index += 1) {
      difference |=
        hash.charCodeAt(index) ^
        (credential.passwordHash.charCodeAt(index) || 0);
    }
    return ok(difference === 0);
  } catch {
    return err({
      code: "CRYPTO_UNAVAILABLE",
      message: "No se pudo comprobar la contraseña en este navegador.",
    });
  }
}

// Requisito: RF-001; generar identificadores sin depender de datos de credenciales.
export function generateUserId(): Result<string, PasswordError> {
  try {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    return ok(toHex(bytes));
  } catch {
    return err({
      code: "CRYPTO_UNAVAILABLE",
      message: "No se pudo crear la cuenta en este navegador.",
    });
  }
}
