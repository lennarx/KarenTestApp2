import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Envuelve un route handler y traduce errores a respuestas JSON. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return json({ error: err.message, code: err.code }, err.status);
      }
      console.error(err);
      return json({ error: "Error interno del servidor" }, 500);
    }
  };
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // cuerpo vacío o inválido
  }
  throw new ApiError(400, "El cuerpo de la solicitud debe ser un JSON válido", "INVALID_BODY");
}

export function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "Identificador inválido", "INVALID_ID");
  }
  return id;
}

export function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Lanza un error (500) si la consulta de Supabase falló; si no, devuelve los datos. */
export function check<T = unknown>(result: { data: unknown; error: { message: string } | null }): T {
  if (result.error) {
    throw new Error(result.error.message);
  }
  return result.data as T;
}
