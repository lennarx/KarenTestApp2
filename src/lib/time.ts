export const TIMEZONE = "America/Argentina/Buenos_Aires";
export const AR_OFFSET = "-03:00";

const isoDateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha de hoy (YYYY-MM-DD) en hora Argentina. */
export function todayAR(now: Date = new Date()): string {
  return isoDateFmt.format(now);
}

/** Suma días a una fecha YYYY-MM-DD. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Día de la semana (0 = domingo) de una fecha YYYY-MM-DD. */
export function weekday(isoDate: string): number {
  return new Date(`${isoDate}T00:00:00Z`).getUTCDay();
}

/** "HH:MM:SS" | "HH:MM" -> "HH:MM" */
export function shortTime(time: string): string {
  return time.slice(0, 5);
}

/** Instante real de inicio de un turno (fecha y hora locales de Argentina). */
export function appointmentStart(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${shortTime(hora)}:00${AR_OFFSET}`);
}

/** Fecha y hora actual en Argentina. */
export function nowAR(): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  return new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
}

export function hoursUntil(fecha: string, hora: string, now: Date = nowAR()): number {
  return (appointmentStart(fecha, hora).getTime() - now.getTime()) / 3_600_000;
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY" */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export const MAX_DAYS_AHEAD = 60;
