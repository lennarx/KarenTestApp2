# MediTurnos: especificación de requerimientos

**Versión:** 1.0
**Producto:** MediTurnos, sistema web de reserva y gestión de turnos médicos con obras sociales.
**Zona horaria de negocio:** America/Argentina/Buenos_Aires (GMT-3). Todas las fechas y horas de esta especificación se interpretan en hora de Argentina.

---

## 1. Alcance

MediTurnos permite:

- A los **pacientes**: registrarse, buscar profesionales por especialidad, reservar, cancelar y reprogramar turnos, y consultar su historial.
- A los **profesionales**: ver su agenda y registrar la asistencia de los pacientes.
- A los **administradores**: gestionar profesionales, especialidades, agendas, feriados y obras sociales.

La aplicación ofrece una interfaz web y una API REST documentada en `/api-docs`. **Las reglas de negocio aplican a ambas por igual**: cualquier restricción que muestre la interfaz también debe hacerla cumplir la API.

## 2. Roles

| Rol | Descripción |
|---|---|
| Paciente | Persona que reserva turnos. Se registra sola. Puede tener una obra social. |
| Profesional | Médico/a con una especialidad, una matrícula, un valor de consulta y una agenda semanal. Lo da de alta el administrador. |
| Admin | Personal administrativo de la clínica. |

## 3. Estados de un turno

```
PENDIENTE ──(automático 48 h antes, o manual por el profesional)──> CONFIRMADO
PENDIENTE / CONFIRMADO ──> ATENDIDO | AUSENTE   (profesional, el día del turno o después)
PENDIENTE / CONFIRMADO ──> CANCELADO            (paciente, o bloqueo de feriado)
```

- **PENDIENTE:** turno recién reservado.
- **CONFIRMADO:** el sistema lo confirma automáticamente cuando faltan 48 h o menos para el turno. El profesional también puede confirmarlo manualmente.
- **ATENDIDO / AUSENTE / CANCELADO:** estados finales; el turno ya no admite cambios.
- Se llama **turno activo** a un turno en estado PENDIENTE o CONFIRMADO.

## 4. Reglas de negocio

| ID | Regla |
|---|---|
| **RN-01** | Un paciente puede cancelar un turno sin penalidad **hasta 24 horas antes inclusive** del horario del turno, en hora de Argentina. Con menos de 24 horas de anticipación, el turno no se puede cancelar. |
| **RN-02** | Un paciente puede tener como **máximo 3 turnos activos** (PENDIENTE + CONFIRMADO) al mismo tiempo. |
| **RN-03** | Un horario (slot) de un profesional solo puede tener **un turno activo**. |
| **RN-04** | Un paciente solo puede **ver y operar sus propios turnos**. |
| **RN-05** | Solo el **profesional del turno** puede cambiar su estado a ATENDIDO o AUSENTE, y solo si la fecha del turno **ya pasó o es hoy**. |
| **RN-06** | **Copago = valor de la consulta × (1 − cobertura%)**, redondeado a 2 decimales con redondeo *half-up* (0,005 → 0,01). Un paciente sin obra social paga el 100%. |
| **RN-07** | **Reprogramar** un turno lo mueve a otro horario libre del mismo profesional, **libera el horario original** y recalcula el copago **una sola vez** con la cobertura vigente. El turno vuelve a PENDIENTE. La reprogramación sigue las mismas condiciones de anticipación que la cancelación (RN-01) y las mismas condiciones de fecha que una reserva (RN-09, RN-11). |
| **RN-08** | **DNI:** 7 u 8 dígitos numéricos. **Fecha de nacimiento:** no puede ser futura. **Email:** único, sin distinguir mayúsculas de minúsculas. **Contraseña:** mínimo 8 caracteres. |
| **RN-09** | Al **bloquear un feriado**, los turnos activos de ese día pasan a CANCELADO y el día **no ofrece horarios**, ni en la interfaz ni en la API. |
| **RN-10** | El **historial** de turnos del paciente se ordena por fecha y hora reales en orden **descendente** y se pagina de a **10** turnos por página, sin repetir ni omitir registros. |
| **RN-11** | No se puede reservar un turno **en el pasado** ni con **más de 60 días** de anticipación. |

### Reglas complementarias

- Los horarios disponibles se generan a partir de la agenda semanal del profesional: día de la semana, rango horario y duración de cada turno.
- Un profesional dado de baja (inactivo) no aparece en las búsquedas ni ofrece horarios. Sus turnos existentes no se modifican.
- Los cambios de valor de consulta o de % de cobertura aplican a las reservas y reprogramaciones posteriores al cambio. No modifican turnos ya reservados.
- Una sesión dura 8 horas.

---

## 5. Historias de usuario y criterios de aceptación

### Módulo A: Registro e inicio de sesión

