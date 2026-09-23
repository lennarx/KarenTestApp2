"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageTitle, Spinner, StatusBadge } from "@/components/ui";
import type { AppointmentDto } from "@/lib/appointments";
import { api, money } from "@/lib/client";

interface HistoryPage {
  items: AppointmentDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function MisTurnosPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HistoryPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<HistoryPage>(`/api/appointments?page=${page}`)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div>
      <PageTitle title="Mis turnos" subtitle="Historial completo de tus turnos, del más reciente al más antiguo." />
      {error && <p className="alert-error mb-4">{error}</p>}
      {!data ? (
        <Spinner />
      ) : data.total === 0 ? (
        <div className="card text-center text-sm text-slate-500" data-testid="historial-vacio">
          Todavía no tenés turnos.{" "}
          <Link href="/paciente" className="font-medium text-brand-600 underline">
            Reservá tu primer turno
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="data-table" data-testid="historial-tabla">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Profesional</th>
                <th>Especialidad</th>
                <th>Estado</th>
                <th className="text-right">Copago</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id} data-testid={`historial-fila-${t.id}`}>
                  <td className="text-slate-400">{t.id}</td>
                  <td data-testid={`historial-fecha-${t.id}`}>{t.fecha}</td>
                  <td>{t.hora}</td>
                  <td>{t.profesional?.nombre}</td>
                  <td>{t.profesional?.especialidad}</td>
                  <td>
                    <StatusBadge estado={t.estado} testid={`historial-estado-${t.id}`} />
                  </td>
                  <td className="text-right tabular-nums">{money(t.copago)}</td>
                  <td className="text-right">
                    <Link
                      href={`/paciente/turnos/${t.id}`}
                      className="text-sm font-medium text-brand-600 hover:underline"
                      data-testid={`historial-ver-${t.id}`}
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
            <span className="text-slate-500" data-testid="historial-paginacion-info">
              Página {data.page} de {data.totalPages} · {data.total} turnos
            </span>
            <div className="flex gap-2">
              <button
                className="btn-secondary py-1"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => p - 1)}
                data-testid="historial-anterior"
              >
                Anterior
              </button>
              {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={n === data.page ? "btn-primary py-1" : "btn-secondary py-1"}
                  onClick={() => setPage(n)}
                  data-testid={`historial-pagina-${n}`}
                >
                  {n}
                </button>
              ))}
              <button
                className="btn-secondary py-1"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                data-testid="historial-siguiente"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
