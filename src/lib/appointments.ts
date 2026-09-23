import { calcularCopago } from "./copago";
import { db } from "./db";
import { ApiError, check } from "./http";
import type { SlotRow } from "./slots";
import { MAX_DAYS_AHEAD, addDays, appointmentStart, formatDate, shortTime, todayAR } from "./time";

export type Estado = "PENDIENTE" | "CONFIRMADO" | "ATENDIDO" | "AUSENTE" | "CANCELADO";

export const ACTIVE_STATES: Estado[] = ["PENDIENTE", "CONFIRMADO"];
export const MAX_ACTIVE_APPOINTMENTS = 3;
export const PAGE_SIZE = 10;

export const APPOINTMENT_SELECT =
  "*, paciente:users(id, nombre, dni, email, nro_afiliado, health_insurances(nombre)), profesional:professionals(id, matricula, users(nombre), specialties(nombre))";

export interface AppointmentRow {
  id: number;
  patient_id: string;
  professional_id: number;
  slot_id: number | null;
  fecha: string;
  hora: string;
  estado: Estado;
  precio: number;
  cobertura_pct: number;
  copago: number;
  motivo_cancelacion: string | null;
  reprogramaciones: number;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  paciente?: {
    id: string;
    nombre: string;
    dni: string | null;
    email: string;
    nro_afiliado: string | null;
    health_insurances: { nombre: string } | null;
  } | null;
  profesional?: {
    id: number;
    matricula: string;
    users: { nombre: string } | null;
    specialties: { nombre: string } | null;
  } | null;
}

export function toAppointmentDto(row: AppointmentRow) {
  return {
    id: row.id,
    fecha: formatDate(row.fecha),
    hora: shortTime(row.hora),
    inicio: appointmentStart(row.fecha, row.hora).toISOString(),
    estado: row.estado,
    precio: Number(row.precio),
    coberturaPct: Number(row.cobertura_pct),
    copago: Number(row.copago),
    reprogramaciones: row.reprogramaciones,
    motivoCancelacion: row.motivo_cancelacion,
    creadoEn: row.created_at,
    canceladoEn: row.cancelled_at,
    profesional: row.profesional
      ? {
          id: row.profesional.id,
          nombre: row.profesional.users?.nombre ?? "",
          especialidad: row.profesional.specialties?.nombre ?? "",
          matricula: row.profesional.matricula,
        }
      : null,
    paciente: row.paciente
      ? {
          id: row.paciente.id,
          nombre: row.paciente.nombre,
          dni: row.paciente.dni,
          obraSocial: row.paciente.health_insurances?.nombre ?? null,
          nroAfiliado: row.paciente.nro_afiliado,
        }
      : null,
  };
}

export type AppointmentDto = ReturnType<typeof toAppointmentDto>;

/** PENDIENTE -> CONFIRMADO para los turnos que empiezan dentro de las próximas 48h. */
export async function autoConfirm() {
  check(await db().rpc("auto_confirm_appointments"));
}

export async function getAppointmentRow(id: number): Promise<AppointmentRow> {
  const row = check(
    await db().from("appointments").select(APPOINTMENT_SELECT).eq("id", id).maybeSingle(),
  ) as AppointmentRow | null;
  if (!row) throw new ApiError(404, "El turno no existe", "NOT_FOUND");
  return row;
}

export async function getSlot(slotId: unknown): Promise<SlotRow> {
  const id = Number(slotId);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "slotId inválido", "VALIDATION_ERROR");
  const slot = check(
    await db().from("slots").select("id, professional_id, fecha, hora, is_booked").eq("id", id).maybeSingle(),
  ) as SlotRow | null;
  if (!slot) throw new ApiError(404, "El horario seleccionado no existe", "SLOT_NOT_FOUND");
  return slot;
}

/** Reglas para tomar un slot: ventana reservable (RN-11) y profesional activo. */
export async function assertSlotBookable(slot: SlotRow) {
  if (appointmentStart(slot.fecha, slot.hora).getTime() <= Date.now()) {
    throw new ApiError(422, "No se pueden reservar turnos en el pasado", "PAST_SLOT");
  }
  if (slot.fecha > addDays(todayAR(), MAX_DAYS_AHEAD)) {
    throw new ApiError(422, `Solo se puede reservar con hasta ${MAX_DAYS_AHEAD} días de anticipación`, "TOO_FAR_AHEAD");
  }
  const prof = check(
    await db().from("professionals").select("activo").eq("id", slot.professional_id).maybeSingle(),
  ) as { activo: boolean } | null;
  if (!prof?.activo) throw new ApiError(422, "El profesional no está disponible", "PROFESSIONAL_INACTIVE");
}

export async function countActiveAppointments(patientId: string): Promise<number> {
  const { count, error } = await db()
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)
    .eq("estado", "CONFIRMADO");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Precio, cobertura y copago vigentes para un paciente y profesional. */
export async function pricingFor(patientId: string, professionalId: number) {
  const prof = check(
    await db().from("professionals").select("precio_consulta").eq("id", professionalId).single(),
  ) as { precio_consulta: number };
  const patient = check(
    await db().from("users").select("health_insurances(cobertura_pct)").eq("id", patientId).single(),
  ) as unknown as { health_insurances: { cobertura_pct: number } | null };
  const precio = Number(prof.precio_consulta);
  const coberturaPct = Number(patient.health_insurances?.cobertura_pct ?? 0);
  return { precio, cobertura_pct: coberturaPct, copago: calcularCopago(precio, coberturaPct) };
}

/** Marca el slot como reservado solo si estaba libre. Devuelve false si otro lo tomó antes. */
export async function claimSlot(slotId: number): Promise<boolean> {
  const rows = check(
    await db().from("slots").update({ is_booked: true }).eq("id", slotId).eq("is_booked", false).select("id"),
  ) as { id: number }[];
  return rows.length === 1;
}

export async function releaseSlot(slotId: number | null) {
  if (!slotId) return;
  check(await db().from("slots").update({ is_booked: false }).eq("id", slotId));
}

export function assertActive(row: AppointmentRow) {
  if (!ACTIVE_STATES.includes(row.estado)) {
    throw new ApiError(409, `El turno está ${row.estado} y no admite cambios`, "INVALID_STATE");
  }
}
