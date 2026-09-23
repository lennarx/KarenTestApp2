import bcrypt from "bcryptjs";
import { calcularCopago } from "./copago";
import { db } from "./db";
import { check } from "./http";
import { timesForDate, type ScheduleBlock } from "./slots";
import { addDays, todayAR, weekday } from "./time";

type Estado = "PENDIENTE" | "CONFIRMADO" | "ATENDIDO" | "AUSENTE" | "CANCELADO";

export const SEED_PASSWORDS = {
  admin: "Admin123!",
  profesional: "Medico123!",
  paciente: "Paciente123!",
};

const OBRAS_SOCIALES = [
  { nombre: "Salud Plena", cobertura_pct: 40 },
  { nombre: "Previsión Médica", cobertura_pct: 70 },
  { nombre: "Cobertura Total", cobertura_pct: 100 },
];

const ESPECIALIDADES = ["Clínica Médica", "Cardiología", "Pediatría", "Dermatología"];

const PROFESIONALES: {
  nombre: string;
  email: string;
  especialidad: string;
  matricula: string;
  precio: number;
  agenda: ScheduleBlock[];
}[] = [
  {
    nombre: "Dra. Laura Méndez",
    email: "laura.mendez@mediturnos.com",
    especialidad: "Clínica Médica",
    matricula: "MN 104233",
    precio: 18450.01,
    agenda: [
      ...[1, 2, 3, 4, 5].map((d) => ({ dia_semana: d, hora_desde: "08:00", hora_hasta: "16:00", duracion_min: 20 })),
      { dia_semana: 6, hora_desde: "09:00", hora_hasta: "13:00", duracion_min: 20 },
    ],
  },
  {
    nombre: "Dr. Martín Aguirre",
    email: "martin.aguirre@mediturnos.com",
    especialidad: "Cardiología",
    matricula: "MN 98771",
    precio: 32750,
    agenda: [1, 3, 5].map((d) => ({ dia_semana: d, hora_desde: "09:00", hora_hasta: "17:00", duracion_min: 30 })),
  },
  {
    nombre: "Dra. Sofía Ríos",
    email: "sofia.rios@mediturnos.com",
    especialidad: "Pediatría",
    matricula: "MN 112590",
    precio: 21300.05,
    agenda: [1, 2, 3, 4, 5].map((d) => ({ dia_semana: d, hora_desde: "13:00", hora_hasta: "19:00", duracion_min: 20 })),
  },
  {
    nombre: "Dr. Pablo Ferreyra",
    email: "pablo.ferreyra@mediturnos.com",
    especialidad: "Dermatología",
    matricula: "MN 87412",
    precio: 25600,
    agenda: [
      { dia_semana: 2, hora_desde: "10:00", hora_hasta: "18:00", duracion_min: 30 },
      { dia_semana: 4, hora_desde: "10:00", hora_hasta: "18:00", duracion_min: 30 },
      { dia_semana: 6, hora_desde: "09:00", hora_hasta: "12:00", duracion_min: 30 },
    ],
  },
];

const PACIENTES = [
  {
    nombre: "María González",
    email: "maria.gonzalez@mail.com",
    dni: "30111222",
    fecha_nacimiento: "1985-04-12",
    obraSocial: "Salud Plena",
    nro_afiliado: "40-112233/01",
  },
  {
    nombre: "Juan Pérez",
    email: "juan.perez@mail.com",
    dni: "28444555",
    fecha_nacimiento: "1979-10-03",
    obraSocial: "Previsión Médica",
    nro_afiliado: "PM-0098812",
  },
  {
    nombre: "Lucía Fernández",
    email: "lucia.fernandez@mail.com",
    dni: "41222333",
    fecha_nacimiento: "1998-01-25",
    obraSocial: null,
    nro_afiliado: null,
  },
];

const FERIADO_OFFSET = 15;

/**
 * Turnos de ejemplo: [paciente, profesional, offset en días, orden del slot en el día, estado].
 * Los offsets son relativos a hoy para que el seed no envejezca.
 */
