import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, json, readBody, route, str } from "@/lib/http";
import { parseCobertura } from "@/lib/validation";

/**
 * @openapi
 * /api/admin/health-insurances:
 *   post:
 *     tags: [Admin]
 *     summary: Crear obra social
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, coberturaPct]
 *             properties:
 *               nombre: { type: string, example: Salud Norte }
 *               coberturaPct: { type: number, minimum: 0, maximum: 100, example: 50 }
 *     responses:
 *       201:
 *         description: Obra social creada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/HealthInsurance' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
export const POST = route(async (req) => {
  await requireUser(req, ["admin"]);
  const body = await readBody(req);
  const nombre = str(body.nombre);
  if (nombre.length < 2) throw new ApiError(400, "El nombre es obligatorio", "VALIDATION_ERROR");
  const cobertura_pct = parseCobertura(body.coberturaPct);
  const { data, error } = await db()
    .from("health_insurances")
    .insert({ nombre, cobertura_pct })
    .select("id, nombre, cobertura_pct")
    .single();
  if (error) {
    if (error.code === "23505") throw new ApiError(409, "Ya existe una obra social con ese nombre", "DUPLICATE");
    throw new Error(error.message);
  }
  return json(data, 201);
});
