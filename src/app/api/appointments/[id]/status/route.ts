import { assertActive, autoConfirm, getAppointmentRow, toAppointmentDto } from "@/lib/appointments";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, check, json, parseId, readBody, route, str } from "@/lib/http";
import { todayAR } from "@/lib/time";

const ALLOWED = ["CONFIRMADO", "ATENDIDO", "AUSENTE"] as const;
type NuevoEstado = (typeof ALLOWED)[number];

/**
 * @openapi
 * /api/appointments/{id}/status:
 *   patch:
 *     tags: [Turnos]
 *     summary: Cambiar el estado de un turno
 *     description: |
 *       Solo el profesional del turno puede cambiar su estado (RN-05).
 *       - CONFIRMADO: confirmación manual de un turno PENDIENTE.
 *       - ATENDIDO / AUSENTE: solo si la fecha del turno ya pasó o es hoy.
 *     parameters:
 *       - $ref: '#/components/parameters/AppointmentId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado: { type: string, enum: [CONFIRMADO, ATENDIDO, AUSENTE] }
 *     responses:
 *       200:
 *         description: Estado actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Appointment' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const user = await requireUser(req);
  const id = parseId((await params).id);
  const body = await readBody(req);
  const estado = str(body.estado).toUpperCase() as NuevoEstado;
  if (!ALLOWED.includes(estado)) {
    throw new ApiError(400, "Estado inválido. Valores permitidos: CONFIRMADO, ATENDIDO, AUSENTE", "VALIDATION_ERROR");
  }
  await autoConfirm();

  const appt = await getAppointmentRow(id);
  if (user.role === "profesional" && appt.professional_id !== user.professionalId) {
    throw new ApiError(403, "El turno no pertenece a tu agenda", "FORBIDDEN");
  }
  assertActive(appt);

  if (estado === "CONFIRMADO" && appt.estado !== "PENDIENTE") {
    throw new ApiError(409, "El turno ya está confirmado", "INVALID_STATE");
  }
  if (estado === "AUSENTE" && appt.fecha > todayAR()) {
    throw new ApiError(409, "No se puede registrar la ausencia de un turno futuro", "FUTURE_APPOINTMENT");
  }

  check(
    await db()
      .from("appointments")
      .update({ estado, updated_at: new Date().toISOString() })
      .eq("id", appt.id),
  );
  return json(toAppointmentDto(await getAppointmentRow(appt.id)));
});
