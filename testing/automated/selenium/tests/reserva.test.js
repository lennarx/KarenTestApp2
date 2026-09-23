// Test de ejemplo: registro de una paciente nueva y reserva de un turno
// Herramientas: Selenium WebDriver + Mocha + Chai

const { expect } = require('chai');
const { BASE_URL, crearDriver, porTestId, escribir, By, until } = require('./helpers');

describe('Reserva de turno', function () {
  let driver;

  // Datos únicos para no chocar con usuarios existentes
  const sufijo = Date.now().toString().slice(-6);
  const paciente = {
    nombre: `Paciente Selenium ${sufijo}`,
    dni: `40${sufijo}`,
    email: `selenium.${sufijo}@test.com`,
    fechaNacimiento: '1990-05-20',
    password: 'Password123',
  };

  before(async function () {
    driver = await crearDriver();
  });

  after(async function () {
    if (driver) await driver.quit();
  });

  // -------------------------------------------------------------------
  // PASO 1: registro por la UI (queda logueada automáticamente)
  // -------------------------------------------------------------------
  it('registra una paciente nueva', async function () {
    await driver.get(`${BASE_URL}/registro`);

    await escribir(driver, 'registro-nombre', paciente.nombre);
    await escribir(driver, 'registro-dni', paciente.dni);
    await escribir(driver, 'registro-email', paciente.email);
    await escribir(driver, 'registro-password', paciente.password);

    // El input de fecha se completa por JavaScript para no depender del formato
    // regional del navegador (dd/mm/aaaa vs mm/dd/aaaa).
    const fecha = await porTestId(driver, 'registro-fechaNacimiento');
    await driver.executeScript(
      `const input = arguments[0];
       const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
       setter.call(input, arguments[1]);
       input.dispatchEvent(new Event('input', { bubbles: true }));`,
      fecha,
      paciente.fechaNacimiento,
    );

    await (await porTestId(driver, 'registro-submit')).click();
    await driver.wait(until.urlContains('/paciente'), 10000);

    const usuario = await porTestId(driver, 'header-user-name');
    expect(await usuario.getText()).to.include(paciente.nombre);
  });

  // -------------------------------------------------------------------
  // PASO 2: elegir especialidad, profesional, día y horario, y reservar
  // -------------------------------------------------------------------
  it('reserva un turno de Cardiología', async function () {
    // 1. Especialidad
    const select = await porTestId(driver, 'especialidad-select');
    await select.findElement(By.xpath(".//option[normalize-space()='Cardiología']")).click();

    // 2. Primer profesional de la lista
    const elegir = await driver.wait(
      until.elementLocated(By.css('[data-testid^="profesional-elegir-"]')),
      10000,
    );
    await elegir.click();

    // 3. Recorre los días habilitados del calendario hasta encontrar uno con horarios
    await porTestId(driver, 'calendar');
    let horario = null;
    for (let intento = 0; intento < 3 && !horario; intento++) {
      const dias = await driver.findElements(By.css('[data-testid^="calendar-day-"]:not([disabled])'));
      for (const dia of dias) {
        await dia.click();
        // Espera a que terminen de cargar los horarios (lista o mensaje de vacío)
        await driver.wait(
          until.elementLocated(By.css('[data-testid="slot-list"], [data-testid="slot-empty"]')),
          10000,
        );
        const slots = await driver.findElements(By.css('[data-testid="slot-list"] button'));
        if (slots.length > 0) {
          horario = slots[0];
          break;
        }
      }
      if (!horario) await (await porTestId(driver, 'calendar-next')).click();
    }
    expect(horario, 'debería haber al menos un horario disponible').to.not.equal(null);

    // 4. Selecciona el horario y confirma
    await horario.click();
    const resumen = await porTestId(driver, 'reserva-resumen');
    expect(await resumen.getText()).to.include('Copago estimado');

    await (await porTestId(driver, 'confirmar-reserva')).click();

    // 5. Verifica el mensaje de éxito
    const exito = await porTestId(driver, 'reserva-exito');
    expect(await exito.getText()).to.include('Turno reservado');
  });

  // -------------------------------------------------------------------
  // PASO 3: el turno aparece en "Mis turnos"
  // -------------------------------------------------------------------
  it('muestra el turno reservado en "Mis turnos"', async function () {
    await driver.get(`${BASE_URL}/paciente/turnos`);
    const tabla = await porTestId(driver, 'historial-tabla');
    const texto = await tabla.getText();

    expect(texto).to.include('Cardiología');
    expect(texto).to.match(/PENDIENTE|CONFIRMADO/);
  });
});
