import { db } from "@/lib/db";
import { check, json, route } from "@/lib/http";

/**
 * @openapi
 * /api/specialties:
 *   get:
 *     tags: [Catálogos]
 *     summary: Especialidades
 *     security: []
 *     responses:
 *       200:
 *         description: Especialidades
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Specialty' }
 */
export const GET = route(async () => {
  return json(check(await db().from("specialties").select("id, nombre").order("nombre")));
});