const TURNOS: [number, number, number, number, Estado][] = [
  // María González: historial largo (3+ páginas), varios meses
  [0, 0, -2, 3, "ATENDIDO"],
  [0, 1, -5, 2, "ATENDIDO"],
  [0, 3, -9, 1, "CANCELADO"],
  [0, 0, -12, 5, "ATENDIDO"],
  [0, 2, -16, 0, "AUSENTE"],
  [0, 1, -19, 4, "ATENDIDO"],
  [0, 0, -23, 2, "ATENDIDO"],
  [0, 3, -27, 3, "ATENDIDO"],
  [0, 0, -31, 6, "CANCELADO"],
  [0, 1, -36, 1, "ATENDIDO"],
  [0, 2, -40, 2, "ATENDIDO"],
  [0, 0, -44, 4, "AUSENTE"],
  [0, 3, -49, 0, "ATENDIDO"],
  [0, 0, -53, 7, "ATENDIDO"],
  [0, 1, -58, 3, "CANCELADO"],
  [0, 0, -62, 1, "ATENDIDO"],
  [0, 2, -67, 5, "ATENDIDO"],
  [0, 0, -73, 2, "ATENDIDO"],
  [0, 3, -80, 4, "AUSENTE"],
  [0, 1, -86, 0, "ATENDIDO"],
  [0, 0, -93, 3, "ATENDIDO"],
  [0, 0, -101, 5, "ATENDIDO"],
  [0, 0, 6, 4, "PENDIENTE"],
  [0, 1, 11, 2, "PENDIENTE"],
  [0, 3, 8, 1, "CANCELADO"],
  // Juan Pérez
  [1, 1, -6, 5, "ATENDIDO"],
  [1, 0, -15, 8, "CANCELADO"],
  [1, 3, -20, 2, "AUSENTE"],
  [1, 2, 9, 3, "PENDIENTE"],
  // Lucía Fernández
  [2, 0, 0, 9, "CONFIRMADO"],
  [2, 2, -3, 1, "CANCELADO"],
  [2, 0, -30, 0, "ATENDIDO"],
  [2, 3, 5, 2, "PENDIENTE"],
];

/** Busca el día hábil del profesional más cercano (hacia atrás en el pasado, hacia adelante en el futuro). */
function workingDay(agenda: ScheduleBlock[], offset: number, today: string, feriado: string): string {
  const step = offset < 0 ? -1 : 1;
  let fecha = addDays(today, offset);
  for (let i = 0; i < 14; i++) {
    if (fecha !== feriado && agenda.some((b) => b.dia_semana === weekday(fecha))) return fecha;
    fecha = addDays(fecha, step);
  }
  throw new Error(`Sin día hábil cerca de ${offset}`);
}

