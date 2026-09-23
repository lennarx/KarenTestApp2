import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, check, json, parseId, readBody, route } from "@/lib/http";
import { getProfessionalRow, toProfessionalDto } from "@/lib/professionals";
import { clearFutureFreeSlots } from "@/lib/slots";
import { timeToMinutes } from "@/lib/time";

type Ctx = { params: Promise<{ id: string }> };
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * @openapi
 * /api/admin/professionals/{id}/schedule:
 *   get:
 *     tags: [Admin]
 *     summary: Agenda semanal del profesional
 *     parameters:
 *       - $ref: '#/components/parameters/ProfessionalId'
 *     responses:
 *       200:
 *         description: Bloques de atención
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/ScheduleBlock' }
 *   put:
 *     tags: [Admin]
 *     summary: Reemplazar la agenda semanal
 *     description: |
 *       Define los días (0 = domingo … 6 = sábado), el horario y la duración de cada turno.
 *       Los horarios futuros ya reservados se conservan; los libres se regeneran con la nueva agenda.
 *     parameters:
 *       - $ref: '#/components/parameters/ProfessionalId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bloques]
 *             properties:
 *               bloques:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/ScheduleBlock' }
 *     responses:
 *       200:
 *         description: Agenda actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/ScheduleBlock' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
export const GET = route<Ctx>(async (req, { params }) => {
  await requireUser(req, ["admin"]);
  const id = parseId((await params).id);
  return json(toProfessionalDto(await getProfessionalRow(id)).agenda);
});

export const PUT = route<Ctx>(async (req, { params }) => {
  await requireUser(req, ["admin"]);
  const id = parseId((await params).id);
  await getProfessionalRow(id);
  const body = await readBody(req);
  if (!Array.isArray(body.bloques)) throw new ApiError(400, "bloques debe ser un arreglo", "VALIDATION_ERROR");

  const bloques = (body.bloques as Record<string, unknown>[]).map((b, i) => {
    const dia = Number(b.diaSemana);
    const desde = String(b.horaDesde ?? "");
    const hasta = String(b.horaHasta ?? "");
    const duracion = Number(b.duracionMin);
    const n = i + 1;
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
      throw new ApiError(400, `Bloque ${n}: diaSemana debe estar entre 0 y 6`, "VALIDATION_ERROR");
    }
    if (!TIME_RE.test(desde) || !TIME_RE.test(hasta)) {
      throw new ApiError(400, `Bloque ${n}: los horarios deben tener formato HH:MM`, "VALIDATION_ERROR");
    }
    if (timeToMinutes(hasta) <= timeToMinutes(desde)) {
      throw new ApiError(400, `Bloque ${n}: horaHasta debe ser posterior a horaDesde`, "VALIDATION_ERROR");
    }
    if (!Number.isInteger(duracion) || duracion < 5 || duracion > 240) {
      throw new ApiError(400, `Bloque ${n}: duracionMin debe estar entre 5 y 240`, "VALIDATION_ERROR");
    }
    if (timeToMinutes(hasta) - timeToMinutes(desde) < duracion) {
      throw new ApiError(400, `Bloque ${n}: el rango horario es menor a la duración del turno`, "VALIDATION_ERROR");
    }
    return { professional_id: id, dia_semana: dia, hora_desde: desde, hora_hasta: hasta, duracion_min: duracion };
  });

  for (const a of bloques) {
    for (const b of bloques) {
      if (a !== b && a.dia_semana === b.dia_semana &&
        timeToMinutes(a.hora_desde) < timeToMinutes(b.hora_hasta) &&
        timeToMinutes(b.hora_desde) < timeToMinutes(a.hora_hasta)) {
        throw new ApiError(400, "Hay bloques superpuestos en el mismo día", "VALIDATION_ERROR");
      }
    }
  }

  check(await db().from("schedules").delete().eq("professional_id", id));
  if (bloques.length) check(await db().from("schedules").insert(bloques));
  await clearFutureFreeSlots(id);

  return json(toProfessionalDto(await getProfessionalRow(id)).agenda);
});
