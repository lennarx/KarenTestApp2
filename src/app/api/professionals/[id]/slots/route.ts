import { ApiError, json, parseId, route } from "@/lib/http";
import { getProfessionalRow } from "@/lib/professionals";
import { listFreeSlots } from "@/lib/slots";
import { MAX_DAYS_AHEAD, addDays, isValidIsoDate, shortTime, todayAR } from "@/lib/time";

/**
 * @openapi
 * /api/professionals/{id}/slots:
 *   get:
 *     tags: [Catálogos]
 *     summary: Horarios disponibles de un profesional
 *     description: |
 *       Devuelve los horarios libres de una fecha. Solo se ofrecen fechas entre hoy y hoy + 60 días (RN-11)
 *       y no se ofrecen horarios en días bloqueados como feriado (RN-09).
 *     security: []
 *     parameters:
 *       - $ref: '#/components/parameters/ProfessionalId'
 *       - in: query
 *         name: date
 *         required: true
 *         description: Fecha en formato YYYY-MM-DD
 *         schema: { type: string, format: date, example: '2026-10-01' }
 *     responses:
 *       200:
 *         description: Horarios libres
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Slot' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
export const GET = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const id = parseId((await params).id);
  const date = new URL(req.url).searchParams.get("date");
  if (!isValidIsoDate(date)) {
    throw new ApiError(400, "El parámetro date es obligatorio (YYYY-MM-DD)", "VALIDATION_ERROR");
  }
  const prof = await getProfessionalRow(id);
  const today = todayAR();
  if (!prof.activo || date < today || date > addDays(today, MAX_DAYS_AHEAD)) return json([]);

  const slots = await listFreeSlots(id, date);
  return json(slots.map((s) => ({ id: s.id, professionalId: s.professional_id, fecha: s.fecha, hora: shortTime(s.hora) })));
});
