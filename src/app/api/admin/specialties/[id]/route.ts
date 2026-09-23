import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, check, json, parseId, readBody, route, str } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/**
 * @openapi
 * /api/admin/specialties/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Renombrar especialidad
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string }
 *     responses:
 *       200: { description: Especialidad actualizada }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *   delete:
 *     tags: [Admin]
 *     summary: Eliminar especialidad
 *     description: No se puede eliminar si tiene profesionales asociados.
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Especialidad eliminada }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireUser(req, ["admin"]);
  const id = parseId((await params).id);
  const nombre = str((await readBody(req)).nombre);
  if (nombre.length < 3) throw new ApiError(400, "El nombre debe tener al menos 3 caracteres", "VALIDATION_ERROR");
  const { data, error } = await db().from("specialties").update({ nombre }).eq("id", id).select("id, nombre");
  if (error) {
    if (error.code === "23505") throw new ApiError(409, "Ya existe una especialidad con ese nombre", "DUPLICATE");
    throw new Error(error.message);
  }
  if (!data.length) throw new ApiError(404, "La especialidad no existe", "NOT_FOUND");
  return json(data[0]);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireUser(req, ["admin"]);
  const id = parseId((await params).id);
  const { count } = await db()
    .from("professionals")
    .select("id", { count: "exact", head: true })
    .eq("specialty_id", id);
  if (count) throw new ApiError(409, "La especialidad tiene profesionales asociados", "IN_USE");
  const rows = check(await db().from("specialties").delete().eq("id", id).select("id")) as { id: number }[];
  if (!rows.length) throw new ApiError(404, "La especialidad no existe", "NOT_FOUND");
  return json({ ok: true });
});
