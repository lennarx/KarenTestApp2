"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";
import { api } from "@/lib/client";

interface ObraSocial {
  id: number;
  nombre: string;
  cobertura_pct: number;
}

const hoyAR = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

const schema = z.object({
  nombre: z.string().trim().min(2, "Ingresá tu nombre y apellido"),
  dni: z.string().trim().regex(/^\d{7,8}$/, "El DNI debe tener 7 u 8 dígitos, sin puntos"),
  email: z.string().trim().email("Ingresá un email válido"),
  fechaNacimiento: z
    .string()
    .min(1, "Ingresá tu fecha de nacimiento")
    .refine((v) => v <= hoyAR(), "La fecha de nacimiento no puede ser futura"),
  obraSocialId: z.string(),
  nroAfiliado: z.string().trim(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

type Form = z.infer<typeof schema>;
const EMPTY: Form = {
  nombre: "",
  dni: "",
  email: "",
  fechaNacimiento: "",
  obraSocialId: "",
  nroAfiliado: "",
  password: "",
};

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [obras, setObras] = useState<ObraSocial[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api<ObraSocial[]>("/api/health-insurances")
      .then(setObras)
      .catch(() => setObras([]));
  }, []);

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof Form, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Form;
        errs[key] ??= issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...parsed.data,
          obraSocialId: parsed.data.obraSocialId ? Number(parsed.data.obraSocialId) : null,
        }),
      });
      router.push("/paciente");
      router.refresh();
    } catch (err) {
      setServerError((err as Error).message);
      setLoading(false);
    }
  }

  const field = (key: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={key} className="label">{label}</label>
      <input
        id={key}
        className="input"
        value={form[key]}
        onChange={set(key)}
        data-testid={`registro-${key}`}
        {...props}
      />
      {errors[key] && (
        <p className="field-error" data-testid={`registro-error-${key}`}>
          {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-2xl font-semibold">Crear cuenta</h1>
      <p className="mb-6 text-sm text-slate-500">Registrate como paciente para reservar turnos.</p>
      <form onSubmit={onSubmit} className="card grid gap-4 sm:grid-cols-2" data-testid="registro-form" noValidate>
        <div className="sm:col-span-2">{field("nombre", "Nombre y apellido", { autoComplete: "name" })}</div>
        {field("dni", "DNI", { inputMode: "numeric", placeholder: "Sin puntos" })}
        {field("fechaNacimiento", "Fecha de nacimiento", { type: "date", max: hoyAR() })}
        <div className="sm:col-span-2">{field("email", "Email", { type: "email", autoComplete: "email" })}</div>
        <div>
          <label htmlFor="obraSocialId" className="label">Obra social</label>
          <select
            id="obraSocialId"
            className="input"
            value={form.obraSocialId}
            onChange={set("obraSocialId")}
            data-testid="registro-obraSocialId"
          >
            <option value="">Sin obra social (particular)</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre} ({o.cobertura_pct}%)
              </option>
            ))}
          </select>
        </div>
        {field("nroAfiliado", "N° de afiliado (opcional)", { disabled: !form.obraSocialId })}
        <div className="sm:col-span-2">
          {field("password", "Contraseña", { type: "password", autoComplete: "new-password" })}
        </div>
        {serverError && (
          <p className="alert-error sm:col-span-2" data-testid="registro-server-error">
            {serverError}
          </p>
        )}
        <button type="submit" className="btn-primary sm:col-span-2" disabled={loading} data-testid="registro-submit">
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
        <p className="text-center text-sm text-slate-500 sm:col-span-2">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline" data-testid="link-login">
            Ingresá
          </Link>
        </p>
      </form>
    </div>
  );
}
