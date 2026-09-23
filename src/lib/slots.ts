import { db } from "./db";
import { check } from "./http";
import {
  MAX_DAYS_AHEAD,
  addDays,
  appointmentStart,
  minutesToTime,
  timeToMinutes,
  todayAR,
  weekday,
} from "./time";

export interface ScheduleBlock {
  dia_semana: number;
  hora_desde: string;
  hora_hasta: string;
  duracion_min: number;
}

export interface SlotRow {
  id: number;
  professional_id: number;
  fecha: string;
  hora: string;
  is_booked: boolean;
}

/** Horarios (HH:MM) que genera una agenda para una fecha dada. */
export function timesForDate(blocks: ScheduleBlock[], fecha: string): string[] {
  const dow = weekday(fecha);
  const times = new Set<string>();
  for (const b of blocks.filter((x) => x.dia_semana === dow)) {
    const end = timeToMinutes(b.hora_hasta);
    for (let t = timeToMinutes(b.hora_desde); t + b.duracion_min <= end; t += b.duracion_min) {
      times.add(minutesToTime(t));
    }
  }
  return [...times].sort();
}

/**
 * Materializa los slots de un profesional dentro de la ventana reservable
 * (hoy .. hoy + 60 días). Es idempotente.
 */
export async function ensureSlots(professionalId: number, from: string, to: string) {
  const today = todayAR();
  const start = from < today ? today : from;
  const limit = addDays(today, MAX_DAYS_AHEAD);
  const end = to > limit ? limit : to;
  if (start > end) return;

  const blocks = check(
    await db()
      .from("schedules")
      .select("dia_semana, hora_desde, hora_hasta, duracion_min")
      .eq("professional_id", professionalId),
  ) as ScheduleBlock[];
  if (blocks.length === 0) return;

  const rows: { professional_id: number; fecha: string; hora: string }[] = [];
  for (let fecha = start; fecha <= end; fecha = addDays(fecha, 1)) {
    for (const hora of timesForDate(blocks, fecha)) {
      rows.push({ professional_id: professionalId, fecha, hora });
    }
  }
  if (rows.length === 0) return;

  check(
    await db()
      .from("slots")
      .upsert(rows, { onConflict: "professional_id,fecha,hora", ignoreDuplicates: true }),
  );
}

/** Slots libres de un profesional para una fecha (excluye horarios ya pasados). */
export async function listFreeSlots(professionalId: number, fecha: string): Promise<SlotRow[]> {
  await ensureSlots(professionalId, fecha, fecha);
  const rows = check(
    await db()
      .from("slots")
      .select("id, professional_id, fecha, hora, is_booked")
      .eq("professional_id", professionalId)
      .eq("fecha", fecha)
      .eq("is_booked", false)
      .order("hora"),
  ) as SlotRow[];
  const now = Date.now();
  return rows.filter((s) => appointmentStart(s.fecha, s.hora).getTime() > now);
}

/** Borra los slots futuros no reservados (se regeneran desde la nueva agenda). */
export async function clearFutureFreeSlots(professionalId: number) {
  check(
    await db()
      .from("slots")
      .delete()
      .eq("professional_id", professionalId)
      .eq("is_booked", false)
      .gte("fecha", todayAR()),
  );
}
