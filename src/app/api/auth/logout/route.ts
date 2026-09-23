import { clearSessionCookie } from "@/lib/auth";
import { json, route } from "@/lib/http";

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cerrar sesión
 *     security: []
 *     responses:
 *       200: { description: Sesión cerrada }
 */
export const POST = route(async () => {
  const res = json({ ok: true });
  clearSessionCookie(res);
  return res;
});
