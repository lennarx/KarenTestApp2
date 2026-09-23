import { signSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { ApiError, json, readBody, route, str } from "@/lib/http";
import { findUserByEmail, toSessionUser } from "@/lib/users";

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     description: Valida credenciales, devuelve el JWT y lo guarda en la cookie httpOnly `mt_session`.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: maria.gonzalez@mail.com }
 *               password: { type: string, example: Paciente123! }
 *     responses:
 *       200:
 *         description: Sesión iniciada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Session' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
export const POST = route(async (req) => {
  const body = await readBody(req);
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    throw new ApiError(400, "Email y contraseña son obligatorios", "VALIDATION_ERROR");
  }

  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    throw new ApiError(401, "Email o contraseña incorrectos", "INVALID_CREDENTIALS");
  }

  const session = await toSessionUser(user);
  const token = await signSession(session);
  const res = json({ user: session, token });
  setSessionCookie(res, token);
  return res;
});
