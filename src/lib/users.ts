import { db } from "./db";
import { check } from "./http";
import type { Role, SessionUser } from "./auth";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  nombre: string;
  dni: string | null;
  fecha_nacimiento: string | null;
  health_insurance_id: number | null;
  nro_afiliado: string | null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const rows = check(await db().from("users").select("*").eq("email", email).limit(1)) as UserRow[];
  return rows[0] ?? null;
}

export async function toSessionUser(user: UserRow): Promise<SessionUser> {
  let professionalId: number | undefined;
  if (user.role === "profesional") {
    const prof = check(
      await db().from("professionals").select("id").eq("user_id", user.id).maybeSingle(),
    ) as { id: number } | null;
    professionalId = prof?.id;
  }
  return { id: user.id, email: user.email, nombre: user.nombre, role: user.role, professionalId };
}

export async function getProfile(userId: string) {
  const row = check(
    await db()
      .from("users")
      .select("id, email, role, nombre, dni, fecha_nacimiento, nro_afiliado, health_insurances(id, nombre, cobertura_pct)")
      .eq("id", userId)
      .maybeSingle(),
  ) as
    | (Omit<UserRow, "password_hash" | "health_insurance_id"> & {
        health_insurances: { id: number; nombre: string; cobertura_pct: number } | null;
      })
    | null;
  if (!row) return null;
  const { health_insurances, ...rest } = row;
  return { ...rest, obraSocial: health_insurances };
}
