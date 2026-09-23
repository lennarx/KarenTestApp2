import {
  assertActive,
  assertSlotBookable,
  autoConfirm,
  claimSlot,
  getAppointmentRow,
  getSlot,
  pricingFor,
  releaseSlot,
  toAppointmentDto,
} from "@/lib/appointments";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, json, parseId, readBody, route } from "@/lib/http";
import { hoursUntil } from "@/lib/time";

/**
 * @openapi
 * /api/appointments/{id}/reschedule:
 *   post:
 *     tags: [Turnos]
 *     summary: Reprogramar un turno
 *     description: |
 *       Mueve un turno activo propio a otro horario libre del mismo profesional (RN-07).
 *       El horario original se libera, el turno vuelve a PENDIENTE y el copago se recalcula una sola vez
 *       con la cobertura vigente. Aplican las mismas condiciones que para cancelar (24 h antes) y reservar.
 *     parameters:
 *       - $ref: '#/components/parameters/AppointmentId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slotId]
 *             properties:
 *               slotId: { type: integer, example: 140 }
 *     responses:
 *       200:
 *         description: Turno reprogramado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Appointment' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req, ["paciente"]);
  const id = parseId((await params).id);
  const body = await readBody(req);
  await autoConfirm();

  const appt = await getAppointmentRow(id);
  if (appt.patient_id !== user.id) throw new ApiError(403, "No tenés acceso a este turno", "FORBIDDEN");
  assertActive(appt);
  if (hoursUntil(appt.fecha, appt.hora) < 24) {
    throw new ApiError(409, "El turno solo puede reprogramarse hasta 24 horas antes de su horario", "RESCHEDULE_WINDOW_CLOSED");
  }

  const slot = await getSlot(body.slotId);
  if (slot.id === appt.slot_id) {
    throw new ApiError(422, "Elegí un horario distinto al actual", "SAME_SLOT");
  }
  if (slot.professional_id !== appt.professional_id) {
    throw new ApiError(422, "Solo se puede reprogramar con el mismo profesional", "DIFFERENT_PROFESSIONAL");
  }
  await assertSlotBookable(slot);

  if (!(await claimSlot(slot.id))) {
    throw new ApiError(409, "El horario ya fue reservado por otro paciente", "SLOT_TAKEN");
  }

  const pricing = await pricingFor(user.id, appt.professional_id);
  const { error } = await db()
    .from("appointments")
    .update({
      slot_id: slot.id,
      fecha: slot.fecha,
      hora: slot.hora,
      estado: "PENDIENTE",
      ...pricing,
      reprogramaciones: appt.reprogramaciones + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", appt.id);
  if (error) {
    await releaseSlot(slot.id);
    throw new Error(error.message);
  }

  await autoConfirm();
  return json(toAppointmentDto(await getAppointmentRow(appt.id)));
});
