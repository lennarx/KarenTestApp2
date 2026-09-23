import { hashPassword, setSessionCookie, signSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, check, json, readBody, route, str } from "@/lib/http";
import { isValidIsoDate } from "@/lib/time";
import { findUserByEmail, toSessionUser, type UserRow } from "@/lib/users";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registro de paciente
 *     description: |
 *       Crea una cuenta con rol paciente e inicia sesión.
 *       Reglas (RN-08): DNI de 7 u 8 dígitos numéricos, fecha de nacimiento no futura,
 *       email único sin distinguir mayúsculas/minúsculas. La contraseña debe tener al menos 8 caracteres.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterRequest' }
 *     responses:
 *       201:
 *         description: Paciente registrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Session' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       409:
 *         description: El email ya está registrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
export const POST = route(async (req) => {
  const body = await readBody(req);
  const nombre = str(body.nombre);
  const dni = str(body.dni);
  const email = str(body.email).toLowerCase();
  const fechaNacimiento = str(body.fechaNacimiento);
  const password = typeof body.password === "string" ? body.password : "";
  const nroAfiliado = str(body.nroAfiliado) || null;
  const obraSocialId =
    body.obraSocialId === null || body.obraSocialId === undefined || body.obraSocialId === ""
      ? null
      : Number(body.obraSocialId);

  if (!nombre || !dni || !email || !fechaNacimiento || !password) {
    throw new ApiError(400, "Nombre, DNI, email, fecha de nacimiento y contraseña son obligatorios", "VALIDATION_ERROR");
  }
  if (!EMAIL_RE.test(email)) {
    throw new ApiError(400, "El email no tiene un formato válido", "VALIDATION_ERROR");
  }
  if (!isValidIsoDate(fechaNacimiento)) {
    throw new ApiError(400, "La fecha de nacimiento debe tener formato YYYY-MM-DD", "VALIDATION_ERROR");
  }
  if (password.length < 8) {
    throw new ApiError(400, "La contraseña debe tener al menos 8 caracteres", "VALIDATION_ERROR");
  }
  if (obraSocialId !== null) {
    if (!Number.isInteger(obraSocialId)) {
      throw new ApiError(400, "Obra social inválida", "VALIDATION_ERROR");
    }
    const os = check(await db().from("health_insurances").select("id").eq("id", obraSocialId).maybeSingle());
    if (!os) throw new ApiError(400, "La obra social no existe", "VALIDATION_ERROR");
  }

  if (await findUserByEmail(email)) {
    throw new ApiError(409, "Ya existe una cuenta con ese email", "EMAIL_TAKEN");
  }

  const { data, error } = await db()
    .from("users")
    .insert({
      email,
      password_hash: await hashPassword(password),
      role: "paciente",
      nombre,
      dni,
      fecha_nacimiento: fechaNacimiento,
      health_insurance_id: obraSocialId,
      nro_afiliado: obraSocialId ? nroAfiliado : null,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new ApiError(409, "Ya existe una cuenta con ese email", "EMAIL_TAKEN");
    throw new Error(error.message);
  }

  const session = await toSessionUser(data as UserRow);
  const token = await signSession(session);
  const res = json({ user: session, token }, 201);
  setSessionCookie(res, token);
  return res;
});
