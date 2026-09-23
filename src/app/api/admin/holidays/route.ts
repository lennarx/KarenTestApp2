import { ACTIVE_STATES } from "@/lib/appointments";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, check, json, readBody, route, str } from "@/lib/http";
import { isValidIsoDate, todayAR } from "@/lib/time";

/**
 * @openapi
 * /api/admin/holidays:
 *   post:
 *     tags: [Admin]
 *     summary: Bloquear un día (feriado)
 *     description: |
 *       Bloquea la fecha para todos los profesionales (RN-09). Los turnos activos de ese día pasan a CANCELADO
 *       y el día deja de ofrecer horarios, tanto en la web como en la API.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fecha, descripcion]
 *             properties:
 *               fecha: { type: string, format: date, example: '2026-10-12' }
 *               descripcion: { type: string, example: Día del Respeto a la Diversidad Cultural }
 *     responses:
 *       201:
 *         description: Feriado creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 feriado: { $ref: '#/components/schemas/Holiday' }
 *                 turnosCancelados: { type: integer }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 */
export const POST = route(async (req) => {
  await requireUser(req, ["admin"]);
  const body = await readBody(req);
  const fecha = str(body.fecha);
  const descripcion = str(body.descripcion);
  if (!isValidIsoDate(fecha)) throw new ApiError(400, "La fecha debe tener formato YYYY-MM-DD", "VALIDATION_ERROR");
  if (!descripcion) throw new ApiError(400, "La descripción es obligatoria", "VALIDATION_ERROR");
  if (fecha < todayAR()) throw new ApiError(422, "No se pueden bloquear fechas pasadas", "PAST_DATE");

  const { data: feriado, error } = await db()
    .from("holidays")
    .insert({ fecha, descripcion })
    .select("id, fecha, descripcion")
    .single();
  if (error) {
    if (error.code === "23505") throw new ApiError(409, "La fecha ya está bloqueada", "DUPLICATE");
    throw new Error(error.message);
  }

  const now = new Date().toISOString();
  const cancelados = check(
    await db()
      .from("appointments")
      .update({
        estado: "CANCELADO",
        cancelled_at: now,
        updated_at: now,
        motivo_cancelacion: `Día sin atención: ${descripcion}`,
      })
      .eq("fecha", fecha)
      .in("estado", ACTIVE_STATES)
      .select("id, slot_id"),
  ) as { id: number; slot_id: number | null }[];

  check(await db().from("slots").delete().eq("fecha", fecha).eq("is_booked", false));
  const slotIds = cancelados.map((c) => c.slot_id).filter((id): id is number => id !== null);
  if (slotIds.length) check(await db().from("slots").update({ is_booked: false }).in("id", slotIds));

  return json({ feriado, turnosCancelados: cancelados.length }, 201);
});
