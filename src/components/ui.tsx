"use client";

import { useState } from "react";
import { addDays, todayAR, weekday } from "@/lib/time";

export type Estado = "PENDIENTE" | "CONFIRMADO" | "ATENDIDO" | "AUSENTE" | "CANCELADO";

const BADGE: Record<Estado, string> = {
  PENDIENTE: "bg-amber-50 text-amber-800 border-amber-200",
  CONFIRMADO: "bg-sky-50 text-sky-800 border-sky-200",
  ATENDIDO: "bg-emerald-50 text-emerald-800 border-emerald-200",
  AUSENTE: "bg-slate-100 text-slate-600 border-slate-300",
  CANCELADO: "bg-red-50 text-red-700 border-red-200",
};

export function StatusBadge({ estado, testid }: { estado: Estado; testid?: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE[estado]}`}
      data-testid={testid}
    >
      {estado}
    </span>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

export function Spinner({ label = "Cargando..." }: { label?: string }) {
  return (
    <p className="py-6 text-center text-sm text-slate-500" data-testid="loading">
      {label}
    </p>
  );
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Calendario mensual (lunes primero) con días deshabilitables. */
export function DatePicker({
  value,
  onChange,
  isDisabled,
  maxDate,
  testid = "calendar",
}: {
  value: string | null;
  onChange: (date: string) => void;
  isDisabled: (date: string) => boolean;
  maxDate: string;
  testid?: string;
}) {
  const today = todayAR();
  const [month, setMonth] = useState((value ?? today).slice(0, 7));
  const first = `${month}-01`;
  const lead = (weekday(first) + 6) % 7;
  const days: string[] = [];
  for (let d = first; d.slice(0, 7) === month; d = addDays(d, 1)) days.push(d);

  const [y, m] = month.split("-").map(Number);
  const canPrev = month > today.slice(0, 7);
  const canNext = month < maxDate.slice(0, 7);

  return (
    <div className="w-full max-w-sm select-none" data-testid={testid}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="btn-secondary px-2 py-1"
          disabled={!canPrev}
          onClick={() => setMonth(shiftMonth(month, -1))}
          data-testid={`${testid}-prev`}
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <span className="text-sm font-semibold" data-testid={`${testid}-month`}>
          {MESES[m - 1]} {y}
        </span>
        <button
          type="button"
          className="btn-secondary px-2 py-1"
          disabled={!canNext}
          onClick={() => setMonth(shiftMonth(month, 1))}
          data-testid={`${testid}-next`}
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
        {DIAS.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
        {Array.from({ length: lead }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {days.map((d) => {
          const disabled = isDisabled(d);
          const selected = d === value;
          return (
            <button
              key={d}
              type="button"
              disabled={disabled}
              onClick={() => onChange(d)}
              data-testid={`${testid}-day-${d}`}
              className={`rounded-md py-2 text-sm transition ${
                selected
                  ? "bg-brand-600 font-semibold text-white"
                  : disabled
                    ? "cursor-not-allowed text-slate-300"
                    : "text-slate-700 hover:bg-brand-50"
              } ${d === today && !selected ? "ring-1 ring-brand-500" : ""}`}
            >
              {Number(d.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface SlotDto {
  id: number;
  professionalId: number;
  fecha: string;
  hora: string;
}

export function SlotGrid({
  slots,
  selected,
  onSelect,
  testid = "slot",
}: {
  slots: SlotDto[];
  selected: number | null;
  onSelect: (slot: SlotDto) => void;
  testid?: string;
}) {
  if (!slots.length) {
    return (
      <p className="text-sm text-slate-500" data-testid={`${testid}-empty`}>
        No hay horarios disponibles para esta fecha.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" data-testid={`${testid}-list`}>
      {slots.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s)}
          data-testid={`${testid}-${s.hora.replace(":", "")}`}
          className={`rounded-md border px-2 py-1.5 text-sm ${
            selected === s.id
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-slate-300 bg-white hover:border-brand-500"
          }`}
        >
          {s.hora}
        </button>
      ))}
    </div>
  );
}
