"use client";

import { useCallback, useEffect, useState } from "react";
import { PageTitle, Spinner, StatusBadge } from "@/components/ui";
import type { AppointmentDto } from "@/lib/appointments";
import { api } from "@/lib/client";
import { addDays, formatDate, todayAR, weekday } from "@/lib/time";

interface Agenda {
  view: "day" | "week";
  desde: string;
  hasta: string;
  turnos: AppointmentDto[];
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function isoFromDisplay(fecha: string) {
  const [d, m, y] = fecha.split("/");
  return `${y}-${m}-${d}`;
}

export default function AgendaPage() {
  const [view, setView] = useState<"day" | "week">("day");
  const [date, setDate] = useState(todayAR());
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setAgenda(await api<Agenda>(`/api/professional/agenda?view=${view}&date=${date}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [view, date]);

  useEffect(() => {
    load();
  }, [load]);

  async function cambiarEstado(t: AppointmentDto, estado: "CONFIRMADO" | "ATENDIDO" | "AUSENTE") {
    setBusyId(t.id);
    setError(null);
    setNotice(null);
    try {
      await api(`/api/appointments/${t.id}/status`, { method: "PATCH", body: JSON.stringify({ estado }) });
      setNotice(`Turno #${t.id} marcado como ${estado}.`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const step = view === "week" ? 7 : 1;
  const grouped = new Map<string, AppointmentDto[]>();
  for (const t of agenda?.turnos ?? []) {
    const key = isoFromDisplay(t.fecha);
    grouped.set(key, [...(grouped.get(key) ?? []), t]);
  }

  return (
    <div>
      <PageTitle title="Mi agenda" subtitle="Turnos asignados. Registrá la asistencia una vez realizada la consulta." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-sm ${view === v ? "bg-brand-600 text-white" : "text-slate-600"}`}
              data-testid={`agenda-vista-${v === "day" ? "dia" : "semana"}`}
            >
              {v === "day" ? "Día" : "Semana"}
            </button>
          ))}
        </div>
        <button className="btn-secondary py-1.5" onClick={() => setDate(addDays(date, -step))} data-testid="agenda-anterior">
          ‹ Anterior
        </button>
        <button className="btn-secondary py-1.5" onClick={() => setDate(todayAR())} data-testid="agenda-hoy">
          Hoy
        </button>
        <button className="btn-secondary py-1.5" onClick={() => setDate(addDays(date, step))} data-testid="agenda-siguiente">
          Siguiente ›
        </button>
        <input
          type="date"
          className="input w-auto py-1.5"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          data-testid="agenda-fecha"
        />
        {agenda && (
          <span className="text-sm text-slate-500" data-testid="agenda-rango">
            {agenda.view === "day"
              ? `${DIAS[weekday(agenda.desde)]} ${formatDate(agenda.desde)}`
              : `Semana del ${formatDate(agenda.desde)} al ${formatDate(agenda.hasta)}`}
          </span>
        )}
      </div>

      {notice && <p className="alert-success mb-4" data-testid="agenda-aviso">{notice}</p>}
      {error && <p className="alert-error mb-4" data-testid="agenda-error">{error}</p>}

      {!agenda ? (
        <Spinner />
      ) : agenda.turnos.length === 0 ? (
        <div className="card text-center text-sm text-slate-500" data-testid="agenda-vacia">
          No hay turnos en este período.
        </div>
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([fecha, turnos]) => (
            <div key={fecha} className="card overflow-x-auto p-0">
              <p className="border-b border-slate-100 px-4 py-2 text-sm font-semibold">
                {DIAS[weekday(fecha)]} {formatDate(fecha)}
              </p>
              <table className="data-table" data-testid={`agenda-tabla-${fecha}`}>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Paciente</th>
                    <th>DNI</th>
                    <th>Obra social</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {turnos.map((t) => {
                    const activo = t.estado === "PENDIENTE" || t.estado === "CONFIRMADO";
                    return (
                      <tr key={t.id} data-testid={`agenda-turno-${t.id}`}>
                        <td className="font-medium">{t.hora}</td>
                        <td>{t.paciente?.nombre}</td>
                        <td>{t.paciente?.dni}</td>
                        <td>{t.paciente?.obraSocial ?? "Particular"}</td>
                        <td>
                          <StatusBadge estado={t.estado} testid={`agenda-estado-${t.id}`} />
                        </td>
                        <td className="text-right">
                          {activo && (
                            <div className="flex justify-end gap-1.5">
                              {t.estado === "PENDIENTE" && (
                                <button
                                  className="btn-secondary px-2.5 py-1 text-xs"
                                  disabled={busyId === t.id}
                                  onClick={() => cambiarEstado(t, "CONFIRMADO")}
                                  data-testid={`agenda-confirmar-${t.id}`}
                                >
                                  Confirmar
                                </button>
                              )}
                              <button
                                className="btn-primary px-2.5 py-1 text-xs"
                                disabled={busyId === t.id}
                                onClick={() => cambiarEstado(t, "ATENDIDO")}
                                data-testid={`agenda-atendido-${t.id}`}
                              >
                                Atendido
                              </button>
                              <button
                                className="btn-danger px-2.5 py-1 text-xs"
                                disabled={busyId === t.id}
                                onClick={() => cambiarEstado(t, "AUSENTE")}
                                data-testid={`agenda-ausente-${t.id}`}
                              >
                                Ausente
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
