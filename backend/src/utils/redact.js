/**
 * Utilidades de redaccion para logs.
 *
 * Los logs se guardan, se rotan y a veces se envian a terceros. Un telefono o el
 * texto de un mensaje son datos personales: no deben acabar ahi solo porque
 * resulten comodos para depurar.
 */

/**
 * Enmascara un telefono dejando el prefijo y los ultimos 2 digitos.
 * Suficiente para correlacionar eventos del mismo numero sin almacenarlo.
 *
 *   '+34600123456' -> '+34*******56'
 */
function maskPhone(value) {
  const str = String(value || '').trim();
  if (!str) return null;
  if (str.length <= 4) return '*'.repeat(str.length);

  const prefix = str.startsWith('+') ? str.slice(0, 3) : str.slice(0, 2);
  const suffix = str.slice(-2);
  return `${prefix}${'*'.repeat(Math.max(0, str.length - prefix.length - 2))}${suffix}`;
}

module.exports = { maskPhone };
