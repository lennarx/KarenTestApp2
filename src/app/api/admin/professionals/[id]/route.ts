import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, check, json, parseId, readBody, route, str } from "@/lib/http";
import { getProfessionalRow, toProfessionalDto } from "@/lib/professionals";
import { parsePrecio } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/**
 * @openapi
 * /api/admin/professionals/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Modificar profesional
 *     description: El cambio de precio aplica a las nuevas reservas y reprogramaciones.
 *     parameters:
 *       - $ref: '#/components/parameters/ProfessionalId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre: { type: string }
 *               specialtyId: { type: integer }
 *               matricula: { type: string }
 *               precioConsulta: { type: number }
 *               activo: { type: boolean }
 *     responses:
 *       200:
 *         description: Profesional actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Professional' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     tags: [Admin]
 *     summary: Baja lógica de profesional
 *     description: El profesional queda inactivo y deja de ofrecer horarios. Sus turnos existentes no se modifican.
 *     parameters:
 *       - $ref: '#/components/parameters/ProfessionalId'
 *     responses:
 *       200: { description: Profesional desactivado }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
export const PATCH = route<Ctx>(async (req, { params }) => {
  await requireUser(req, ["admin"]);
  const id = parseId((await params).id);
  const prof = await getProfessionalRow(id);
  const body = await readBody(req);

  const patch: Record<string, unknown> = {};
  if (body.specialtyId !== undefined) {
    const spec = check(await db().from("specialties").select("id").eq("id", Number(body.specialtyId)).maybeSingle());
    if (!spec) throw new ApiError(400, "La especialidad no existe", "VALIDATION_ERROR");
    patch.specialty_id = Number(body.specialtyId);
  }
  if (body.matricula !== undefined) {
    if (!str(body.matricula)) throw new ApiError(400, "La matrícula es obligatoria", "VALIDATION_ERROR");
    patch.matricula = str(body.matricula);
  }
  if (body.precioConsulta !== undefined) patch.precio_consulta = parsePrecio(body.precioConsulta);
  if (body.activo !== undefined) patch.activo = Boolean(body.activo);

  if (Object.keys(patch).length) check(await db().from("professionals").update(patch).eq("id", id));
  if (body.nombre !== undefined) {
    if (!str(body.nombre)) throw new ApiError(400, "El nombre es obligatorio", "VALIDATION_ERROR");
    check(await db().from("users").update({ nombre: str(body.nombre) }).eq("id", prof.users?.id ?? ""));
  }
  return json(toProfessionalDto(await getProfessionalRow(id)));
});

export const DELETE = route<Ctx>(async (req, { params }) => {
  await requireUser(req, ["admin"]);
  const id = parseId((await params).id);
  await getProfessionalRow(id);
  check(await db().from("professionals").update({ activo: false }).eq("id", id));
  return json({ ok: true });
});
