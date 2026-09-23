import { hashPassword, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, check, json, readBody, route, str } from "@/lib/http";
import { PROFESSIONAL_SELECT, getProfessionalRow, toProfessionalDto, type ProfessionalRow } from "@/lib/professionals";
import { findUserByEmail } from "@/lib/users";
import { parsePrecio } from "@/lib/validation";

/**
 * @openapi
 * /api/admin/professionals:
 *   get:
 *     tags: [Admin]
 *     summary: Todos los profesionales (activos e inactivos)
 *     responses:
 *       200:
 *         description: Profesionales
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Professional' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *   post:
 *     tags: [Admin]
 *     summary: Alta de profesional
 *     description: Crea el usuario (rol profesional) y su ficha. La agenda se define después.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, email, password, specialtyId, matricula, precioConsulta]
 *             properties:
 *               nombre: { type: string, example: Dra. Ana Torres }
 *               email: { type: string, example: ana.torres@mediturnos.com }
 *               password: { type: string, example: Medico123! }
 *               specialtyId: { type: integer, example: 1 }
 *               matricula: { type: string, example: MN 120001 }
 *               precioConsulta: { type: number, example: 20000 }
 *     responses:
 *       201:
 *         description: Profesional creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Professional' }
 *       400: { $ref: '#/components/responses/BadRequest' }
 *       409: { $ref: '#/components/responses/Conflict' }
 */
export const GET = route(async (req) => {
  await requireUser(req, ["admin"]);
  const rows = check(await db().from("professionals").select(PROFESSIONAL_SELECT).order("id")) as ProfessionalRow[];
  return json(rows.map(toProfessionalDto));
});

export const POST = route(async (req) => {
  await requireUser(req, ["admin"]);
  const body = await readBody(req);
  const nombre = str(body.nombre);
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const matricula = str(body.matricula);
  const specialtyId = Number(body.specialtyId);

  if (!nombre || !email || !matricula) {
    throw new ApiError(400, "Nombre, email y matrícula son obligatorios", "VALIDATION_ERROR");
  }
  if (password.length < 8) throw new ApiError(400, "La contraseña debe tener al menos 8 caracteres", "VALIDATION_ERROR");
  const precio_consulta = parsePrecio(body.precioConsulta);
  const spec = check(await db().from("specialties").select("id").eq("id", specialtyId).maybeSingle());
  if (!spec) throw new ApiError(400, "La especialidad no existe", "VALIDATION_ERROR");
  if (await findUserByEmail(email)) throw new ApiError(409, "Ya existe un usuario con ese email", "EMAIL_TAKEN");

  const user = check(
    await db()
      .from("users")
      .insert({ email, nombre, role: "profesional", password_hash: await hashPassword(password) })
      .select("id")
      .single(),
  ) as { id: string };
  const prof = check(
    await db()
      .from("professionals")
      .insert({ user_id: user.id, specialty_id: specialtyId, matricula, precio_consulta })
      .select("id")
      .single(),
  ) as { id: number };

  return json(toProfessionalDto(await getProfessionalRow(prof.id)), 201);
});
