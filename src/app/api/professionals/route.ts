import { db } from "@/lib/db";
import { check, json, route } from "@/lib/http";
import { PROFESSIONAL_SELECT, toProfessionalDto, type ProfessionalRow } from "@/lib/professionals";

/**
 * @openapi
 * /api/professionals:
 *   get:
 *     tags: [Catálogos]
 *     summary: Profesionales activos
 *     description: Lista los profesionales activos, opcionalmente filtrados por especialidad.
 *     security: []
 *     parameters:
 *       - in: query
 *         name: specialtyId
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Profesionales
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Professional' }
 */
export const GET = route(async (req) => {
  const specialtyId = Number(new URL(req.url).searchParams.get("specialtyId"));
  let query = db().from("professionals").select(PROFESSIONAL_SELECT).eq("activo", true);
  if (Number.isInteger(specialtyId) && specialtyId > 0) query = query.eq("specialty_id", specialtyId);
  const rows = check(await query.order("id")) as ProfessionalRow[];
  return json(rows.map(toProfessionalDto));
});
