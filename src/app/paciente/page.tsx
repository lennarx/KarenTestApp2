"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DatePicker, PageTitle, SlotGrid, Spinner, type SlotDto } from "@/components/ui";
import type { AppointmentDto } from "@/lib/appointments";
import { api, money } from "@/lib/client";
import { calcularCopago } from "@/lib/copago";
import type { ProfessionalDto } from "@/lib/professionals";
import { MAX_DAYS_AHEAD, addDays, formatDate, todayAR, weekday } from "@/lib/time";

interface Me {
  nombre: string;
  obraSocial: { id: number; nombre: string; cobertura_pct: number } | null;
}
interface Specialty {
  id: number;
  nombre: string;
}
interface Holiday {
  id: number;
  fecha: string;
  descripcion: string;
}

export default function ReservarPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [specialtyId, setSpecialtyId] = useState("");
  const [professionals, setProfessionals] = useState<ProfessionalDto[] | null>(null);
  const [prof, setProf] = useState<ProfessionalDto | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotDto[] | null>(null);
  const [slot, setSlot] = useState<SlotDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<AppointmentDto | null>(null);

  useEffect(() => {
    Promise.all([api<Me>("/api/auth/me"), api<Specialty[]>("/api/specialties"), api<Holiday[]>("/api/holidays")])
      .then(([m, s, h]) => {
        setMe(m);
        setSpecialties(s);
        setHolidays(h);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setProf(null);
    setDate(null);
    setSlots(null);
    setSlot(null);
    if (!specialtyId) {
      setProfessionals(null);
      return;
    }
    api<ProfessionalDto[]>(`/api/professionals?specialtyId=${specialtyId}`)
      .then(setProfessionals)
      .catch((e) => setError(e.message));
  }, [specialtyId]);

  const loadSlots = useCallback(async (profId: number, d: string) => {
    setSlots(null);
    setSlot(null);
    try {
      setSlots(await api<SlotDto[]>(`/api/professionals/${profId}/slots?date=${d}`));
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const today = todayAR();
  const maxDate = addDays(today, MAX_DAYS_AHEAD);
  const holidaySet = useMemo(() => new Set(holidays.map((h) => h.fecha)), [holidays]);
  const workDays = useMemo(() => new Set(prof?.agenda.map((b) => b.diaSemana) ?? []), [prof]);
  const isDisabled = (d: string) => d < today || d > maxDate || holidaySet.has(d) || !workDays.has(weekday(d));

  const cobertura = me?.obraSocial?.cobertura_pct ?? 0;

  function chooseProfessional(p: ProfessionalDto) {
    setProf(p);
    setDate(null);
    setSlots(null);
    setSlot(null);
    setBooked(null);
    setError(null);
  }

  function chooseDate(d: string) {
    setDate(d);
    setError(null);
    if (prof) loadSlots(prof.id, d);
  }

  async function confirm() {
    if (!slot) return;
    setSubmitting(true);
    setError(null);
    try {
      const appt = await api<AppointmentDto>("/api/appointments", {
        method: "POST",
        body: JSON.stringify({ slotId: slot.id }),
      });
      setBooked(appt);
      setSlots((prev) => prev?.filter((s) => s.id !== slot.id) ?? null);
      setSlot(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!me) return error ? <p className="alert-error">{error}</p> : <Spinner />;

  return (
    <div>
      <PageTitle
        title="Reservar turno"
        subtitle={
          me.obraSocial
            ? `Cobertura: ${me.obraSocial.nombre} (${me.obraSocial.cobertura_pct}%)`
            : "Sin obra social: abonás el valor total de la consulta."
        }
      />

      {booked && (
        <div className="alert-success mb-6" data-testid="reserva-exito">
          ¡Turno reservado! {booked.profesional?.nombre} el {booked.fecha} a las {booked.hora} hs. Copago:{" "}
          {money(booked.copago)}.{" "}
          <Link href={`/paciente/turnos/${booked.id}`} className="font-medium underline" data-testid="reserva-ver-turno">
            Ver turno
          </Link>
        </div>
      )}
      {error && (
        <p className="alert-error mb-6" data-testid="reserva-error">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="card space-y-4">
          <h2 className="font-semibold">1. Especialidad y profesional</h2>
          <select
            className="input"
            value={specialtyId}
            onChange={(e) => setSpecialtyId(e.target.value)}
            data-testid="especialidad-select"
          >
            <option value="">Elegí una especialidad</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>

          {professionals && professionals.length === 0 && (
            <p className="text-sm text-slate-500" data-testid="profesionales-vacio">
              No hay profesionales disponibles para esta especialidad.
            </p>
          )}
          <ul className="space-y-2">
            {professionals?.map((p) => (
              <li
                key={p.id}
                className={`rounded-lg border p-3 ${prof?.id === p.id ? "border-brand-500 bg-brand-50" : "border-slate-200"}`}
                data-testid={`profesional-card-${p.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{p.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {p.matricula} · Consulta {money(p.precioConsulta)}
                    </p>
                    <p className="text-xs text-slate-600">
                      Tu copago: <strong>{money(calcularCopago(p.precioConsulta, cobertura))}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => chooseProfessional(p)}
                    data-testid={`profesional-elegir-${p.id}`}
                  >
                    Elegir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">2. Fecha y horario</h2>
          {!prof ? (
            <p className="text-sm text-slate-500">Elegí un profesional para ver su disponibilidad.</p>
          ) : (
            <>
              <DatePicker key={prof.id} value={date} onChange={chooseDate} isDisabled={isDisabled} maxDate={maxDate} />
              {date && (
                <div>
                  <p className="mb-2 text-sm font-medium">Horarios del {formatDate(date)}</p>
                  {slots ? (
                    <SlotGrid slots={slots} selected={slot?.id ?? null} onSelect={setSlot} />
                  ) : (
                    <Spinner label="Buscando horarios..." />
                  )}
                </div>
              )}
              {slot && (
                <div className="rounded-lg border border-brand-100 bg-brand-50 p-4" data-testid="reserva-resumen">
                  <p className="text-sm">
                    <strong>{prof.nombre}</strong> ({prof.especialidad?.nombre})
                  </p>
                  <p className="text-sm">
                    {formatDate(slot.fecha)} a las {slot.hora} hs
                  </p>
                  <p className="text-sm">
                    Copago estimado:{" "}
                    <strong data-testid="reserva-copago">{money(calcularCopago(prof.precioConsulta, cobertura))}</strong>
                  </p>
                  <button
                    type="button"
                    className="btn-primary mt-3"
                    onClick={confirm}
                    disabled={submitting}
                    data-testid="confirmar-reserva"
                  >
                    {submitting ? "Reservando..." : "Confirmar reserva"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
