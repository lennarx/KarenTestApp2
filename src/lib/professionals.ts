import { db } from "./db";
import { ApiError, check } from "./http";
import { shortTime } from "./time";

export const PROFESSIONAL_SELECT =
  "id, matricula, precio_consulta, activo, specialty_id, users(id, nombre, email), specialties(id, nombre), schedules(id, dia_semana, hora_desde, hora_hasta, duracion_min)";

export interface ProfessionalRow {
  id: number;
  matricula: string;
  precio_consulta: number;
  activo: boolean;
  specialty_id: number;
  users: { id: string; nombre: string; email: string } | null;
  specialties: { id: number; nombre: string } | null;
  schedules: { id: number; dia_semana: number; hora_desde: string; hora_hasta: string; duracion_min: number }[];
}

export function toProfessionalDto(row: ProfessionalRow) {
  return {
    id: row.id,
    nombre: row.users?.nombre ?? "",
    email: row.users?.email ?? "",
    matricula: row.matricula,
    precioConsulta: Number(row.precio_consulta),
    activo: row.activo,
    especialidad: row.specialties ? { id: row.specialties.id, nombre: row.specialties.nombre } : null,
    agenda: [...(row.schedules ?? [])]
      .sort((a, b) => a.dia_semana - b.dia_semana || a.hora_desde.localeCompare(b.hora_desde))
      .map((s) => ({
        id: s.id,
        diaSemana: s.dia_semana,
        horaDesde: shortTime(s.hora_desde),
        horaHasta: shortTime(s.hora_hasta),
        duracionMin: s.duracion_min,
      })),
  };
}

export type ProfessionalDto = ReturnType<typeof toProfessionalDto>;

export async function getProfessionalRow(id: number): Promise<ProfessionalRow> {
  const row = check(
    await db().from("professionals").select(PROFESSIONAL_SELECT).eq("id", id).maybeSingle(),
  ) as ProfessionalRow | null;
  if (!row) throw new ApiError(404, "El profesional no existe", "NOT_FOUND");
  return row;
}
