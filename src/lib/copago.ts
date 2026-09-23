/**
 * Copago que abona el paciente: precio × (1 − cobertura%), a 2 decimales.
 * Se opera en centavos para evitar errores de punto flotante.
 */
export function calcularCopago(precio: number, coberturaPct: number): number {
  const centavos = Math.round(precio * 100);
  return Math.floor((centavos * (100 - coberturaPct)) / 100) / 100;
}
