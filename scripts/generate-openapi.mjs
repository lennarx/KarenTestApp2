// Genera src/generated/openapi.json a partir de los comentarios @openapi de las rutas de la API.
// Se ejecuta automáticamente antes de `npm run dev` y `npm run build`.
import { mkdirSync, writeFileSync } from "node:fs";
import swaggerJsdoc from "swagger-jsdoc";

const errorResponse = (description) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

const definition = {
  openapi: "3.0.3",
  info: {
    title: "MediTurnos API",
    version: "1.0.0",
    description:
      "API de gestión de turnos médicos. Autenticación con JWT: `POST /api/auth/login` devuelve un `token` " +
      "que se envía como `Authorization: Bearer <token>`. En el navegador también se usa la cookie httpOnly `mt_session`. " +
      "Todas las fechas y horarios están en hora de Argentina (GMT-3).",
  },
  servers: [{ url: "/", description: "Servidor actual" }],
  tags: [
    { name: "Auth" },
    { name: "Catálogos" },
    { name: "Turnos" },
    { name: "Profesional" },
    { name: "Admin" },
  ],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      cookieAuth: { type: "apiKey", in: "cookie", name: "mt_session" },
    },
    parameters: {
      AppointmentId: { in: "path", name: "id", required: true, schema: { type: "integer" }, description: "Id del turno" },
      ProfessionalId: { in: "path", name: "id", required: true, schema: { type: "integer" }, description: "Id del profesional" },
    },
    responses: {
      BadRequest: errorResponse("Datos inválidos"),
      Unauthorized: errorResponse("Sin sesión o token inválido"),
      Forbidden: errorResponse("Sin permisos para la operación"),
      NotFound: errorResponse("Recurso inexistente"),
      Conflict: errorResponse("Conflicto con el estado actual (regla de negocio)"),
      Unprocessable: errorResponse("La operación no cumple una regla de negocio"),
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Descripción del error" },
          code: { type: "string", example: "VALIDATION_ERROR" },
        },
      },
      SessionUser: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string" },
          nombre: { type: "string" },
          role: { type: "string", enum: ["paciente", "profesional", "admin"] },
          professionalId: { type: "integer", nullable: true },
        },
      },
      Session: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/SessionUser" },
          token: { type: "string", description: "JWT (HS256), válido por 8 horas" },
        },
      },
      Profile: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string" },
          role: { type: "string" },
          nombre: { type: "string" },
          dni: { type: "string", nullable: true },
          fecha_nacimiento: { type: "string", format: "date", nullable: true },
          nro_afiliado: { type: "string", nullable: true },
          obraSocial: { allOf: [{ $ref: "#/components/schemas/HealthInsurance" }], nullable: true },
          professionalId: { type: "integer", nullable: true },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["nombre", "dni", "email", "fechaNacimiento", "password"],
        properties: {
          nombre: { type: "string", example: "Ana Gómez" },
          dni: { type: "string", pattern: "^\\d{7,8}$", example: "34567890" },
          email: { type: "string", format: "email", example: "ana.gomez@mail.com" },
          fechaNacimiento: { type: "string", format: "date", example: "1992-03-15" },
          obraSocialId: { type: "integer", nullable: true, example: 1 },
          nroAfiliado: { type: "string", nullable: true, example: "40-555666/00" },
          password: { type: "string", minLength: 8, example: "Password1" },
        },
      },
      HealthInsurance: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nombre: { type: "string" },
          cobertura_pct: { type: "number", example: 40 },
        },
      },
      Specialty: {
        type: "object",
        properties: { id: { type: "integer" }, nombre: { type: "string" } },
      },
      Holiday: {
        type: "object",
        properties: {
          id: { type: "integer" },
          fecha: { type: "string", format: "date" },
          descripcion: { type: "string" },
        },
      },
      ScheduleBlock: {
        type: "object",
        required: ["diaSemana", "horaDesde", "horaHasta", "duracionMin"],
        properties: {
          id: { type: "integer", readOnly: true },
          diaSemana: { type: "integer", minimum: 0, maximum: 6, description: "0 = domingo … 6 = sábado", example: 1 },
          horaDesde: { type: "string", example: "08:00" },
          horaHasta: { type: "string", example: "12:00" },
          duracionMin: { type: "integer", minimum: 5, maximum: 240, example: 20 },
        },
      },
      Professional: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nombre: { type: "string" },
          email: { type: "string" },
          matricula: { type: "string" },
          precioConsulta: { type: "number", example: 18450.01 },
          activo: { type: "boolean" },
          especialidad: { $ref: "#/components/schemas/Specialty" },
          agenda: { type: "array", items: { $ref: "#/components/schemas/ScheduleBlock" } },
        },
      },
      Slot: {
        type: "object",
        properties: {
          id: { type: "integer" },
          professionalId: { type: "integer" },
          fecha: { type: "string", format: "date" },
          hora: { type: "string", example: "09:20" },
        },
      },
      Appointment: {
        type: "object",
        properties: {
          id: { type: "integer" },
          fecha: { type: "string", example: "24/09/2026", description: "Fecha en formato dd/mm/yyyy" },
          hora: { type: "string", example: "09:20" },
          inicio: { type: "string", format: "date-time", description: "Inicio del turno en UTC (ISO 8601)" },
          estado: { type: "string", enum: ["PENDIENTE", "CONFIRMADO", "ATENDIDO", "AUSENTE", "CANCELADO"] },
          precio: { type: "number" },
          coberturaPct: { type: "number" },
          copago: { type: "number" },
          reprogramaciones: { type: "integer" },
          motivoCancelacion: { type: "string", nullable: true },
          creadoEn: { type: "string", format: "date-time" },
          canceladoEn: { type: "string", format: "date-time", nullable: true },
          profesional: {
            type: "object",
            properties: {
              id: { type: "integer" },
              nombre: { type: "string" },
              especialidad: { type: "string" },
              matricula: { type: "string" },
            },
          },
          paciente: {
            type: "object",
            properties: {
              id: { type: "string" },
              nombre: { type: "string" },
              dni: { type: "string" },
              obraSocial: { type: "string", nullable: true },
              nroAfiliado: { type: "string", nullable: true },
            },
          },
        },
      },
      AppointmentPage: {
        type: "object",
        properties: {
          items: { type: "array", items: { $ref: "#/components/schemas/Appointment" } },
          page: { type: "integer" },
          pageSize: { type: "integer", example: 10 },
          total: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      Agenda: {
        type: "object",
        properties: {
          view: { type: "string", enum: ["day", "week"] },
          desde: { type: "string", format: "date" },
          hasta: { type: "string", format: "date" },
          turnos: { type: "array", items: { $ref: "#/components/schemas/Appointment" } },
        },
      },
    },
  },
};

const spec = swaggerJsdoc({ definition, apis: ["./src/app/api/**/route.ts"] });
mkdirSync("src/generated", { recursive: true });
writeFileSync("src/generated/openapi.json", JSON.stringify(spec, null, 2));
console.log(`OpenAPI generado: ${Object.keys(spec.paths ?? {}).length} rutas`);
