# Plan de pruebas: MediTurnos

| Campo | Valor |
|---|---|
| Proyecto | MediTurnos |
| Versión / build | |
| Autora | |
| Fecha | |
| Ambiente | Local (`localhost:3000`) / Producción (Vercel) |

## 1. Objetivo
_¿Qué querés lograr con esta ronda de pruebas?_
> Ejemplo: verificar que la app cumple las reglas de negocio RN-01…RN-11 y las historias de usuario de `docs/requerimientos.md`, tanto desde la interfaz como desde la API.

## 2. Alcance

### 2.1 En alcance
| Módulo | Funcionalidades | RN / HU relacionadas | Canal (UI / API) |
|---|---|---|---|
| Registro e inicio de sesión | Registro, login, logout, acceso por rol | RN-08 · HU-01, HU-02 | |
| Búsqueda y reserva | Especialidades, profesionales, calendario, horarios, reserva, copago | RN-02, RN-03, RN-06, RN-09, RN-11 · HU-03…HU-05 | |
| Mis turnos | Historial, detalle, cancelación, reprogramación | RN-01, RN-04, RN-07, RN-10 · HU-06…HU-09 | |
| Agenda del profesional | Vista día/semana, confirmar, atendido, ausente | RN-05 · HU-10, HU-11 | |
| Administración | Profesionales, agenda, especialidades, obras sociales, feriados, reset | RN-09 · HU-12…HU-17 | |

### 2.2 Fuera de alcance
_Ejemplos: performance/carga, compatibilidad con navegadores viejos, accesibilidad completa._

## 3. Estrategia y técnicas
| Técnica | Dónde la voy a aplicar |
|---|---|
| Particiones de equivalencia | |
| Valores límite | |
| Transición de estados | |
| Tablas de decisión | |
| Pruebas de roles y permisos | |
| Pruebas de API (Swagger / Postman) | |
| Pruebas exploratorias | |
| Automatización (Selenium) | |

## 4. Datos de prueba
| Usuario / dato | Uso previsto |
|---|---|
| `maria.gonzalez@mail.com` (40%) | |
| `juan.perez@mail.com` (70%) | |
| `lucia.fernandez@mail.com` (particular) | |
| Profesionales seed | |
| Admin | |
| Usuarios nuevos creados durante las pruebas | |

_Antes de cada ciclo: Admin → Mantenimiento → Restablecer datos._

## 5. Riesgos
| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| _Ej.: datos de salud expuestos a otros pacientes_ | | Alto | |
| _Ej.: cobros de copago incorrectos_ | | | |
| | | | |

## 6. Criterios
- **Entrada:** _app desplegada, datos restablecidos, especificación leída._
- **Salida:** _% de casos ejecutados, sin defectos críticos abiertos, etc._
- **Suspensión:** _¿cuándo frenarías las pruebas?_

## 7. Entregables
- [ ] Matriz de trazabilidad RN/HU → casos
- [ ] Casos de prueba (`test-cases-template.md`)
- [ ] Reportes de defectos (`bug-report-template.md`)
- [ ] Colección de Postman
- [ ] Tests automatizados
- [ ] Informe final

## 8. Cronograma
| Actividad | Inicio | Fin |
|---|---|---|
| Lectura de especificación | | |
| Diseño de casos | | |
| Ejecución UI | | |
| Ejecución API | | |
| Automatización | | |
| Informe | | |
