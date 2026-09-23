# Tests automatizados: Selenium + Mocha + Chai

Suite de **ejemplo** con 3 archivos de tests que cubren caminos felices de MediTurnos. La idea es que te sirvan de base para escribir tus propios tests.

| Archivo | Qué prueba |
|---|---|
| `tests/login.test.js` | Pantalla de login, ingreso de una paciente y cierre de sesión |
| `tests/reserva.test.js` | Registro de una paciente nueva y reserva de un turno desde la UI |
| `tests/agenda-profesional.test.js` | Agenda de la profesional: vista día, vista semana y turnos listados |
| `tests/helpers.js` | Funciones reutilizables (crear el driver, buscar por `data-testid`, login) |

## Requisitos

- Node.js 20+
- Google Chrome instalado. **Selenium Manager** descarga automáticamente el ChromeDriver compatible, así que no hace falta instalarlo aparte.
- La app corriendo en `http://localhost:3000` (ver el README principal) o una URL desplegada.

## Instalación y ejecución

```bash
cd testing/automated/selenium
npm install

npm test                 # todos los tests
npm run test:login       # solo login
npm run test:reserva     # solo reserva
npm run test:agenda      # solo agenda de la profesional
```

Variables opcionales:

```bash
BASE_URL=https://mediturnos-qa.vercel.app npm test   # contra producción
HEADLESS=1 npm test                                  # sin abrir la ventana del navegador
```

En Windows (PowerShell): `$env:BASE_URL="https://..."; npm test`.

> Recomendación: antes de correr la suite, restablecé los datos (**Admin → Mantenimiento → Restablecer datos**).

## Cómo están escritos

- Todos los elementos interactivos de la app tienen un atributo `data-testid`. Es el selector más estable, porque no cambia si cambian los textos o los estilos: `By.css('[data-testid="login-submit"]')`.
- Se usan **esperas explícitas** (`driver.wait(until...)`) en lugar de `sleep`, para que los tests sean rápidos y estables.
- Cada test es independiente de los datos exactos del día: por ejemplo, la reserva busca el primer horario libre en lugar de uno fijo.

Algunos `data-testid` útiles:

| Pantalla | data-testid |
|---|---|
| Login | `login-email`, `login-password`, `login-submit`, `login-error` |
| Registro | `registro-nombre`, `registro-dni`, `registro-email`, `registro-fechaNacimiento`, `registro-obraSocialId`, `registro-nroAfiliado`, `registro-password`, `registro-submit`, `registro-error-<campo>` |
| Reserva | `especialidad-select`, `profesional-elegir-<id>`, `calendar-day-<YYYY-MM-DD>`, `calendar-next`, `slot-<HHMM>`, `reserva-copago`, `confirmar-reserva`, `reserva-exito`, `reserva-error` |
| Mis turnos | `historial-tabla`, `historial-fila-<id>`, `historial-pagina-<n>`, `historial-siguiente`, `turno-estado`, `turno-copago`, `cancelar-turno`, `confirmar-cancelacion`, `reprogramar-turno` |
| Agenda | `agenda-vista-dia`, `agenda-vista-semana`, `agenda-siguiente`, `agenda-turno-<id>`, `agenda-atendido-<id>`, `agenda-ausente-<id>`, `agenda-confirmar-<id>` |

## Ideas para seguir

- Casos negativos del registro (cada validación del formulario).
- Cancelación y reprogramación de turnos.
- Flujos de admin (alta de profesional, agenda, feriados).
- Tests de API con `fetch` desde Mocha, comparando los resultados con la especificación.
- Patrón **Page Object** para ordenar los selectores por pantalla.