**HU-01: Registro de paciente**
*Como* persona que necesita atenderse, *quiero* crear una cuenta *para* poder reservar turnos.

- **Escenario 1: registro exitoso**
  *Given* que estoy en `/registro`
  *When* completo nombre, un DNI de 8 dígitos, un email no registrado, una fecha de nacimiento pasada, una contraseña de 8+ caracteres y (opcionalmente) mi obra social y número de afiliado
  *Then* se crea mi cuenta de paciente, quedo logueado y voy a "Reservar turno".
- **Escenario 2: DNI inválido**
  *Given* que estoy registrándome
  *When* ingreso un DNI con letras, puntos o con menos de 7 o más de 8 dígitos
  *Then* el sistema rechaza el registro con un mensaje de validación (en la UI y en la API).
- **Escenario 3: fecha de nacimiento futura**
  *When* ingreso una fecha de nacimiento posterior a hoy
  *Then* el registro se rechaza (en la UI y en la API).
- **Escenario 4: email duplicado**
  *Given* que existe una cuenta con `juan.perez@mail.com`
  *When* intento registrarme con `JUAN.PEREZ@mail.com`
  *Then* el sistema informa que el email ya está registrado (HTTP 409).

**HU-02: Inicio de sesión**
*Como* usuario registrado, *quiero* iniciar sesión *para* acceder a las funciones de mi rol.

- *Given* credenciales válidas, *When* inicio sesión, *Then* voy a la pantalla de mi rol (paciente: Reservar turno; profesional: Mi agenda; admin: Profesionales).
- *Given* una contraseña incorrecta, *When* intento ingresar, *Then* veo "Email o contraseña incorrectos" (HTTP 401) sin que se indique cuál de los dos datos falló.
- *Given* que no inicié sesión, *When* entro a `/paciente`, `/profesional` o `/admin`, *Then* se me redirige al login.
- *Given* que soy paciente, *When* entro a `/admin`, *Then* se me redirige a mi pantalla. La API responde 403 a los endpoints de otros roles.

### Módulo B: Búsqueda y reserva de turnos

**HU-03: Buscar profesionales por especialidad**
*Como* paciente, *quiero* elegir una especialidad y ver sus profesionales *para* decidir con quién atenderme.

- *Given* que elijo "Cardiología", *When* se carga la lista, *Then* veo solo los profesionales activos de esa especialidad, con matrícula, valor de consulta y mi copago estimado según mi obra social.

**HU-04: Ver horarios disponibles**
*Como* paciente, *quiero* ver los días y horarios libres de un profesional.

- *Given* que elegí un profesional, *When* veo el calendario, *Then* solo puedo elegir días entre hoy y hoy + 60 días en los que el profesional atiende, excluyendo feriados.
- *Given* que elijo un día, *Then* veo los horarios libres de ese día. No aparecen horarios ya pasados ni horarios ocupados.
- *Given* un día bloqueado como feriado, *When* consulto sus horarios (UI o API), *Then* no hay horarios disponibles (RN-09).

**HU-05: Reservar un turno**
*Como* paciente, *quiero* reservar un horario libre.

- **Escenario 1: reserva exitosa**
  *Given* que tengo menos de 3 turnos activos y elegí un horario libre
  *When* confirmo la reserva
  *Then* se crea el turno en estado PENDIENTE (o CONFIRMADO si faltan 48 h o menos), con el copago de RN-06, y el horario deja de estar disponible.
- **Escenario 2: límite de turnos activos (RN-02)**
  *Given* que ya tengo 3 turnos activos, en cualquier combinación de PENDIENTE y CONFIRMADO
  *When* intento reservar otro
  *Then* el sistema lo rechaza (HTTP 409).
- **Escenario 3: horario ocupado (RN-03)**
  *Given* que otro paciente ya reservó ese horario
  *When* intento reservarlo
  *Then* la reserva se rechaza (HTTP 409); nunca puede haber dos turnos activos en el mismo horario.
- **Escenario 4: fechas fuera de rango (RN-11)**
  *When* intento reservar un horario pasado o a más de 60 días
  *Then* la reserva se rechaza.
- **Escenario 5: copago (RN-06)**
  *Given* un valor de consulta de $10.000,05 y una cobertura del 30%
  *When* reservo
  *Then* el copago es $7.000,04 (10.000,05 × 0,70 = 7.000,035 → redondeo half-up a 2 decimales).

### Módulo C: Gestión de mis turnos

**HU-06: Historial de turnos**
*Como* paciente, *quiero* ver todos mis turnos *para* llevar control de mi atención.

- *Given* que tengo 25 turnos, *When* abro "Mis turnos", *Then* veo 3 páginas (10, 10 y 5 turnos), ordenadas del turno más reciente al más antiguo según su fecha y hora reales, sin turnos repetidos ni faltantes entre páginas (RN-10).
- Cada fila muestra fecha (dd/mm/aaaa), hora, profesional, especialidad, estado y copago.

