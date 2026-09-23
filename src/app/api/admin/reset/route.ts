import { requireUser } from "@/lib/auth";
import { json, route } from "@/lib/http";
import { runSeed } from "@/lib/seed";

/**
 * @openapi
 * /api/admin/reset:
 *   post:
 *     tags: [Admin]
 *     summary: Restablecer datos de prueba
 *     description: Borra todos los datos y vuelve a cargar el seed inicial (fechas relativas a hoy).
 *     responses:
 *       200: { description: Datos restablecidos }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
export const POST = route(async (req) => {
  await requireUser(req, ["admin"]);
  const result = await runSeed();
  return json({ ok: true, ...result });
});
