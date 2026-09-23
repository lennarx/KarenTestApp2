import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, check, json, parseId, route } from "@/lib/http";

/**
 * @openapi
 * /api/admin/holidays/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: Desbloquear un día
 *     description: El día vuelve a ofrecer horarios. Los turnos que se cancelaron por el bloqueo siguen cancelados.
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Feriado eliminado }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
export const DELETE = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireUser(req, ["admin"]);
  const id = parseId((await params).id);
  const rows = check(await db().from("holidays").delete().eq("id", id).select("id")) as { id: number }[];
  if (!rows.length) throw new ApiError(404, "El feriado no existe", "NOT_FOUND");
  return json({ ok: true });
});