export async function runSeed() {
  const today = todayAR();
  const feriado = addDays(today, FERIADO_OFFSET);

  check(await db().rpc("reset_data"));

  const obras = check(
    await db().from("health_insurances").insert(OBRAS_SOCIALES).select("id, nombre, cobertura_pct"),
  ) as { id: number; nombre: string; cobertura_pct: number }[];
  const obraByName = new Map(obras.map((o) => [o.nombre, o]));

  const specs = check(
    await db()
      .from("specialties")
      .insert(ESPECIALIDADES.map((nombre) => ({ nombre })))
      .select("id, nombre"),
  ) as { id: number; nombre: string }[];
  const specByName = new Map(specs.map((s) => [s.nombre, s.id]));

  const [adminHash, profHash, pacHash] = await Promise.all([
    bcrypt.hash(SEED_PASSWORDS.admin, 10),
    bcrypt.hash(SEED_PASSWORDS.profesional, 10),
    bcrypt.hash(SEED_PASSWORDS.paciente, 10),
  ]);

  check(
    await db().from("users").insert({
      email: "admin@mediturnos.com",
      password_hash: adminHash,
      role: "admin",
      nombre: "Administración MediTurnos",
    }),
  );

  const profUsers = check(
    await db()
      .from("users")
      .insert(PROFESIONALES.map((p) => ({ email: p.email, password_hash: profHash, role: "profesional", nombre: p.nombre })))
      .select("id, email"),
  ) as { id: string; email: string }[];
  const profUserByEmail = new Map(profUsers.map((u) => [u.email, u.id]));

  const profs: { id: number; precio: number; agenda: ScheduleBlock[] }[] = [];
  for (const p of PROFESIONALES) {
    const row = check(
      await db()
        .from("professionals")
        .insert({
          user_id: profUserByEmail.get(p.email),
          specialty_id: specByName.get(p.especialidad),
          matricula: p.matricula,
          precio_consulta: p.precio,
        })
        .select("id")
        .single(),
    ) as { id: number };
    check(await db().from("schedules").insert(p.agenda.map((b) => ({ ...b, professional_id: row.id }))));
    profs.push({ id: row.id, precio: p.precio, agenda: p.agenda });
  }

  const pacientes = check(
    await db()
      .from("users")
      .insert(
        PACIENTES.map((p) => ({
          email: p.email,
          password_hash: pacHash,
          role: "paciente",
          nombre: p.nombre,
          dni: p.dni,
          fecha_nacimiento: p.fecha_nacimiento,
          health_insurance_id: p.obraSocial ? obraByName.get(p.obraSocial)!.id : null,
          nro_afiliado: p.nro_afiliado,
        })),
      )
      .select("id, email"),
  ) as { id: string; email: string }[];
  const pacienteIdByEmail = new Map(pacientes.map((u) => [u.email, u.id]));

  check(
    await db().from("holidays").insert({ fecha: feriado, descripcion: "Jornada institucional (sin atención)" }),
  );

  const used = new Set<string>();
  const createdAt = (fecha: string, offset: number) =>
    new Date(new Date(`${fecha}T12:00:00-03:00`).getTime() - (offset > 0 ? 3 : 10) * 86_400_000).toISOString();

  const plan = TURNOS.map(([pi, pr, offset, orden, estado]) => {
    const prof = profs[pr];
    const fecha = workingDay(prof.agenda, offset, today, feriado);
    const horas = timesForDate(prof.agenda, fecha);
    let idx = orden % horas.length;
    while (used.has(`${prof.id}|${fecha}|${horas[idx]}`)) idx = (idx + 1) % horas.length;
    const hora = horas[idx];
    used.add(`${prof.id}|${fecha}|${hora}`);
    return { paciente: PACIENTES[pi], prof, offset, fecha, hora, estado };
  });

  const slots = check(
    await db()
      .from("slots")
      .insert(
        plan.map((t) => ({
          professional_id: t.prof.id,
          fecha: t.fecha,
          hora: t.hora,
          is_booked: t.estado !== "CANCELADO",
        })),
      )
      .select("id, professional_id, fecha, hora"),
  ) as { id: number; professional_id: number; fecha: string; hora: string }[];
  const slotId = new Map(slots.map((s) => [`${s.professional_id}|${s.fecha}|${s.hora.slice(0, 5)}`, s.id]));

  check(
    await db()
      .from("appointments")
      .insert(
        plan.map((t) => {
          const cobertura = t.paciente.obraSocial ? obraByName.get(t.paciente.obraSocial)!.cobertura_pct : 0;
          const created = createdAt(t.fecha, t.offset);
          return {
            patient_id: pacienteIdByEmail.get(t.paciente.email),
            professional_id: t.prof.id,
            slot_id: slotId.get(`${t.prof.id}|${t.fecha}|${t.hora}`),
            fecha: t.fecha,
            hora: t.hora,
            estado: t.estado,
            precio: t.prof.precio,
            cobertura_pct: cobertura,
            copago: calcularCopago(t.prof.precio, cobertura),
            motivo_cancelacion: t.estado === "CANCELADO" ? "Cancelado por el paciente" : null,
            created_at: created,
            updated_at: created,
            cancelled_at: t.estado === "CANCELADO" ? created : null,
          };
        }),
      ),
  );

  check(await db().rpc("auto_confirm_appointments"));

  return {
    fechaReferencia: today,
    feriado,
    usuarios: 1 + PROFESIONALES.length + PACIENTES.length,
    turnos: TURNOS.length,
  };
}
