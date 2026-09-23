import { json, parseId, route } from "@/lib/http";
import { getProfessionalRow, toProfessionalDto } from "@/lib/professionals";

/**
 * @openapi
 * /api/professionals/{id}:
 *   get:
 *     tags: [Catálogos]
 *     summary: Detalle de un profesional (incluye su agenda semanal)
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/ProfessionalId'
 *     responses:
 *       200:
 *         description: Profesional
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Professional' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
export const GET = route<{ params: Promise<{ id: string }> }>(async (_req, { params }) => {
  const id = parseId((await params).id);
  return json(toProfessionalDto(await getProfessionalRow(id)));
});
