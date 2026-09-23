"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/client";

interface Row {
  id: number;
  nombre: string;
  cobertura_pct: number;
}

export default function AdminObrasSocialesPage() {
  const [items, setItems] = useState<Row[] | null>(null);
  const [form, setForm] = useState({ nombre: "", coberturaPct: "" });
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api<Row[]>("/api/health-insurances"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<unknown>, ok?: string) {
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (ok) setNotice(ok);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageTitle title="Obras sociales" subtitle="El porcentaje de cobertura se aplica al valor de la consulta (RN-06)." />
      {notice && <p className="alert-success mb-4" data-testid="admin-aviso">{notice}</p>}
      {error && <p className="alert-error mb-4" data-testid="admin-error">{error}</p>}
      <form
        className="card mb-6 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await api("/api/admin/health-insurances", {
              method: "POST",
              body: JSON.stringify({ nombre: form.nombre, coberturaPct: form.coberturaPct }),
            });
            setForm({ nombre: "", coberturaPct: "" });
          }, "Obra social creada.");
        }}
        data-testid="admin-obra-social-form"
      >
        <div className="flex-1">
          <label className="label" htmlFor="os-nombre">Nombre</label>
          <input id="os-nombre" className="input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} data-testid="admin-obra-social-nombre" />
        </div>
        <div>
          <label className="label" htmlFor="os-cobertura">Cobertura %</label>
          <input id="os-cobertura" type="number" step="0.01" min="0" max="100" className="input w-32" value={form.coberturaPct} onChange={(e) => setForm({ ...form, coberturaPct: e.target.value })} data-testid="admin-obra-social-cobertura" />
        </div>
        <button className="btn-primary" type="submit" data-testid="admin-obra-social-crear">Agregar</button>
      </form>
      <div className="card p-0">
        {!items ? (
          <Spinner />
        ) : (
          <table className="data-table" data-testid="admin-obras-sociales-tabla">
            <thead>
              <tr>
                <th>Obra social</th>
                <th>Cobertura %</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} data-testid={`admin-obra-social-${o.id}`}>
                  <td>{o.nombre}</td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="input w-28 py-1"
                      value={edits[o.id] ?? String(o.cobertura_pct)}
                      onChange={(e) => setEdits({ ...edits, [o.id]: e.target.value })}
                      data-testid={`admin-obra-social-cobertura-${o.id}`}
                    />
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        className="btn-secondary px-2.5 py-1 text-xs"
                        disabled={edits[o.id] === undefined}
                        onClick={() =>
                          run(async () => {
                            await api(`/api/admin/health-insurances/${o.id}`, {
                              method: "PATCH",
                              body: JSON.stringify({ coberturaPct: edits[o.id] }),
                            });
                            setEdits((prev) => {
                              const next = { ...prev };
                              delete next[o.id];
                              return next;
                            });
                          }, "Cobertura actualizada.")
                        }
                        data-testid={`admin-obra-social-guardar-${o.id}`}
                      >
                        Guardar
                      </button>
                      <ConfirmButton
                        label="Eliminar"
                        testid={`admin-obra-social-eliminar-${o.id}`}
                        onConfirm={() => run(() => api(`/api/admin/health-insurances/${o.id}`, { method: "DELETE" }))}
                      />
                    </div>
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
