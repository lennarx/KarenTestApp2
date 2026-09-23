// Test de ejemplo: agenda de la profesional
// Herramientas: Selenium WebDriver + Mocha + Chai

const { expect } = require('chai');
const { crearDriver, porTestId, login, By, until } = require('./helpers');

describe('Agenda de la profesional', function () {
  let driver;

  before(async function () {
    driver = await crearDriver();
    await login(driver, 'laura.mendez@mediturnos.com', 'Medico123!', '/profesional');
  });

  after(async function () {
    if (driver) await driver.quit();
  });

  // -------------------------------------------------------------------
  // TEST 1: al ingresar se muestra la agenda del día
  // -------------------------------------------------------------------
  it('muestra la agenda del día al ingresar', async function () {
    const rango = await porTestId(driver, 'agenda-rango');
    const hoy = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date());

    expect(await rango.getText()).to.include(hoy);
  });

  // -------------------------------------------------------------------
  // TEST 2: la vista semanal muestra el rango de lunes a domingo
  // -------------------------------------------------------------------
  it('cambia a la vista semanal', async function () {
    await (await porTestId(driver, 'agenda-vista-semana')).click();

    await driver.wait(async () => {
      const texto = await (await porTestId(driver, 'agenda-rango')).getText();
      return texto.startsWith('Semana del');
    }, 10000);

    const texto = await (await porTestId(driver, 'agenda-rango')).getText();
    expect(texto).to.match(/^Semana del \d{2}\/\d{2}\/\d{4} al \d{2}\/\d{2}\/\d{4}$/);
  });

  // -------------------------------------------------------------------
  // TEST 3: en las semanas siguientes hay turnos con paciente y estado
  // -------------------------------------------------------------------
  it('lista turnos con paciente y estado al navegar las semanas', async function () {
    let filas = [];
    // Avanza hasta 3 semanas buscando turnos (el seed siempre tiene turnos futuros)
    for (let i = 0; i < 3 && filas.length === 0; i++) {
      await (await porTestId(driver, 'agenda-siguiente')).click();
      await driver.wait(
        until.elementLocated(By.css('[data-testid^="agenda-tabla-"], [data-testid="agenda-vacia"]')),
        10000,
      );
      filas = await driver.findElements(By.css('[data-testid^="agenda-turno-"]'));
    }

    expect(filas.length).to.be.greaterThan(0);
    const texto = await filas[0].getText();
    expect(texto).to.match(/\d{2}:\d{2}/);
    expect(texto).to.match(/PENDIENTE|CONFIRMADO|ATENDIDO|AUSENTE|CANCELADO/);
  });
});
