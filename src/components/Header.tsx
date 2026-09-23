"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@/lib/auth";

const NAV: Record<Role, { href: string; label: string; testid: string }[]> = {
  paciente: [
    { href: "/paciente", label: "Reservar turno", testid: "nav-reservar" },
    { href: "/paciente/turnos", label: "Mis turnos", testid: "nav-mis-turnos" },
  ],
  profesional: [{ href: "/profesional", label: "Mi agenda", testid: "nav-agenda" }],
  admin: [
    { href: "/admin", label: "Profesionales", testid: "nav-admin-profesionales" },
    { href: "/admin/especialidades", label: "Especialidades", testid: "nav-admin-especialidades" },
    { href: "/admin/obras-sociales", label: "Obras sociales", testid: "nav-admin-obras-sociales" },
    { href: "/admin/feriados", label: "Feriados", testid: "nav-admin-feriados" },
    { href: "/admin/mantenimiento", label: "Mantenimiento", testid: "nav-admin-mantenimiento" },
  ],
};

export function Header({ user }: { user: { nombre: string; role: Role } | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-brand-700" data-testid="nav-home">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-lg text-white">+</span>
          MediTurnos
        </Link>
        {user && (
          <nav className="flex flex-wrap gap-1 text-sm">
            {NAV[user.role].map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={item.testid}
                  className={`rounded-md px-3 py-1.5 ${active ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Link href="/api-docs" className="text-slate-500 hover:text-slate-700" data-testid="nav-api-docs">
            API
          </Link>
          {user && (
            <>
              <span className="text-slate-600" data-testid="header-user-name">
                {user.nombre} <span className="text-slate-400">· {user.role}</span>
              </span>
              <button onClick={logout} className="btn-secondary py-1.5" data-testid="logout-button">
                Salir
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
