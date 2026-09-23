import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";
import { ApiError } from "./http";

export type Role = "paciente" | "profesional" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  nombre: string;
  role: Role;
  professionalId?: number;
}

export const SESSION_COOKIE = "mt_session";
const SESSION_HOURS = 8;

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("Falta JWT_SECRET");
  return new TextEncoder().encode(value);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    nombre: user.nombre,
    role: user.role,
    ...(user.professionalId ? { professionalId: user.professionalId } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: String(payload.sub),
      email: String(payload.email),
      nombre: String(payload.nombre),
      role: payload.role as Role,
      professionalId: typeof payload.professionalId === "number" ? payload.professionalId : undefined,
    };
  } catch {
    return null;
  }
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** Obtiene el usuario de la cookie de sesión o del header Authorization: Bearer. */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const auth = req.headers.get("authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : undefined;
  return verifySession(bearer ?? readCookie(req.headers.get("cookie"), SESSION_COOKIE));
}

export async function requireUser(req: Request, roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser(req);
  if (!user) throw new ApiError(401, "Sesión inválida o expirada", "UNAUTHORIZED");
  if (roles && !roles.includes(user.role)) {
    throw new ApiError(403, "No tenés permisos para esta operación", "FORBIDDEN");
  }
  return user;
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
