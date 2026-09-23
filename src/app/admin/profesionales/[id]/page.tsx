"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PageTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import type { ProfessionalDto } from "@/lib/professionals";

interface Specialty {
  id: number;
  nombre: string;
}
interface Bloque {
  diaSemana: number;
  horaDesde: string;
  horaHasta: string;
  duracionMin: number;
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function AdminProfesionalPage() {
  const { id } = useParams<{ id: string }>();
  const [prof, setProf] = useState<ProfessionalDto | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [datos, setDatos] = useState({ nombre: "", specialtyId: "", matricula: "", precioConsulta: "" });
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        api<ProfessionalDto>(`/api/professionals/${id}`),
        api<Specialty[]>("/api/specialties"),
      ]);
      setProf(p);
      setSpecialties(s);
      setDatos({
        nombre: p.nombre,
        specialtyId: String(p.especialidad?.id ?? ""),
        matricula: p.matricula,
        precioConsulta: String(p.precioConsulta),
      });
      setBloques(p.agenda.map(({ diaSemana, horaDesde, horaHasta, duracionMin }) => ({ diaSemana, horaDesde, horaHasta, duracionMin })));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function guardarDatos(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await api(`/api/admin/professionals/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nombre: datos.nombre,
          matricula: datos.matricula,
          specialtyId: Number(datos.specialtyId),
          precioConsulta: Number(datos.precioConsulta),
        }),
      });
      setNotice("Datos actualizados.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function guardarAgenda() {
    setError(null);
    setNotice(null);
    try {
      await api(`/api/admin/professionals/${id}/schedule`, { method: "PUT", body: JSON.stringify({ bloques }) });
      setNotice("Agenda actualizada.");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const updateBloque = (i: number, patch: Partial<Bloque>) =>
    setBloques((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)));

  if (!prof) return error ? <p className="alert-error">{error}</p> : <Spinner />;

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-brand-600 hover:underline" data-testid="volver-profesionales">
        ← Volver a profesionales
      </Link>
      <PageTitle title={prof.nombre} subtitle={`${prof.especialidad?.nombre ?? ""} · ${prof.activo ? "Activo" : "Inactivo"}`} />
      {notice && <p className="alert-success" data-testid="admin-aviso">{notice}</p>}
      {error && <p className="alert-error" data-testid="admin-error">{error}</p>}

      <form onSubmit={guardarDatos} className="card grid gap-4 sm:grid-cols-4" data-testid="admin-profesional-datos">
        <h2 className="font-semibold sm:col-span-4">Datos</h2>
        <div>
          <label className="label" htmlFor="d-nombre">Nombre</label>
          <input id="d-nombre" className="input" value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} data-testid="admin-datos-nombre" />
        </div>
        <div>
          <label className="label" htmlFor="d-especialidad">Especialidad</label>
          <select id="d-especialidad" className="input" value={datos.specialtyId} onChange={(e) => setDatos({ ...datos, specialtyId: e.target.value })} data-testid="admin-datos-especialidad">
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="d-matricula">Matrícula</label>
          <input id="d-matricula" className="input" value={datos.matricula} onChange={(e) => setDatos({ ...datos, matricula: e.target.value })} data-testid="admin-datos-matricula" />
        </div>
        <div>
          <label className="label" htmlFor="d-precio">Valor de la consulta</label>
          <input id="d-precio" type="number" step="0.01" className="input" value={datos.precioConsulta} onChange={(e) => setDatos({ ...datos, precioConsulta: e.target.value })} data-testid="admin-datos-precio" />
        </div>
        <div className="sm:col-span-4">
          <button type="submit" className="btn-primary" data-testid="admin-datos-guardar">Guardar datos</button>
        </div>
      </form>

      <div className="card space-y-3" data-testid="admin-agenda">
        <h2 className="font-semibold">Agenda semanal</h2>
        <p className="text-sm text-slate-500">
          Definí los bloques de atención. Los turnos ya reservados se conservan aunque cambie la agenda.
        </p>
        {bloques.length === 0 && <p className="text-sm text-slate-500">Sin bloques: el profesional no ofrece turnos.</p>}
        {bloques.map((b, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3" data-testid={`admin-bloque-${i}`}>
            <div>
              <label className="label">Día</label>
              <select className="input" value={b.diaSemana} onChange={(e) => updateBloque(i, { diaSemana: Number(e.target.value) })} data-testid={`admin-bloque-dia-${i}`}>
                {DIAS.map((d, n) => (
                  <option key={n} value={n}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Desde</label>
              <input type="time" className="input" value={b.horaDesde} onChange={(e) => updateBloque(i, { horaDesde: e.target.value })} data-testid={`admin-bloque-desde-${i}`} />
            </div>
            <div>
              <label className="label">Hasta</label>
              <input type="time" className="input" value={b.horaHasta} onChange={(e) => updateBloque(i, { horaHasta: e.target.value })} data-testid={`admin-bloque-hasta-${i}`} />
            </div>
            <div>
              <label className="label">Duración (min)</label>
              <input type="number" min={5} max={240} className="input w-28" value={b.duracionMin} onChange={(e) => updateBloque(i, { duracionMin: Number(e.target.value) })} data-testid={`admin-bloque-duracion-${i}`} />
            </div>
            <button type="button" className="btn-danger" onClick={() => setBloques((bs) => bs.filter((_, j) => j !== i))} data-testid={`admin-bloque-quitar-${i}`}>
              Quitar
            </button>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setBloques((bs) => [...bs, { diaSemana: 1, horaDesde: "09:00", horaHasta: "13:00", duracionMin: 30 }])}
            data-testid="admin-bloque-agregar"
          >
            Agregar bloque
          </button>
          <button type="button" className="btn-primary" onClick={guardarAgenda} data-testid="admin-agenda-guardar">
            Guardar agenda
          </button>
        </div>
      </div>
    </div>
  );
}
