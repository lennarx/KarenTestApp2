"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageTitle, Spinner } from "@/components/ui";
import { api, money } from "@/lib/client";
import type { ProfessionalDto } from "@/lib/professionals";

interface Specialty {
  id: number;
  nombre: string;
}

const EMPTY = { nombre: "", email: "", password: "", specialtyId: "", matricula: "", precioConsulta: "" };

export default function AdminProfesionalesPage() {
  const [items, setItems] = useState<ProfessionalDto[] | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        api<ProfessionalDto[]>("/api/admin/professionals"),
        api<Specialty[]>("/api/specialties"),
      ]);
      setItems(p);
      setSpecialties(s);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const p = await api<ProfessionalDto>("/api/admin/professionals", {
        method: "POST",
        body: JSON.stringify({ ...form, specialtyId: Number(form.specialtyId), precioConsulta: Number(form.precioConsulta) }),
      });
      setNotice(`Profesional ${p.nombre} creado. Definí su agenda para que ofrezca turnos.`);
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(p: ProfessionalDto) {
    setError(null);
    try {
      await api(`/api/admin/professionals/${p.id}`, { method: "PATCH", body: JSON.stringify({ activo: !p.activo }) });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <PageTitle title="Profesionales" subtitle="Alta, modificación y agenda de los profesionales." />
      {notice && <p className="alert-success mb-4" data-testid="admin-aviso">{notice}</p>}
      {error && <p className="alert-error mb-4" data-testid="admin-error">{error}</p>}

      <div className="card mb-6 overflow-x-auto p-0">
        {!items ? (
          <Spinner />
        ) : (
          <table className="data-table" data-testid="admin-profesionales-tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Especialidad</th>
                <th>Matrícula</th>
                <th className="text-right">Consulta</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} data-testid={`admin-profesional-${p.id}`}>
                  <td>
                    <p className="font-medium">{p.nombre}</p>
                    <p className="text-xs text-slate-500">{p.email}</p>
                  </td>
                  <td>{p.especialidad?.nombre}</td>
                  <td>{p.matricula}</td>
                  <td className="text-right tabular-nums">{money(p.precioConsulta)}</td>
                  <td>
                    <span className={p.activo ? "text-emerald-700" : "text-slate-400"}>
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Link
                        href={`/admin/profesionales/${p.id}`}
                        className="btn-secondary px-2.5 py-1 text-xs"
                        data-testid={`admin-profesional-editar-${p.id}`}
                      >
                        Editar / Agenda
                      </Link>
                      <button
                        className={p.activo ? "btn-danger px-2.5 py-1 text-xs" : "btn-secondary px-2.5 py-1 text-xs"}
                        onClick={() => toggleActivo(p)}
                        data-testid={`admin-profesional-toggle-${p.id}`}
                      >
                        {p.activo ? "Dar de baja" : "Reactivar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <form onSubmit={crear} className="card grid gap-4 sm:grid-cols-3" data-testid="admin-profesional-form">
        <h2 className="font-semibold sm:col-span-3">Nuevo profesional</h2>
        <div>
          <label className="label" htmlFor="p-nombre">Nombre</label>
          <input id="p-nombre" className="input" value={form.nombre} onChange={set("nombre")} data-testid="admin-profesional-nombre" />
        </div>
        <div>
          <label className="label" htmlFor="p-email">Email</label>
          <input id="p-email" type="email" className="input" value={form.email} onChange={set("email")} autoComplete="off" data-testid="admin-profesional-email" />
        </div>
        <div>
          <label className="label" htmlFor="p-password">Contraseña inicial</label>
          <input id="p-password" type="password" className="input" value={form.password} onChange={set("password")} autoComplete="new-password" data-testid="admin-profesional-password" />
        </div>
        <div>
          <label className="label" htmlFor="p-especialidad">Especialidad</label>
          <select id="p-especialidad" className="input" value={form.specialtyId} onChange={set("specialtyId")} data-testid="admin-profesional-especialidad">
            <option value="">Elegí…</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="p-matricula">Matrícula</label>
          <input id="p-matricula" className="input" value={form.matricula} onChange={set("matricula")} data-testid="admin-profesional-matricula" />
        </div>
        <div>
          <label className="label" htmlFor="p-precio">Valor de la consulta</label>
          <input id="p-precio" type="number" step="0.01" min="0" className="input" value={form.precioConsulta} onChange={set("precioConsulta")} data-testid="admin-profesional-precio" />
        </div>
        <div className="sm:col-span-3">
          <button type="submit" className="btn-primary" disabled={saving} data-testid="admin-profesional-crear">
            {saving ? "Guardando..." : "Crear profesional"}
          </button>
        </div>
      </form>
    </div>
  );
}
