import { err, ok, type Result } from "../shared/result";
import type { SpaceError, SpaceInput, SpaceType } from "./model";

const allowedTypes = new Set<SpaceType>([
  "cancha",
  "sala",
  "consultorio",
]);

// Requisito: RF-004; contar caracteres Unicode sin modificar el nombre.
function characterCount(value: string): number {
  return Array.from(value).length;
}

// Requisito: RF-004; validar el rango inclusivo del nombre.
export function validateSpaceName(value: unknown): Result<string, SpaceError> {
  if (typeof value !== "string") {
    return err({
      code: "INVALID_NAME",
      message: "El nombre debe tener entre 3 y 50 caracteres.",
    });
  }
  const length = characterCount(value);
  if (length < 3 || length > 50) {
    return err({
      code: "INVALID_NAME",
      message: "El nombre debe tener entre 3 y 50 caracteres.",
    });
  }
  return ok(value);
}

// Requisito: RF-005; limitar el tipo a las categorías permitidas.
export function validateSpaceType(value: unknown): Result<SpaceType, SpaceError> {
  if (typeof value !== "string" || !allowedTypes.has(value as SpaceType)) {
    return err({
      code: "INVALID_TYPE",
      message: "El tipo debe ser cancha, sala o consultorio.",
    });
  }
  return ok(value as SpaceType);
}

// Requisito: RF-006; aceptar únicamente enteros dentro de los límites inclusivos.
export function validateSpaceCapacity(
  value: unknown,
): Result<number, SpaceError> {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 100
  ) {
    return err({
      code: "INVALID_CAPACITY",
      message: "La capacidad debe ser un número entero entre 1 y 100.",
    });
  }
  return ok(value);
}

// Requisito: RF-007; permitir descripción opcional hasta 200 caracteres.
export function validateSpaceDescription(
  value: unknown,
): Result<string | undefined, SpaceError> {
  if (value === undefined) return ok(undefined);
  if (
    typeof value !== "string" ||
    characterCount(value) > 200
  ) {
    return err({
      code: "INVALID_DESCRIPTION",
      message: "La descripción debe tener como máximo 200 caracteres.",
    });
  }
  return ok(value);
}

// Requisitos: RF-004–RF-008; validar todos los campos antes de mutar el estado.
export function validateSpaceInput(
  value: unknown,
): Result<SpaceInput, SpaceError> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return err({
      code: "INVALID_NAME",
      message: "Completa los datos del espacio.",
    });
  }
  const input = value as Record<string, unknown>;
  const name = validateSpaceName(input.name);
  if (!name.ok) return name;
  const type = validateSpaceType(input.type);
  if (!type.ok) return type;
  const capacity = validateSpaceCapacity(input.capacity);
  if (!capacity.ok) return capacity;
  const description = validateSpaceDescription(input.description);
  if (!description.ok) return description;

  return ok({
    name: name.value,
    type: type.value,
    capacity: capacity.value,
    ...(description.value === undefined
      ? {}
      : { description: description.value }),
  });
}

// Requisito: RF-004; comparar nombres ignorando mayúsculas y minúsculas.
export function normalizeSpaceName(name: string): string {
  return name.toLowerCase();
}
