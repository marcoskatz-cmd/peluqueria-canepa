/**
 * Auth.gs — Dos PINs (caja y panel) guardados como hash en CONFIG.
 * El token firmado lleva el rol y dura 90 días: la tablet no vuelve a pedir PIN.
 */
var TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
var HASH_ITER = 5000;
var PROP_SECRET = 'TOKEN_SECRET';
var ROLES = { CAJA: 'caja', PANEL: 'panel' };
var PIN_DEFAULT = { caja: '1111', panel: '2222' };

function hashPin_(pin) {
  var salt = Utilities.getUuid().replace(/-/g, '');
  return salt + '$' + hashConSalt_(String(pin), salt);
}
function verifyPin_(pin, almacenado) {
  if (!almacenado || String(almacenado).indexOf('$') < 0) return false;
  var p = String(almacenado).split('$');
  return hashConSalt_(String(pin), p[0]) === p[1];
}
function hashConSalt_(pin, salt) {
  var v = salt + '|' + pin;
  for (var i = 0; i < HASH_ITER; i++) {
    v = bytesAHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + v));
  }
  return v;
}
function bytesAHex_(bytes) {
  var s = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    s += (b < 16 ? '0' : '') + b.toString(16);
  }
  return s;
}

function secreto_() {
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty(PROP_SECRET);
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty(PROP_SECRET, s); }
  return s;
}
function firmar_(texto) {
  return bytesAHex_(Utilities.computeHmacSha256Signature(texto, secreto_()));
}

function loginPin_(pin) {
  pin = str_(pin);
  if (!/^\d{4,8}$/.test(pin)) throw new Error('El PIN tiene que ser numérico (4 a 8 dígitos).');
  var rol = null;
  if (verifyPin_(pin, getConfig_('pin_caja_hash'))) rol = ROLES.CAJA;
  else if (verifyPin_(pin, getConfig_('pin_panel_hash'))) rol = ROLES.PANEL;
  if (!rol) throw new Error('PIN incorrecto.');
  var exp = Date.now() + TOKEN_TTL_MS;
  var cuerpo = rol + '|' + exp;
  return { token: cuerpo + '|' + firmar_(cuerpo), rol: rol, exp: exp };
}

function validarToken_(token) {
  var p = String(token || '').split('|');
  if (p.length !== 3) throw new Error('SESION_INVALIDA');
  var cuerpo = p[0] + '|' + p[1];
  if (firmar_(cuerpo) !== p[2]) throw new Error('SESION_INVALIDA');
  if (Number(p[1]) < Date.now()) throw new Error('SESION_INVALIDA');
  return { rol: p[0] };
}

function cambiarPin_(rol, pinNuevo) {
  pinNuevo = str_(pinNuevo);
  if (!/^\d{4,8}$/.test(pinNuevo)) throw new Error('El PIN nuevo tiene que ser numérico (4 a 8 dígitos).');
  if (rol !== ROLES.CAJA && rol !== ROLES.PANEL) throw new Error('Rol inválido');
  var otro = rol === ROLES.CAJA ? 'pin_panel_hash' : 'pin_caja_hash';
  if (verifyPin_(pinNuevo, getConfig_(otro))) throw new Error('Ese PIN ya lo usa el otro acceso. Elegí otro.');
  setConfig_('pin_' + rol + '_hash', hashPin_(pinNuevo));
  return true;
}

function sembrarPins_() {
  if (!getConfig_('pin_caja_hash')) setConfig_('pin_caja_hash', hashPin_(PIN_DEFAULT.caja));
  if (!getConfig_('pin_panel_hash')) setConfig_('pin_panel_hash', hashPin_(PIN_DEFAULT.panel));
}
