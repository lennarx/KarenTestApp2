# Testing con MediTurnos: guía de aprendizaje

¡Bienvenida a tu segunda práctica! Después de KarenShop, MediTurnos sube un escalón. Esta vez la app **se ve prolija y "funciona"**: los flujos principales andan y no hay errores evidentes en pantalla. Los problemas aparecen cuando comparás el comportamiento contra la especificación, cuando usás la API directamente o cuando combinás acciones.

Tu fuente de verdad es [`docs/requerimientos.md`](../docs/requerimientos.md). Si la app hace algo distinto de lo que dice ese documento, es un defecto, por más que "parezca razonable".

---

## Ruta de aprendizaje

### Paso 1: Leé la especificación antes de tocar la app
1. Leé completo `docs/requerimientos.md`: reglas de negocio (RN-01…RN-11), estados de un turno e historias de usuario.
2. Anotá tus dudas. Una especificación también puede tener ambigüedades, y detectarlas es parte del trabajo de QA.
3. Armá una **matriz de trazabilidad** simple: cada RN y cada HU con los casos de prueba que la cubren.

### Paso 2: Conocé la app como usuaria
1. Abrí la app (ver URLs y credenciales en el [README principal](../README.md)).
2. Recorrela con **los tres roles**: paciente, profesional y admin.
3. Hacé el camino feliz completo: buscá un profesional, reservá, mirá el historial, cancelá, reprogramá, entrá como profesional y registrá una asistencia.
4. Si necesitás volver al estado inicial: **Admin → Mantenimiento → Restablecer datos**.

### Paso 3: Plan de pruebas
Completá `manual/test-plan-template.md`: alcance, módulos, riesgos, técnicas, datos de prueba y criterios de salida.

### Paso 4: Diseño de casos
Usá `manual/test-cases-template.md`. Algunas técnicas que te van a servir:
- **Valores límite:** los números y las fechas de la especificación tienen bordes. ¿Qué pasa justo en el borde, un poco antes y un poco después?
- **Particiones de equivalencia:** datos válidos e inválidos para cada campo.
- **Transición de estados:** el diagrama de estados del turno dice qué cambios son válidos y quién puede hacerlos.
- **Tablas de decisión:** reglas que combinan varias condiciones.
- **Cálculos:** verificá los resultados a mano, con calculadora o planilla.

### Paso 5: Ejecución y reporte
Ejecutá tus casos y reportá cada defecto con `manual/bug-report-template.md`. Un buen reporte incluye la regla violada, pasos reproducibles, datos usados, resultado esperado vs. obtenido y evidencia (captura, request/response).

### Paso 6: Testing de API
La interfaz es solo **uno** de los clientes del sistema. Las reglas de negocio tienen que cumplirse igual cuando alguien llama a la API directamente.
1. Abrí Swagger en `/api-docs` y leé la documentación de cada endpoint.
2. Importá `/api/swagger` en Postman (**Import → Link**) para tener la colección completa.
3. Hacé login con `POST /api/auth/login`, copiá el `token` y configuralo como **Bearer Token** en la colección.
4. Repetí por API los casos que ya probaste en la UI, y probá también lo que la UI no te deja hacer.
5. Usá las **DevTools del navegador** (pestaña Network) para ver qué requests hace la UI y con qué datos.

### Paso 7: Testing automatizado
En `automated/selenium/` hay 3 tests de ejemplo (Selenium + Mocha + Chai) que cubren caminos felices. Seguí las instrucciones de su README para correrlos y después:
- Agregá tus propios tests automatizados para los casos que diseñaste.
- Probá automatizar también pruebas de API (por ejemplo con `fetch` desde Mocha, o con colecciones de Postman y Newman).

---

## ¿Cuántos bugs hay?

Hay **12 bugs**. Algunos se encuentran desde la interfaz leyendo con atención; otros solo aparecen trabajando con la API o combinando acciones.

Cuando creas que los encontraste todos, pedile a Franco la lista oficial para comparar. ¡Éxitos!