**HU-07: Detalle de un turno**
- *Given* que soy el paciente del turno, *When* abro su detalle, *Then* veo profesional, fecha, hora, valor, cobertura, copago y estado.
- *Given* que el turno es de otro paciente, *When* intento verlo por URL o por API, *Then* el acceso se deniega (HTTP 403/404) (RN-04).

**HU-08: Cancelar un turno**
- *Given* un turno activo propio que empieza dentro de 24 horas o más, *When* lo cancelo, *Then* pasa a CANCELADO y su horario vuelve a estar disponible.
- *Given* un turno que empieza dentro de menos de 24 horas, *When* intento cancelarlo, *Then* se rechaza (HTTP 409) (RN-01).
- *Given* un turno ATENDIDO, AUSENTE o CANCELADO, *When* intento cancelarlo, *Then* se rechaza.

**HU-09: Reprogramar un turno**
- *Given* un turno activo propio que empieza dentro de 24 horas o más, *When* elijo otro horario libre del mismo profesional y confirmo, *Then* el turno pasa al nuevo horario en estado PENDIENTE, el copago se recalcula una vez y **el horario original queda libre** para otros pacientes (RN-07).
- *When* intento reprogramar a un horario de otro profesional, ocupado, pasado, a más de 60 días o en un feriado, *Then* se rechaza.

### Módulo D: Agenda del profesional

**HU-10: Ver mi agenda**
*Como* profesional, *quiero* ver mis turnos del día o de la semana.

- *Given* que soy profesional, *When* abro "Mi agenda", *Then* veo los turnos del día (o de lunes a domingo en la vista semanal) con hora, paciente, DNI, obra social y estado. Puedo navegar entre días o semanas.
- La agenda muestra solo mis turnos.

**HU-11: Registrar asistencia**
- *Given* un turno activo mío de hoy o de una fecha pasada, *When* lo marco ATENDIDO o AUSENTE, *Then* el estado se actualiza.
- *Given* un turno activo mío de una fecha futura, *When* intento marcarlo ATENDIDO o AUSENTE, *Then* se rechaza (HTTP 409) (RN-05).
- *Given* un turno PENDIENTE mío, *When* lo confirmo, *Then* pasa a CONFIRMADO.
- *Given* que soy paciente, u otro profesional, *When* intento cambiar el estado de un turno por API, *Then* recibo HTTP 403 (RN-05).

### Módulo E: Administración

**HU-12: Gestión de profesionales**
- *When* doy de alta un profesional con nombre, email, contraseña inicial, especialidad, matrícula y valor de consulta, *Then* puede iniciar sesión y aparece en las búsquedas cuando tiene agenda.
- *When* modifico el valor de consulta, *Then* aplica a las nuevas reservas.
- *When* doy de baja un profesional, *Then* deja de aparecer en las búsquedas y de ofrecer horarios.

**HU-13: Agenda semanal**
- *When* defino bloques (día, hora desde, hora hasta, duración), *Then* se ofrecen horarios según esos bloques. Los horarios ya reservados se conservan.
- Se rechazan bloques con horarios inválidos, superpuestos en el mismo día o con duración fuera de 5–240 minutos.

**HU-14: Especialidades**
- Puedo crear, renombrar y eliminar especialidades. No puedo eliminar una especialidad con profesionales asociados, ni crear nombres duplicados.

**HU-15: Obras sociales**
- Puedo crear obras sociales con un % de cobertura entre 0 y 100 (acepta decimales) y modificar el %. Al eliminar una obra social, sus afiliados pasan a ser particulares.

**HU-16: Feriados**
- *Given* un día con turnos activos, *When* lo bloqueo como feriado, *Then* esos turnos pasan a CANCELADO y el sistema informa cuántos se cancelaron. El día deja de ofrecer horarios en la UI y en la API (RN-09).
- No se pueden bloquear fechas pasadas ni bloquear dos veces la misma fecha.
- Al desbloquear el día, vuelve a ofrecer horarios. Los turnos cancelados siguen cancelados.

**HU-17: Restablecer datos**
- *When* ejecuto "Restablecer datos" (o `POST /api/admin/reset`), *Then* se borran todos los datos y se carga el set inicial con fechas relativas al día de hoy.

---

## 6. Requerimientos no funcionales

- La API responde en JSON. Los errores tienen la forma `{ "error": "mensaje", "code": "CODIGO" }` y usan los códigos HTTP 400, 401, 403, 404, 409 y 422.
- Autenticación: JWT (HS256) en la cookie httpOnly `mt_session` o en el header `Authorization: Bearer`.
- Las contraseñas se almacenan hasheadas (bcrypt).
- Los montos se muestran en pesos argentinos con 2 decimales.
- Todos los elementos interactivos de la interfaz tienen el atributo `data-testid`.
