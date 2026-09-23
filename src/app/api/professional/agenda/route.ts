import { APPOINTMENT_SELECT, autoConfirm, toAppointmentDto, type AppointmentRow } from "@/lib/appointments";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, check, json, route } from "@/lib/http";
import { addDays, isValidIsoDate, todayAR, weekday } from "@/lib/time";

/**
 * @openapi
 * /api/professional/agenda:
 *   get:
 *     tags: [Profesional]
 *     summary: Agenda del profesional autenticado
 *     description: Turnos del día o de la semana (lunes a domingo) que contiene la fecha indicada.
 *     parameters:
 *       - in: query
 *         name: view
 *         schema: { type: string, enum: [day, week], default: day }
 *       - in: query
 *         name: date
 *         description: Fecha de referencia YYYY-MM-DD (por defecto, hoy)
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Agenda
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Agenda' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
export const GET = route(async (req) => {
  const user = await requireUser(req, ["profesional"]);
  const params = new URL(req.url).searchParams;
  const view = params.get("view") === "week" ? "week" : "day";
  const date = params.get("date") ?? todayAR();
  if (!isValidIsoDate(date)) throw new ApiError(400, "Fecha inválida (YYYY-MM-DD)", "VALIDATION_ERROR");

  let desde = date;
  let hasta = date;
  if (view === "week") {
    desde = addDays(date, -((weekday(date) + 6) % 7));
    hasta = addDays(desde, 6);
  }

  await autoConfirm();
  const rows = check(
    await db()
      .from("appointments")
      .select(APPOINTMENT_SELECT)
      .eq("professional_id", user.professionalId ?? -1)
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha")
      .order("hora"),
  ) as AppointmentRow[];

  return json({ view, desde, hasta, turnos: rows.map(toAppointmentDto) });
});
