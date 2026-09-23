"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import { formatDate, todayAR } from "@/lib/time";

interface Holiday {
  id: number;
  fecha: string;
  descripcion: string;
}

export default function AdminFeriadosPage() {
  const [items, setItems] = useState<Holiday[] | null>(null);
  const [form, setForm] = useState({ fecha: "", descripcion: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api<Holiday[]>("/api/holidays"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const res = await api<{ turnosCancelados: number }>("/api/admin/holidays", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setNotice(`Día bloqueado. Turnos cancelados: ${res.turnosCancelados}.`);
      setForm({ fecha: "", descripcion: "" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function eliminar(id: number) {
    setError(null);
    setNotice(null);
    try {
      await api(`/api/admin/holidays/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageTitle
        title="Feriados y días sin atención"
        subtitle="Al bloquear un día se cancelan sus turnos activos y deja de ofrecer horarios (RN-09)."
      />
      {notice && <p className="alert-success mb-4" data-testid="admin-aviso">{notice}</p>}
      {error && <p className="alert-error mb-4" data-testid="admin-error">{error}</p>}
      <form onSubmit={crear} className="card mb-6 flex flex-wrap items-end gap-3" data-testid="admin-feriado-form">
        <div>
          <label className="label" htmlFor="f-fecha">Fecha</label>
          <input id="f-fecha" type="date" min={todayAR()} className="input" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} data-testid="admin-feriado-fecha" />
        </div>
        <div className="flex-1">
          <label className="label" htmlFor="f-descripcion">Descripción</label>
          <input id="f-descripcion" className="input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} data-testid="admin-feriado-descripcion" />
        </div>
        <button className="btn-primary" type="submit" data-testid="admin-feriado-crear">Bloquear día</button>
      </form>
      <div className="card p-0">
        {!items ? (
          <Spinner />
        ) : items.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No hay días bloqueados.</p>
        ) : (
          <table className="data-table" data-testid="admin-feriados-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.id} data-testid={`admin-feriado-${h.id}`}>
                  <td>{formatDate(h.fecha)}</td>
                  <td>{h.descripcion}</td>
                  <td className="text-right">
                    <ConfirmButton label="Desbloquear" testid={`admin-feriado-eliminar-${h.id}`} onConfirm={() => eliminar(h.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
