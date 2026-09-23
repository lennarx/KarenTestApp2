import { db } from "@/lib/db";
import { check, json, route } from "@/lib/http";

/**
 * @openapi
 * /api/holidays:
 *   get:
 *     tags: [Catálogos]
 *     summary: Feriados y días sin atención
 *     security: []
 *     responses:
 *       200:
 *         description: Feriados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Holiday' }
 */
export const GET = route(async () => {
  return json(check(await db().from("holidays").select("id, fecha, descripcion").order("fecha")));
});
