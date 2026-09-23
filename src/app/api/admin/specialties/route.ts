import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, check, json, readBody, route, str } from "@/lib/http";

/**
 * @openapi
 * /api/admin/specialties:
 *   get:
 *     tags: [Admin]
 *     summary: Especialidades (con cantidad de profesionales)
 *     responses:
 *       200: { description: Especialidades }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   post:
 *     tags: [Admin]
 *     summary: Crear especialidad
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre]
 *             properties:
 *               nombre: { type: string, example: Traumatología }
 *     responses:
 *       201:
 *         description: Especialidad creada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Specialty' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
export const GET = route(async (req) => {
  await requireUser(req, ["admin"]);
  const rows = check(
    await db().from("specialties").select("id, nombre, professionals(count)").order("nombre"),
  ) as { id: number; nombre: string; professionals: { count: number }[] }[];
  return json(rows.map((r) => ({ id: r.id, nombre: r.nombre, profesionales: r.professionals[0]?.count ?? 0 })));
});

export const POST = route(async (req) => {
  await requireUser(req, ["admin"]);
  const nombre = str((await readBody(req)).nombre);
  if (nombre.length < 3) throw new ApiError(400, "El nombre debe tener al menos 3 caracteres", "VALIDATION_ERROR");
  const { data, error } = await db().from("specialties").insert({ nombre }).select("id, nombre").single();
  if (error) {
    if (error.code === "23505") throw new ApiError(409, "Ya existe una especialidad con ese nombre", "DUPLICATE");
    throw new Error(error.message);
  }
  return json(data, 201);
});
