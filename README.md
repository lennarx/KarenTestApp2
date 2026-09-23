# MediTurnos

Sistema web de **reserva y gestión de turnos médicos con obras sociales**. Es una app de práctica para QA de dificultad media: la funcionalidad está completa y se ve prolija, pero no todo cumple la especificación.

- **Especificación funcional:** [`docs/requerimientos.md`](docs/requerimientos.md), con las reglas de negocio RN-01…RN-11 e historias de usuario con Given/When/Then.
- **Guía de testing:** [`testing/README.md`](testing/README.md).

## URLs

| | Local | Producción |
|---|---|---|
| App | http://localhost:3000 | https://mediturnos-qa.vercel.app |
| Swagger UI | http://localhost:3000/api-docs | https://mediturnos-qa.vercel.app/api-docs |
| OpenAPI (JSON, importable en Postman) | http://localhost:3000/api/swagger | https://mediturnos-qa.vercel.app/api/swagger |

## Credenciales de prueba (seed)

| Rol | Email | Contraseña | Datos |
|---|---|---|---|
| Admin | `admin@mediturnos.com` | `Admin123!` | |
| Profesional | `laura.mendez@mediturnos.com` | `Medico123!` | Clínica Médica · lunes a viernes 08–16 h, sábados 09–13 h · turnos de 20 min |
| Profesional | `martin.aguirre@mediturnos.com` | `Medico123!` | Cardiología · lunes, miércoles y viernes 09–17 h · 30 min |
| Profesional | `sofia.rios@mediturnos.com` | `Medico123!` | Pediatría · lunes a viernes 13–19 h · 20 min |
| Profesional | `pablo.ferreyra@mediturnos.com` | `Medico123!` | Dermatología · martes y jueves 10–18 h, sábados 09–12 h · 30 min |
| Paciente | `maria.gonzalez@mail.com` | `Paciente123!` | Salud Plena (40%) · historial largo (25 turnos) |
| Paciente | `juan.perez@mail.com` | `Paciente123!` | Previsión Médica (70%) |
| Paciente | `lucia.fernandez@mail.com` | `Paciente123!` | Sin obra social (particular) |

Obras sociales: **Salud Plena 40%**, **Previsión Médica 70%**, **Cobertura Total 100%**.

Las fechas del seed son **relativas al día de hoy**: turnos pasados, activos y cancelados, y un día bloqueado como feriado dentro de 15 días. Para volver al estado inicial:

- Desde la UI: login como admin → **Mantenimiento → Restablecer datos**.
- Por API: `POST /api/admin/reset` con sesión de admin.

## Cómo correrla localmente

Requisitos: Node.js 20+ y un proyecto de [Supabase](https://supabase.com) (sirve el plan gratuito).

1. **Instalar dependencias**
   ```bash
   npm install
   ```
2. **Base de datos:** en el SQL Editor de Supabase, ejecutar [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. **Variables de entorno:** copiar `.env.example` a `.env.local` y completar:
   ```bash
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service role / secret key>   # Project Settings → API Keys
   JWT_SECRET=<un string largo y aleatorio>
   ```
4. **Cargar el seed**
   ```bash
   npm run seed
   ```
5. **Levantar la app**
   ```bash
   npm run dev
   ```
   Abrir http://localhost:3000.

Otros scripts: `npm run build`, `npm start`, `npm run lint`, `npm run typecheck`.

## API

La autenticación es con JWT. `POST /api/auth/login` devuelve `token`, que se envía como `Authorization: Bearer <token>`. En el navegador se usa además la cookie httpOnly `mt_session`, así que Swagger UI funciona después de loguearse en la app.

| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| POST | `/api/auth/register` | público | Registro de paciente |
| POST | `/api/auth/login` | público | Login (devuelve JWT) |
| POST | `/api/auth/logout` | público | Logout |
| GET | `/api/auth/me` | logueado | Perfil del usuario |
| GET | `/api/specialties` | público | Especialidades |
| GET | `/api/professionals?specialtyId=` | público | Profesionales activos |
| GET | `/api/professionals/{id}` | público | Detalle y agenda semanal |
| GET | `/api/professionals/{id}/slots?date=YYYY-MM-DD` | público | Horarios libres de un día |
| GET | `/api/holidays` | público | Feriados |
| GET | `/api/health-insurances` | público | Obras sociales |
| GET | `/api/appointments?page=` | paciente | Historial paginado |
| POST | `/api/appointments` | paciente | Reservar `{ slotId }` |
| GET | `/api/appointments/{id}` | paciente (propio), profesional (propio), admin | Detalle de un turno |
| POST | `/api/appointments/{id}/cancel` | paciente | Cancelar |
| POST | `/api/appointments/{id}/reschedule` | paciente | Reprogramar `{ slotId }` |
| PATCH | `/api/appointments/{id}/status` | profesional del turno | `{ estado: CONFIRMADO \| ATENDIDO \| AUSENTE }` |
| GET | `/api/professional/agenda?view=day\|week&date=` | profesional | Agenda |
| GET/POST | `/api/admin/professionals` | admin | Listar / alta |
| PATCH/DELETE | `/api/admin/professionals/{id}` | admin | Modificar / baja lógica |
| GET/PUT | `/api/admin/professionals/{id}/schedule` | admin | Agenda semanal |
| GET/POST | `/api/admin/specialties` | admin | Listar / crear |
| PATCH/DELETE | `/api/admin/specialties/{id}` | admin | Renombrar / eliminar |
| POST | `/api/admin/health-insurances` | admin | Crear obra social |
| PATCH/DELETE | `/api/admin/health-insurances/{id}` | admin | Modificar / eliminar |
| POST | `/api/admin/holidays` | admin | Bloquear día |
| DELETE | `/api/admin/holidays/{id}` | admin | Desbloquear día |
| POST | `/api/admin/reset` | admin | Restablecer datos |

El detalle completo, con los schemas, está en Swagger (`/api-docs`).

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Supabase Postgres, con acceso solo del lado del servidor mediante service role
- Autenticación propia: bcryptjs + JWT (jose) en cookie httpOnly
- swagger-jsdoc + swagger-ui-react
- Deploy en Vercel

## Estructura

```
src/app/            páginas (paciente, profesional, admin) y API (src/app/api/**)
src/lib/            dominio: auth, turnos, slots, copago, fechas, seed
src/components/     componentes de UI
supabase/           migraciones SQL
scripts/            seed y generación del OpenAPI
docs/               especificación de requerimientos
testing/            plantillas de QA y tests automatizados (Selenium)
```
