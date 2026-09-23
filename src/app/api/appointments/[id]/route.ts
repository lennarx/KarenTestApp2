import { autoConfirm, getAppointmentRow, toAppointmentDto } from "@/lib/appointments";
import { requireUser } from "@/lib/auth";
import { json, parseId, route } from "@/lib/http";

/**
 * @openapi
 * /api/appointments/{id}:
 *   get:
 *     tags: [Turnos]
 *     summary: Detalle de un turno
 *     description: |
 *       Un paciente solo puede ver sus propios turnos (RN-04). Un profesional solo ve los turnos de su agenda.
 *       El administrador puede ver cualquiera.
 *     parameters:
 *       - $ref: '#/components/parameters/AppointmentId'
 *     responses:
 *       200:
 *         description: Turno
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Appointment' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
export const GET = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  await requireUser(req);
  const id = parseId((await params).id);
  await autoConfirm();
  const row = await getAppointmentRow(id);
  return json(toAppointmentDto(row));
});
