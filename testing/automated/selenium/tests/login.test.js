// Tests de ejemplo: inicio de sesión de paciente
// Herramientas: Selenium WebDriver + Mocha + Chai

const { expect } = require('chai');
const { BASE_URL, crearDriver, porTestId, login, until } = require('./helpers');

describe('Login de paciente', function () {
  let driver;

  // Abre el navegador una vez antes de todos los tests del bloque
  before(async function () {
    driver = await crearDriver();
  });

  // Cierra el navegador al terminar
  after(async function () {
    if (driver) await driver.quit();
  });

  // -------------------------------------------------------------------
  // TEST 1: la pantalla de login muestra el formulario
  // -------------------------------------------------------------------
  it('muestra el formulario de ingreso', async function () {
    await driver.get(`${BASE_URL}/login`);

    const form = await porTestId(driver, 'login-form');
    expect(await form.isDisplayed()).to.equal(true);
    expect(await driver.getTitle()).to.include('MediTurnos');
  });

  // -------------------------------------------------------------------
  // TEST 2: una paciente con credenciales válidas entra a "Reservar turno"
  // -------------------------------------------------------------------
  it('permite ingresar a una paciente con credenciales válidas', async function () {
    await login(driver, 'maria.gonzalez@mail.com', 'Paciente123!', '/paciente');

    // El encabezado muestra el nombre de la usuaria logueada
    const usuario = await porTestId(driver, 'header-user-name');
    expect(await usuario.getText()).to.include('María González');

    // La pantalla de reserva muestra la cobertura de su obra social
    // (se espera a que termine de cargar el selector de especialidades)
    await porTestId(driver, 'especialidad-select');
    const cuerpo = await driver.findElement({ css: 'main' }).getText();
    expect(cuerpo).to.include('Reservar turno');
    expect(cuerpo).to.include('Salud Plena');
  });

  // -------------------------------------------------------------------
  // TEST 3: cerrar sesión vuelve al login
  // -------------------------------------------------------------------
  it('permite cerrar sesión', async function () {
    await (await porTestId(driver, 'logout-button')).click();
    await driver.wait(until.urlContains('/login'), 10000);
    expect(await driver.getCurrentUrl()).to.include('/login');
  });
});
