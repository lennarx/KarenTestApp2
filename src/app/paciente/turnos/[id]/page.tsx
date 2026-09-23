"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DatePicker, SlotGrid, Spinner, StatusBadge, type SlotDto } from "@/components/ui";
import type { AppointmentDto } from "@/lib/appointments";
import { api, money } from "@/lib/client";
import type { ProfessionalDto } from "@/lib/professionals";
import { MAX_DAYS_AHEAD, addDays, formatDate, todayAR, weekday } from "@/lib/time";

interface Holiday {
  fecha: string;
}

export default function TurnoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [turno, setTurno] = useState<AppointmentDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);

  const [reprogramando, setReprogramando] = useState(false);
  const [prof, setProf] = useState<ProfessionalDto | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotDto[] | null>(null);
  const [slot, setSlot] = useState<SlotDto | null>(null);

  const load = useCallback(async () => {
    try {
      setTurno(await api<AppointmentDto>(`/api/appointments/${id}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function cancelar() {
    setBusy(true);
    setError(null);
    try {
      setTurno(await api<AppointmentDto>(`/api/appointments/${id}/cancel`, { method: "POST" }));
      setNotice("El turno fue cancelado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setConfirmCancel(false);
    }
  }

  async function abrirReprogramar() {
    if (!turno?.profesional) return;
    setReprogramando(true);
    setNotice(null);
    setError(null);
    const [p, h] = await Promise.all([
      api<ProfessionalDto>(`/api/professionals/${turno.profesional.id}`),
      api<Holiday[]>("/api/holidays"),
    ]);
    setProf(p);
    setHolidays(h);
  }

  async function elegirFecha(d: string) {
    if (!prof) return;
    setDate(d);
    setSlot(null);
    setSlots(null);
    try {
      setSlots(await api<SlotDto[]>(`/api/professionals/${prof.id}/slots?date=${d}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function reprogramar() {
    if (!slot) return;
    setBusy(true);
    setError(null);
    try {
      const t = await api<AppointmentDto>(`/api/appointments/${id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({ slotId: slot.id }),
      });
      setTurno(t);
      setNotice(`Turno reprogramado para el ${t.fecha} a las ${t.hora} hs.`);
      setReprogramando(false);
      setDate(null);
      setSlots(null);
      setSlot(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const today = todayAR();
  const maxDate = addDays(today, MAX_DAYS_AHEAD);
  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.fecha)), [holidays]);
  const workDays = useMemo(() => new Set(prof?.agenda.map((b) => b.diaSemana) ?? []), [prof]);
  const isDisabled = (d: string) => d < today || d > maxDate || holidaySet.has(d) || !workDays.has(weekday(d));

  if (!turno) return error ? <p className="alert-error" data-testid="turno-error">{error}</p> : <Spinner />;

  const activo = turno.estado === "PENDIENTE" || turno.estado === "CONFIRMADO";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/paciente/turnos" className="text-sm text-brand-600 hover:underline" data-testid="volver-historial">
        ← Volver a mis turnos
      </Link>

      <div className="card" data-testid="turno-detalle">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Turno #{turno.id}</p>
            <h1 className="text-xl font-semibold">{turno.profesional?.nombre}</h1>
            <p className="text-sm text-slate-500">
              {turno.profesional?.especialidad} · {turno.profesional?.matricula}
            </p>
          </div>
          <StatusBadge estado={turno.estado} testid="turno-estado" />
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Fecha</dt>
            <dd className="font-medium" data-testid="turno-fecha">{turno.fecha}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Hora</dt>
            <dd className="font-medium" data-testid="turno-hora">{turno.hora} hs</dd>
          </div>
          <div>
            <dt className="text-slate-500">Paciente</dt>
            <dd className="font-medium" data-testid="turno-paciente">{turno.paciente?.nombre}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Valor de la consulta</dt>
            <dd className="font-medium" data-testid="turno-precio">{money(turno.precio)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Cobertura</dt>
            <dd className="font-medium" data-testid="turno-cobertura">{turno.coberturaPct}%</dd>
          </div>
          <div>
            <dt className="text-slate-500">Copago</dt>
            <dd className="text-lg font-semibold text-brand-700" data-testid="turno-copago">{money(turno.copago)}</dd>
          </div>
        </dl>
        {turno.reprogramaciones > 0 && (
          <p className="mt-4 text-xs text-slate-500">Reprogramado {turno.reprogramaciones} vez/veces.</p>
        )}
        {turno.motivoCancelacion && (
          <p className="mt-4 text-sm text-slate-600" data-testid="turno-motivo-cancelacion">
            Motivo de cancelación: {turno.motivoCancelacion}
          </p>
        )}

        {notice && <p className="alert-success mt-4" data-testid="turno-aviso">{notice}</p>}
        {error && <p className="alert-error mt-4" data-testid="turno-error">{error}</p>}

        {activo && (
          <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
            {!confirmCancel ? (
              <button className="btn-danger" onClick={() => setConfirmCancel(true)} data-testid="cancelar-turno">
                Cancelar turno
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>¿Confirmás la cancelación?</span>
                <button className="btn-danger" onClick={cancelar} disabled={busy} data-testid="confirmar-cancelacion">
                  Sí, cancelar
                </button>
                <button className="btn-secondary" onClick={() => setConfirmCancel(false)} data-testid="desistir-cancelacion">
                  No
                </button>
              </div>
            )}
            {!reprogramando && (
              <button className="btn-secondary" onClick={abrirReprogramar} data-testid="reprogramar-turno">
                Reprogramar
              </button>
            )}
          </div>
        )}
      </div>

      {reprogramando && activo && (
        <div className="card space-y-4" data-testid="reprogramar-panel">
          <h2 className="font-semibold">Elegí un nuevo horario con {turno.profesional?.nombre}</h2>
          {!prof ? (
            <Spinner />
          ) : (
            <DatePicker
              value={date}
              onChange={elegirFecha}
              isDisabled={isDisabled}
              maxDate={maxDate}
              testid="reprogramar-calendar"
            />
          )}
          {date && (
            <div>
              <p className="mb-2 text-sm font-medium">Horarios del {formatDate(date)}</p>
              {slots ? (
                <SlotGrid slots={slots} selected={slot?.id ?? null} onSelect={setSlot} testid="reprogramar-slot" />
              ) : (
                <Spinner label="Buscando horarios..." />
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              className="btn-primary"
              disabled={!slot || busy}
              onClick={reprogramar}
              data-testid="confirmar-reprogramacion"
            >
              {busy ? "Guardando..." : "Confirmar nuevo horario"}
            </button>
            <button className="btn-secondary" onClick={() => setReprogramando(false)} data-testid="cerrar-reprogramacion">
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
