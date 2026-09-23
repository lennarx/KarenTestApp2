import { assertActive, autoConfirm, getAppointmentRow, releaseSlot, toAppointmentDto } from "@/lib/appointments";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, check, json, parseId, route } from "@/lib/http";
import { hoursUntil } from "@/lib/time";

const MIN_HOURS_TO_CANCEL = 24;

/**
 * @openapi
 * /api/appointments/{id}/cancel:
 *   post:
 *     tags: [Turnos]
 *     summary: Cancelar un turno
 *     description: |
 *       El paciente puede cancelar un turno propio activo hasta 24 horas antes inclusive, en hora de Argentina (RN-01).
 *       Con menos de 24 horas la cancelación se rechaza. Al cancelar, el horario vuelve a estar disponible.
 *     parameters:
 *       - $ref: '#/components/parameters/AppointmentId'
 *     responses:
 *       200:
 *         description: Turno cancelado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Appointment' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req, ["paciente"]);
  const id = parseId((await params).id);
  await autoConfirm();

  const appt = await getAppointmentRow(id);
  if (appt.patient_id !== user.id) throw new ApiError(403, "No tenés acceso a este turno", "FORBIDDEN");
  assertActive(appt);

  if (hoursUntil(appt.fecha, appt.hora) < MIN_HOURS_TO_CANCEL) {
    throw new ApiError(
      409,
      "El turno solo puede cancelarse hasta 24 horas antes de su horario",
      "CANCELLATION_WINDOW_CLOSED",
    );
  }

  const now = new Date().toISOString();
  check(
    await db()
      .from("appointments")
      .update({
        estado: "CANCELADO",
        cancelled_at: now,
        updated_at: now,
        motivo_cancelacion: "Cancelado por el paciente",
      })
      .eq("id", appt.id),
  );
  await releaseSlot(appt.slot_id);

  return json(toAppointmentDto(await getAppointmentRow(appt.id)));
});
