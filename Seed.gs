/**
 * Seed.gs — Datos de demostración: un mes de facturación verosímil.
 * Los tickets demo llevan id con prefijo "demo" para poder borrarlos de un saque.
 * Se dispara desde la API (rol panel) o a mano desde el editor.
 */
var PRECIOS_DEMO = {
  'Lavado Kerastase': 9000, "Lavado L'Oreal": 7000,
  'Corte Andrea': 28000, 'Corte Staff': 20000,
  'Ampollas': 10000, 'Baño Crema': 14000, 'Rituales': 25000,
  'Modelado': 16000, 'Brushing': 15000, 'Recogido': 35000, 'Recogido Staff': 25000,
  'Reflejos': 55000, 'Mechas': 65000, 'Iluminación': 60000, "Tintura L'Oreal / Wella": 38000,
  'INOA': 42000, 'Henna': 30000, 'Tono sobre tono': 34000,
  'Manos': 14000, 'Pies': 17000, 'Maquillaje': 40000, 'Depilación': 12000
};
var CLIENTES_DEMO = ['Ana Pérez', 'Lucía Gómez', 'Marta Ruiz', 'Sofía Díaz', 'Carla Méndez', 'Paula Torres', 'Valentina Rojas',
  'Julieta Sosa', 'Florencia Luna', 'Camila Ortiz', 'Romina Vega', 'Agustina Paz', 'Natalia Bravo', 'Cecilia Ferreyra', 'Mariana Ledesma',
  'Daniela Juárez', 'Gabriela Moreno', 'Silvina Acosta', 'Victoria Herrera', 'Belén Castro', '', '', '', ''];

function sembrarDatosDemo() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    // 1. precios: solo completa los que están en 0
    var sh = hoja_(SHEETS.SERVICIOS);
    var colPrecio = colIndex_(COLS.SERVICIOS, 'precio');
    var servicios = todosServicios_();
    servicios.forEach(function (s) {
      if (s.precio === 0 && PRECIOS_DEMO[s.servicio]) { sh.getRange(s._fila, colPrecio).setValue(PRECIOS_DEMO[s.servicio]); s.precio = PRECIOS_DEMO[s.servicio]; }
    });
    // Mechas con variantes si todavía es precio único
    var mechas = servicios.filter(function (s) { return s.servicio === 'Mechas'; });
    if (mechas.length === 1 && !mechas[0].variante) {
      sh.getRange(mechas[0]._fila, colIndex_(COLS.SERVICIOS, 'variante')).setValue('Corto');
      sh.getRange(mechas[0]._fila, colPrecio).setValue(55000);
      crearServicio_({ categoria: 'Color', servicio: 'Mechas', variante: 'Medio', precio: 65000 });
      crearServicio_({ categoria: 'Color', servicio: 'Mechas', variante: 'Largo', precio: 80000 });
    }
    servicios = todosServicios_().filter(function (s) { return s.activo && s.precio > 0; });
    if (!servicios.length) throw new Error('No hay servicios con precio para generar datos.');

    // 2. borrar demo anterior si la hubiera
    borrarDatosDemo_();

    // 3. generar 30 días hacia atrás (cerrado domingos)
    var medios = mediosPago_();
    var rnd = seedRandom_(20261028);
    var porCat = {};
    servicios.forEach(function (s) { (porCat[s.categoria] = porCat[s.categoria] || []).push(s); });
    var cats = Object.keys(porCat);
    var cobros = [], detalle = [];
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    for (var d = 30; d >= 0; d--) {
      var fecha = new Date(hoy); fecha.setDate(hoy.getDate() - d);
      var dow = fecha.getDay();
      if (dow === 0) continue;
      var base = dow === 6 ? 14 : (dow === 5 ? 12 : 8);
      var n = base + Math.floor(rnd() * 5);
      for (var j = 0; j < n; j++) {
        var id = 'demo' + Utilities.formatDate(fecha, 'GMT', 'MMdd') + pad_(j);
        var hora = 9 + Math.floor(rnd() * 10), min = Math.floor(rnd() * 60);
        var k = 1 + (rnd() < 0.55 ? 1 : 0) + (rnd() < 0.25 ? 1 : 0);
        var usados = {}, sub = 0;
        for (var q = 0; q < k; q++) {
          var cat = cats[Math.floor(rnd() * cats.length)];
          if (q === 0 && rnd() < 0.5) cat = 'Corte';
          var lista = porCat[cat] || porCat[cats[0]];
          var s = lista[Math.floor(rnd() * lista.length)];
          if (usados[s.servicio]) continue;
          usados[s.servicio] = 1;
          var cant = (s.servicio === 'Ampollas' && rnd() < 0.4) ? 2 : 1;
          var imp = s.precio * cant;
          sub += imp;
          detalle.push({ cobro_id: id, servicio_id: s.id, categoria: s.categoria, servicio: s.servicio, variante: s.variante, cantidad: cant, precio_unit: s.precio, importe: imp });
        }
        var descTipo = '', descValor = 0, descMonto = 0;
        var r = rnd();
        if (r < 0.12) { descTipo = '%'; descValor = 10; descMonto = Math.round(sub * 0.1); }
        else if (r < 0.18) { descTipo = '$'; descValor = 5000; descMonto = Math.min(5000, sub); }
        var medioR = rnd();
        var medio = medioR < 0.45 ? medios[0] : (medioR < 0.8 ? (medios[1] || medios[0]) : (medios[2] || medios[0]));
        var cliente = CLIENTES_DEMO[Math.floor(rnd() * CLIENTES_DEMO.length)];
        cobros.push({
          id: id, fecha: fmtFecha_(fecha), hora: pad_(hora) + ':' + pad_(min), cliente: cliente,
          subtotal: sub, desc_tipo: descTipo, desc_valor: descValor, desc_monto: descMonto, total: sub - descMonto,
          medio_pago: medio, estado: 'OK', creado_en: fmtFechaHora_(new Date())
        });
      }
    }
    appendFilas_(SHEETS.COBROS, COLS.COBROS, cobros);
    appendFilas_(SHEETS.DETALLE, COLS.DETALLE, detalle);
    return { tickets: cobros.length, lineas: detalle.length };
  } finally { lock.releaseLock(); }
}

/** Elimina todos los tickets demo (id que empieza con "demo"). Los precios quedan. */
function borrarDatosDemo() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return borrarDatosDemo_(); } finally { lock.releaseLock(); }
}
function borrarDatosDemo_() {
  var n = 0;
  [[SHEETS.COBROS, 'id'], [SHEETS.DETALLE, 'cobro_id']].forEach(function (par) {
    var sh = hoja_(par[0]);
    var last = sh.getLastRow();
    if (last < 2) return;
    var vals = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
    var ci = vals[0].map(String).indexOf(par[1]);
    var keep = [vals[0]];
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][ci]).indexOf('demo') === 0) { n++; continue; }
      keep.push(vals[i]);
    }
    sh.getRange(2, 1, last - 1, vals[0].length).clearContent();
    if (keep.length > 1) sh.getRange(2, 1, keep.length - 1, vals[0].length).setValues(keep.slice(1));
  });
  return { filasBorradas: n };
}

function pad_(n) { return (n < 10 ? '0' : '') + n; }
/** Generador determinístico (mulberry32) para que la demo sea reproducible. */
function seedRandom_(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
