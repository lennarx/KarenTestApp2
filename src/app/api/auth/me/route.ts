import { requireUser } from "@/lib/auth";
import { ApiError, json, route } from "@/lib/http";
import { getProfile } from "@/lib/users";

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Usuario autenticado
 *     responses:
 *       200:
 *         description: Perfil del usuario logueado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Profile' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
export const GET = route(async (req) => {
  const user = await requireUser(req);
  const profile = await getProfile(user.id);
  if (!profile) throw new ApiError(401, "Sesión inválida o expirada", "UNAUTHORIZED");
  return json({ ...profile, professionalId: user.professionalId ?? null });
});
