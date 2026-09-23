import { ApiError } from "./http";

export function parseCobertura(value: unknown): number {
  const n = Number(value);
  if (value === "" || value === null || value === undefined || !Number.isFinite(n) || n < 0 || n > 100) {
    throw new ApiError(400, "La cobertura debe ser un número entre 0 y 100", "VALIDATION_ERROR");
  }
  return Math.round(n * 100) / 100;
}

export function parsePrecio(value: unknown): number {
  const n = Number(value);
  if (value === "" || value === null || value === undefined || !Number.isFinite(n) || n <= 0) {
    throw new ApiError(400, "El precio de la consulta debe ser un número mayor a 0", "VALIDATION_ERROR");
  }
  return Math.round(n * 100) / 100;
}
