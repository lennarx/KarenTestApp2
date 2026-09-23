-- MediTurnos: esquema inicial
create extension if not exists citext;

create type user_role as enum ('paciente', 'profesional', 'admin');
create type appointment_status as enum ('PENDIENTE', 'CONFIRMADO', 'ATENDIDO', 'AUSENTE', 'CANCELADO');

create table health_insurances (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  cobertura_pct numeric(5,2) not null check (cobertura_pct >= 0 and cobertura_pct <= 100),
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  password_hash text not null,
  role user_role not null default 'paciente',
  nombre text not null,
  dni text,
  fecha_nacimiento date,
  health_insurance_id bigint references health_insurances(id) on delete set null,
  nro_afiliado text,
  created_at timestamptz not null default now()
);

create table specialties (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  created_at timestamptz not null default now()
);

create table professionals (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references users(id) on delete cascade,
  specialty_id bigint not null references specialties(id),
  matricula text not null,
  precio_consulta numeric(10,2) not null check (precio_consulta >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table schedules (
  id bigint generated always as identity primary key,
  professional_id bigint not null references professionals(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_desde time not null,
  hora_hasta time not null,
  duracion_min smallint not null check (duracion_min between 5 and 240),
  check (hora_hasta > hora_desde)
);
create index schedules_professional_idx on schedules(professional_id);

create table holidays (
  id bigint generated always as identity primary key,
  fecha date not null unique,
  descripcion text not null,
  created_at timestamptz not null default now()
);

create table slots (
  id bigint generated always as identity primary key,
  professional_id bigint not null references professionals(id) on delete cascade,
  fecha date not null,
  hora time not null,
  is_booked boolean not null default false,
  unique (professional_id, fecha, hora)
);
create index slots_fecha_idx on slots(fecha);

create table appointments (
  id bigint generated always as identity primary key,
  patient_id uuid not null references users(id) on delete cascade,
  professional_id bigint not null references professionals(id),
  slot_id bigint references slots(id) on delete set null,
  fecha date not null,
  hora time not null,
  estado appointment_status not null default 'PENDIENTE',
  precio numeric(10,2) not null,
  cobertura_pct numeric(5,2) not null default 0,
  copago numeric(10,2) not null,
  motivo_cancelacion text,
  reprogramaciones smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index appointments_patient_idx on appointments(patient_id);
create index appointments_professional_fecha_idx on appointments(professional_id, fecha);

-- El acceso a datos es exclusivamente server-side con service role.
alter table health_insurances enable row level security;
alter table users enable row level security;
alter table specialties enable row level security;
alter table professionals enable row level security;
alter table schedules enable row level security;
alter table holidays enable row level security;
alter table slots enable row level security;
alter table appointments enable row level security;

-- Confirmación automática: PENDIENTE -> CONFIRMADO a 48h (hora Argentina)
create or replace function auto_confirm_appointments()
returns integer
language sql
set search_path = public
as $$
  with upd as (
    update appointments
       set estado = 'CONFIRMADO', updated_at = now()
     where estado = 'PENDIENTE'
       and ((fecha + hora) at time zone 'America/Argentina/Buenos_Aires') <= now() + interval '48 hours'
    returning 1
  )
  select count(*)::int from upd;
$$;

-- Limpieza total usada por el re-seed
create or replace function reset_data()
returns void
language sql
security definer
set search_path = public
as $$
  truncate appointments, slots, schedules, holidays, professionals, specialties, users, health_insurances
    restart identity cascade;
$$;

revoke execute on function auto_confirm_appointments() from public, anon, authenticated;
revoke execute on function reset_data() from public, anon, authenticated;
grant execute on function auto_confirm_appointments() to service_role;
grant execute on function reset_data() to service_role;
