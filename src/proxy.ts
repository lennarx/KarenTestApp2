import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession, type Role } from "@/lib/auth";

const HOME_BY_ROLE: Record<Role, string> = {
  paciente: "/paciente",
  profesional: "/profesional",
  admin: "/admin",
};

const PROTECTED: { prefix: string; role: Role }[] = [
  { prefix: "/paciente", role: "paciente" },
  { prefix: "/profesional", role: "profesional" },
  { prefix: "/admin", role: "admin" },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/" || pathname === "/login" || pathname === "/registro") {
    if (user) return NextResponse.redirect(new URL(HOME_BY_ROLE[user.role], request.url));
    if (pathname === "/") return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }

  const area = PROTECTED.find((p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`));
  if (area) {
    if (!user) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (user.role !== area.role) {
      return NextResponse.redirect(new URL(HOME_BY_ROLE[user.role], request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/registro", "/paciente/:path*", "/profesional/:path*", "/admin/:path*"],
};
