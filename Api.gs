/**
 * Api.gs — Único punto de entrada desde el navegador: google.script.run.apiCall(metodo, json).
 * Devuelve siempre JSON { ok, data | error }. El rol del token decide qué puede hacer.
 */
var METODOS_PUBLICOS = { loginPin: true, ping: true };
var SOLO_PANEL = {
  listarServicios: 1, crearServicio: 1, actualizarServicio: 1, moverServicio: 1, moverCategoria: 1,
  renombrarCategoria: 1, guardarMediosPago: 1, datosTablero: 1, anularCobro: 1, cambiarPin: 1,
  sembrarDemo: 1, borrarDemo: 1
};

function apiCall(metodo, payloadJson) {
  try {
    var p = payloadJson ? JSON.parse(payloadJson) : {};
    var sesion = null;
    if (!METODOS_PUBLICOS[metodo]) {
      sesion = validarToken_(p.__token || '');
      if (SOLO_PANEL[metodo] && sesion.rol !== ROLES.PANEL) throw new Error('Este acceso no tiene permiso para esa acción.');
    }
    var data = enrutar_(metodo, p, sesion);
    return JSON.stringify({ ok: true, data: data === undefined ? null : data });
  } catch (e) {
    return JSON.stringify({ ok: false, error: (e && e.message) ? e.message : String(e) });
  }
}

function enrutar_(m, p, sesion) {
  switch (m) {
    case 'ping': return 'pong';
    case 'loginPin': return loginPin_(p.pin);
    case 'sesion': return { rol: sesion.rol };

    // Caja
    case 'catalogo': return catalogo_();
    case 'registrarCobro': return registrarCobro_(p);

    // Panel de precios
    case 'listarServicios': return listarServicios_();
    case 'crearServicio': return crearServicio_(p);
    case 'actualizarServicio': return actualizarServicio_(p.id, p);
    case 'moverServicio': return moverServicio_(p.id, p.dir);
    case 'moverCategoria': return moverCategoria_(p.categoria, p.dir);
    case 'renombrarCategoria': return renombrarCategoria_(p.vieja, p.nueva);
    case 'guardarMediosPago': return guardarMediosPago_(p.lista);
    case 'cambiarPin': return cambiarPin_(p.rol, p.pinNuevo);

    // Tablero
    case 'datosTablero': return datosTablero_();
    case 'anularCobro': return anularCobro_(p.id, p.motivo);

    // Demo
    case 'sembrarDemo': return sembrarDatosDemo();
    case 'borrarDemo': return borrarDatosDemo();

    default: throw new Error('Método desconocido: ' + m);
  }
}
