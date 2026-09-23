// Funciones auxiliares compartidas por los tests de MediTurnos.
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// URL de la app. Por defecto, local. Ej. para producción:
//   BASE_URL=https://mediturnos-qa.vercel.app npm test
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Crea el navegador. Con HEADLESS=1 corre sin ventana (útil en CI).
async function crearDriver() {
  const options = new chrome.Options();
  options.addArguments('--window-size=1366,900');
  if (process.env.HEADLESS === '1') options.addArguments('--headless=new');
  return new Builder().forBrowser('chrome').setChromeOptions(options).build();
}

// Busca un elemento por su atributo data-testid y espera a que sea visible.
async function porTestId(driver, testId, timeout = 10000) {
  const el = await driver.wait(until.elementLocated(By.css(`[data-testid="${testId}"]`)), timeout);
  await driver.wait(until.elementIsVisible(el), timeout);
  return el;
}

// Escribe en un input reemplazando lo que tenga.
async function escribir(driver, testId, texto) {
  const input = await porTestId(driver, testId);
  await input.clear();
  await input.sendKeys(texto);
}

// Inicia sesión desde la pantalla de login y espera la redirección.
async function login(driver, email, password, rutaEsperada) {
  await driver.get(`${BASE_URL}/login`);
  await escribir(driver, 'login-email', email);
  await escribir(driver, 'login-password', password);
  await (await porTestId(driver, 'login-submit')).click();
  await driver.wait(until.urlContains(rutaEsperada), 10000);
}

module.exports = { BASE_URL, crearDriver, porTestId, escribir, login, By, until };
