# Casos de prueba: MediTurnos

## Convenciones
- **ID:** `CP-<MÓDULO>-<NN>`. Módulos: `AUTH`, `RES` (reserva), `TUR` (mis turnos), `PRO` (profesional), `ADM` (admin), `API`.
- **Prioridad:** Alta / Media / Baja.
- **Tipo:** Funcional, Negativo, Límite, Seguridad/Permisos, API, Regresión.
- **Resultado:** ✅ Pasó · ❌ Falló (con link al bug) · ⏸ Bloqueado · ➖ No ejecutado.

## Matriz de trazabilidad

| Regla / HU | Casos que la cubren |
|---|---|
| RN-01 | |
| RN-02 | |
| RN-03 | |
| RN-04 | |
| RN-05 | |
| RN-06 | |
| RN-07 | |
| RN-08 | |
| RN-09 | |
| RN-10 | |
| RN-11 | |

---

## Plantilla

### CP-XXX-00: _Título descriptivo_

| Campo | Valor |
|---|---|
| Regla / HU | |
| Prioridad | |
| Tipo | |
| Canal | UI / API |
| Precondiciones | |
| Datos de prueba | |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |

| Resultado obtenido | Estado | Bug | Fecha / ejecutora |
|---|---|---|---|
| | | | |

---

## Ejemplos completos

### CP-AUTH-01: Login exitoso de paciente

| Campo | Valor |
|---|---|
| Regla / HU | HU-02 |
| Prioridad | Alta |
| Tipo | Funcional |
| Canal | UI |
| Precondiciones | Datos restablecidos. Sesión cerrada. |
| Datos de prueba | `maria.gonzalez@mail.com` / `Paciente123!` |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Ir a `/login` | Se muestra el formulario de ingreso |
| 2 | Ingresar email y contraseña válidos | |
| 3 | Click en "Ingresar" | Redirige a "Reservar turno". El encabezado muestra "María González · paciente" y la cobertura "Salud Plena (40%)" |

| Resultado obtenido | Estado | Bug | Fecha / ejecutora |
|---|---|---|---|
| | | | |

### CP-RES-01: Reserva de turno con obra social

| Campo | Valor |
|---|---|
| Regla / HU | HU-05, RN-06 |
| Prioridad | Alta |
| Tipo | Funcional |
| Canal | UI |
| Precondiciones | Logueada como un paciente con obra social y menos de 3 turnos activos |
| Datos de prueba | Especialidad Cardiología, primer día hábil disponible |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Elegir la especialidad "Cardiología" | Se listan los profesionales de Cardiología con valor de consulta y copago estimado |
| 2 | Elegir el profesional | Se habilita el calendario solo en días que atiende, entre hoy y hoy + 60 días |
| 3 | Elegir un día y un horario | Se muestra el resumen con fecha, hora y copago |
| 4 | Calcular a mano: valor × (1 − cobertura%), redondeado half-up a 2 decimales | Coincide con el copago mostrado |
| 5 | Click en "Confirmar reserva" | Mensaje de éxito. El horario desaparece de la lista. El turno aparece en "Mis turnos" como PENDIENTE (o CONFIRMADO si faltan ≤ 48 h) |

| Resultado obtenido | Estado | Bug | Fecha / ejecutora |
|---|---|---|---|
| | | | |

### CP-API-01: Login por API y uso del token

| Campo | Valor |
|---|---|
| Regla / HU | HU-02 |
| Prioridad | Media |
| Tipo | API |
| Canal | Postman / Swagger |
| Precondiciones | Colección importada desde `/api/swagger` |
| Datos de prueba | `juan.perez@mail.com` / `Paciente123!` |

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | `POST /api/auth/login` con `{ "email": "...", "password": "..." }` | 200 con `user` y `token` |
| 2 | Configurar `Authorization: Bearer <token>` | |
| 3 | `GET /api/auth/me` | 200 con el perfil de Juan y su obra social |
| 4 | `GET /api/auth/me` sin token | 401 |

| Resultado obtenido | Estado | Bug | Fecha / ejecutora |
|---|---|---|---|
| | | | |

---

## Casos a diseñar (ideas por módulo)

- **AUTH:** validaciones de cada campo del registro (valores válidos, inválidos y límites), login con credenciales incorrectas, acceso a pantallas de otro rol.
- **RES:** búsqueda por especialidad, calendario y horarios disponibles, reglas de la reserva, copago con cada obra social y sin obra social.
- **TUR:** historial, detalle, cancelación y reprogramación.
- **PRO:** vistas de la agenda y cambios de estado.
- **ADM:** CRUD de cada entidad, validaciones y efectos de cada cambio sobre el resto del sistema.
- **API:** repetí los casos anteriores llamando a los endpoints directamente.

_Tip: por cada regla de la especificación, preguntate "¿cómo podría romperse?"._
