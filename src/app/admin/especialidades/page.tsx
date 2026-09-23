"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageTitle, Spinner } from "@/components/ui";
import { api } from "@/lib/client";

interface Row {
  id: number;
  nombre: string;
  profesionales: number;
}

export default function AdminEspecialidadesPage() {
  const [items, setItems] = useState<Row[] | null>(null);
  const [nombre, setNombre] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await api<Row[]>("/api/admin/specialties"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="max-w-2xl">
      <PageTitle title="Especialidades" />
      {error && <p className="alert-error mb-4" data-testid="admin-error">{error}</p>}
      <form
        className="card mb-6 flex gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await api("/api/admin/specialties", { method: "POST", body: JSON.stringify({ nombre }) });
            setNombre("");
          });
        }}
        data-testid="admin-especialidad-form"
      >
        <input
          className="input"
          placeholder="Nueva especialidad"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          data-testid="admin-especialidad-nombre"
        />
        <button className="btn-primary shrink-0" type="submit" data-testid="admin-especialidad-crear">
          Agregar
        </button>
      </form>
      <div className="card p-0">
        {!items ? (
          <Spinner />
        ) : (
          <table className="data-table" data-testid="admin-especialidades-tabla">
            <thead>
              <tr>
                <th>Especialidad</th>
                <th>Profesionales</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} data-testid={`admin-especialidad-${s.id}`}>
                  <td>
                    {editId === s.id ? (
                      <input
                        className="input py-1"
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        data-testid={`admin-especialidad-editar-input-${s.id}`}
                      />
                    ) : (
                      s.nombre
                    )}
                  </td>
                  <td>{s.profesionales}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {editId === s.id ? (
                        <button
                          className="btn-primary px-2.5 py-1 text-xs"
                          onClick={() =>
                            run(async () => {
                              await api(`/api/admin/specialties/${s.id}`, {
                                method: "PATCH",
                                body: JSON.stringify({ nombre: editNombre }),
                              });
                              setEditId(null);
                            })
                          }
                          data-testid={`admin-especialidad-guardar-${s.id}`}
                        >
                          Guardar
                        </button>
                      ) : (
                        <button
                          className="btn-secondary px-2.5 py-1 text-xs"
                          onClick={() => {
                            setEditId(s.id);
                            setEditNombre(s.nombre);
                          }}
                          data-testid={`admin-especialidad-editar-${s.id}`}
                        >
                          Renombrar
                        </button>
                      )}
                      <ConfirmButton
                        label="Eliminar"
                        testid={`admin-especialidad-eliminar-${s.id}`}
                        onConfirm={() => run(() => api(`/api/admin/specialties/${s.id}`, { method: "DELETE" }))}
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
