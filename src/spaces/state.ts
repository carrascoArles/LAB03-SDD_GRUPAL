import { err, ok, type Result } from "../shared/result";
import { emptySpaceState } from "./model";
import type { Space, SpaceError, SpaceState, SpaceType } from "./model";

const stateKeys = new Set(["schemaVersion", "spaces"]);
const spaceKeys = new Set([
  "id",
  "name",
  "type",
  "capacity",
  "description",
  "active",
]);
const allowedTypes = new Set<SpaceType>([
  "cancha",
  "sala",
  "consultorio",
]);

// Requisito: RF-013; comprobar objetos externos antes de consultar sus campos.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Requisito: RF-013; comprobar que un objeto no contiene propiedades inesperadas.
function hasOnlyKeys(
  value: Record<string, unknown>,
  keys: ReadonlySet<string>,
): boolean {
  return Object.keys(value).every((key) => keys.has(key));
}

// Requisitos: RF-004–RF-007; validar los límites de un espacio persistido.
function isSpace(value: unknown): value is Space {
  if (!isRecord(value) || !hasOnlyKeys(value, spaceKeys)) return false;
  const nameLength =
    typeof value.name === "string" ? Array.from(value.name).length : 0;
  const descriptionValid =
    value.description === undefined ||
    (typeof value.description === "string" &&
      Array.from(value.description).length <= 200);

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    nameLength >= 3 &&
    nameLength <= 50 &&
    typeof value.type === "string" &&
    allowedTypes.has(value.type as SpaceType) &&
    typeof value.capacity === "number" &&
    Number.isInteger(value.capacity) &&
    value.capacity >= 1 &&
    value.capacity <= 100 &&
    descriptionValid &&
    typeof value.active === "boolean"
  );
}

// Requisito: RF-004; detectar ids y nombres duplicados en el documento.
function hasUniqueSpaces(spaces: readonly Space[]): boolean {
  const ids = new Set(spaces.map((space) => space.id));
  const names = new Set(spaces.map((space) => space.name.toLowerCase()));
  return ids.size === spaces.length && names.size === spaces.length;
}

// Requisito: RF-013; producir errores de persistencia en español.
function corruptStorage(message: string): Result<never, SpaceError> {
  return err({ code: "CORRUPT_STORAGE", message });
}

// Requisitos: RF-004–RF-008; decodificar datos persistidos sin confiar en su forma.
export function decodeSpaceState(input: unknown): Result<SpaceState, SpaceError> {
  let value: unknown = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      return corruptStorage("Los datos guardados de espacios están dañados.");
    }
  }

  if (value === null) return ok(emptySpaceState());
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, stateKeys) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.spaces)
  ) {
    return corruptStorage("Los datos guardados de espacios no son válidos.");
  }

  const spaces: Space[] = [];
  for (const candidate of value.spaces) {
    if (!isSpace(candidate)) {
      return corruptStorage("Uno de los espacios guardados no es válido.");
    }
    spaces.push(candidate);
  }

  if (!hasUniqueSpaces(spaces)) {
    return corruptStorage(
      "Los espacios guardados contienen identificadores o nombres duplicados.",
    );
  }

  return ok({ schemaVersion: 1, spaces });
}

// Requisito: RF-008; serializar el documento de espacios validado.
export function serializeSpaceState(state: SpaceState): string {
  return JSON.stringify(state);
}
