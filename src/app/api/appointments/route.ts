import {
  APPOINTMENT_SELECT,
  MAX_ACTIVE_APPOINTMENTS,
  PAGE_SIZE,
  assertSlotBookable,
  autoConfirm,
  countActiveAppointments,
  getSlot,
  pricingFor,
  toAppointmentDto,
  type AppointmentRow,
} from "@/lib/appointments";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, check, json, readBody, route } from "@/lib/http";

/**
 * @openapi
 * /api/appointments:
 *   get:
 *     tags: [Turnos]
 *     summary: Historial de turnos del paciente
 *     description: |
 *       Devuelve los turnos del paciente autenticado, ordenados por fecha y hora de forma descendente
 *       y paginados de a 10 (RN-10).
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *     responses:
 *       200:
 *         description: Página del historial
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AppointmentPage' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   post:
 *     tags: [Turnos]
 *     summary: Reservar un turno
 *     description: |
 *       Reserva el slot indicado para el paciente autenticado. El turno queda PENDIENTE y el copago se calcula
 *       según la cobertura de la obra social del paciente (RN-06).
 *       Reglas: máximo 3 turnos activos (RN-02), un slot solo puede tener un turno activo (RN-03),
 *       no se reserva en el pasado ni a más de 60 días (RN-11), ni en feriados (RN-09).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slotId]
 *             properties:
 *               slotId: { type: integer, example: 120 }
 *     responses:
 *       201:
 *         description: Turno reservado
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
export const GET = route(async (req) => {
  const user = await requireUser(req, ["paciente"]);
  await autoConfirm();

  const pageParam = Number(new URL(req.url).searchParams.get("page") ?? "1");
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const rows = check(
    await db().from("appointments").select(APPOINTMENT_SELECT).eq("patient_id", user.id),
  ) as AppointmentRow[];

  const sorted = rows
    .map(toAppointmentDto)
    .sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));

  const total = sorted.length;
  const lastIndex = page * PAGE_SIZE - 1;
  const firstIndex = Math.max(0, lastIndex - PAGE_SIZE);
  const items = sorted.slice(firstIndex, firstIndex + PAGE_SIZE);

  return json({
    items,
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
});

export const POST = route(async (req) => {
  const user = await requireUser(req, ["paciente"]);
  const body = await readBody(req);
  await autoConfirm();

  const slot = await getSlot(body.slotId);
  await assertSlotBookable(slot);
  if (slot.is_booked) {
    throw new ApiError(409, "El horario ya fue reservado por otro paciente", "SLOT_TAKEN");
  }

  if ((await countActiveAppointments(user.id)) >= MAX_ACTIVE_APPOINTMENTS) {
    throw new ApiError(
      409,
      `Ya tenés ${MAX_ACTIVE_APPOINTMENTS} turnos activos. Cancelá uno para reservar otro.`,
      "MAX_ACTIVE_REACHED",
    );
  }

  const pricing = await pricingFor(user.id, slot.professional_id);
  const { data, error } = await db()
    .from("appointments")
    .insert({
      patient_id: user.id,
      professional_id: slot.professional_id,
      slot_id: slot.id,
      fecha: slot.fecha,
      hora: slot.hora,
      estado: "PENDIENTE",
      ...pricing,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  check(await db().from("slots").update({ is_booked: true }).eq("id", slot.id));

  await autoConfirm();
  const row = check(
    await db().from("appointments").select(APPOINTMENT_SELECT).eq("id", data.id).single(),
  ) as AppointmentRow;
  return json(toAppointmentDto(row), 201);
});
