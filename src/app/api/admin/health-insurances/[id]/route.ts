import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, check, json, parseId, readBody, route, str } from "@/lib/http";
import { parseCobertura } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/**
 * @openapi
 * /api/admin/health-insurances/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Modificar obra social
 *     description: El cambio de cobertura aplica a las nuevas reservas y reprogramaciones.
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
 *               coberturaPct: { type: number, minimum: 0, maximum: 100 }
 *     responses:
 *       200: { description: Obra social actualizada }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Admin]
 *     summary: Eliminar obra social
 *     description: Los pacientes afiliados pasan a ser particulares (sin cobertura).
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Obra social eliminada }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireUser(req, ["admin"]);
  const id = parseId((await params).id);
  const body = await readBody(req);
  const patch: Record<string, unknown> = {};
  if (body.nombre !== undefined) {
    const nombre = str(body.nombre);
    if (nombre.length < 2) throw new ApiError(400, "El nombre es obligatorio", "VALIDATION_ERROR");
    patch.nombre = nombre;
  }
  if (body.coberturaPct !== undefined) patch.cobertura_pct = parseCobertura(body.coberturaPct);
  if (!Object.keys(patch).length) throw new ApiError(400, "No hay cambios para aplicar", "VALIDATION_ERROR");

  const { data, error } = await db()
    .from("health_insurances")
    .update(patch)
    .eq("id", id)
    .select("id, nombre, cobertura_pct");
  if (error) {
    if (error.code === "23505") throw new ApiError(409, "Ya existe una obra social con ese nombre", "DUPLICATE");
    throw new Error(error.message);
  }
  if (!data.length) throw new ApiError(404, "La obra social no existe", "NOT_FOUND");
  return json(data[0]);
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireUser(req, ["admin"]);
  const id = parseId((await params).id);
  check(await db().from("users").update({ nro_afiliado: null }).eq("health_insurance_id", id));
  const rows = check(await db().from("health_insurances").delete().eq("id", id).select("id")) as { id: number }[];
  if (!rows.length) throw new ApiError(404, "La obra social no existe", "NOT_FOUND");
  return json({ ok: true });
});
