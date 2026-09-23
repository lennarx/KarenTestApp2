"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/client";

const HOME: Record<string, string> = { paciente: "/paciente", profesional: "/profesional", admin: "/admin" };

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await api<{ user: { role: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const next = params.get("next");
      router.push(next && next.startsWith(HOME[user.role]) ? next : HOME[user.role]);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4" data-testid="login-form" noValidate>
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input
          id="email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          data-testid="login-email"
        />
      </div>
      <div>
        <label htmlFor="password" className="label">Contraseña</label>
        <input
          id="password"
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          data-testid="login-password"
        />
      </div>
      {error && <p className="alert-error" data-testid="login-error">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={loading} data-testid="login-submit">
        {loading ? "Ingresando..." : "Ingresar"}
      </button>
      <p className="text-center text-sm text-slate-500">
        ¿No tenés cuenta?{" "}
        <Link href="/registro" className="font-medium text-brand-600 hover:underline" data-testid="link-registro">
          Registrate
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-2xl font-semibold">Ingresar</h1>
      <p className="mb-6 text-sm text-slate-500">Accedé para gestionar tus turnos médicos.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
