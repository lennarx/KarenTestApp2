# Reporte de defecto: MediTurnos

> Copiá esta plantilla una vez por cada defecto (por ejemplo `BUG-001.md`) o usala como formato en Jira.

| Campo | Valor |
|---|---|
| **ID** | BUG-000 |
| **Título** | _[Módulo] Qué pasa + en qué condición. Ej.: "[Reserva] Se permite reservar con la sesión expirada"_ |
| **Regla / HU violada** | _RN-XX / HU-XX (cita textual de la especificación)_ |
| **Módulo** | Registro / Reserva / Mis turnos / Agenda profesional / Admin |
| **Capa donde se observa** | UI / API / Ambas |
| **Severidad** | Crítica / Alta / Media / Baja |
| **Prioridad** | Alta / Media / Baja |
| **Ambiente** | Local / Producción · navegador y versión · fecha y hora (hora Argentina) |
| **Usuario / rol** | _Ej.: juan.perez@mail.com (paciente)_ |
| **Reportado por / fecha** | |
| **Estado** | Nuevo / Confirmado / En curso / Resuelto / Cerrado / Rechazado |

## Precondiciones
_Estado de los datos antes de empezar (¿restableciste los datos?), turnos existentes, hora del sistema si importa._

## Pasos para reproducir
1.
2.
3.

**Datos usados:** _ids de turnos o slots, fechas, montos, body de la request._

## Resultado esperado
_Qué debería pasar según la especificación._

## Resultado obtenido
_Qué pasó realmente. Si es API: método, URL, status code y body de respuesta._

```http
POST /api/...
Authorization: Bearer ...

{ }
```

```json
HTTP/1.1 200 OK
{ }
```

## Evidencia
_Capturas, video, export de Postman, HAR de DevTools._

## Frecuencia
Siempre / A veces (_x de y intentos_) / Una vez

## Impacto
_¿A quién afecta y cómo? Ej.: el paciente paga de más, se exponen datos de salud, se pierden horarios de atención._

## Notas / hipótesis
_Opcional: sospecha de causa, casos relacionados, workaround._

---

### Guía de severidad

| Severidad | Criterio en MediTurnos |
|---|---|
| **Crítica** | Exposición o modificación de datos de otros pacientes, pérdida de integridad (por ejemplo, datos duplicados o inconsistentes), bloqueo total de un flujo principal. |
| **Alta** | Incumplimiento de una regla de negocio con impacto directo en pacientes o en la clínica (cobros, disponibilidad, cancelaciones). |
| **Media** | Regla incumplida con impacto acotado o con workaround, datos mostrados de forma incorrecta. |
| **Baja** | Cosmético, textos, usabilidad menor. |
