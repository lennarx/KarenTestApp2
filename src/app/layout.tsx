import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { Header } from "@/components/Header";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MediTurnos",
  description: "Gestión de turnos médicos",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const user = await verifySession(store.get(SESSION_COOKIE)?.value);
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <Header user={user ? { nombre: user.nombre, role: user.role } : null} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="py-6 text-center text-xs text-slate-400">MediTurnos · Horarios en hora de Argentina (GMT-3)</footer>
      </body>
    </html>
  );
}
