import { db } from "@/lib/db";
import { check, json, route } from "@/lib/http";

/**
 * @openapi
 * /api/health-insurances:
 *   get:
 *     tags: [Catálogos]
 *     summary: Obras sociales
 *     security: []
 *     responses:
 *       200:
 *         description: Listado de obras sociales con su % de cobertura
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/HealthInsurance' }
 */
export const GET = route(async () => {
  const rows = check(await db().from("health_insurances").select("id, nombre, cobertura_pct").order("nombre"));
  return json(rows);
});
