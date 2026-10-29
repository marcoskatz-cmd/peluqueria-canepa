/**
 * Servicios.gs — Catálogo de servicios y precios.
 * Nunca se borra un servicio: se desactiva. Así los cobros viejos conservan referencia.
 */

function todosServicios_() {
  return leerObjetos_(SHEETS.SERVICIOS, COLS.SERVICIOS).map(function (f) {
    return {
      id: str_(f.id), categoria: str_(f.categoria), servicio: str_(f.servicio),
      variante: str_(f.variante), precio: num_(f.precio), orden: num_(f.orden),
      activo: str_(f.activo).toUpperCase() !== 'NO', _fila: f._fila
    };
  }).sort(function (a, b) { return a.orden - b.orden; });
}

function ordenCategorias_(servicios) {
  var vistas = [];
  servicios.forEach(function (s) { if (vistas.indexOf(s.categoria) < 0) vistas.push(s.categoria); });
  return vistas;
}

/** Lo que ve la caja: solo activos, agrupado por categoría y servicio (variantes dentro). */
function catalogo_() {
  var servicios = todosServicios_().filter(function (s) { return s.activo; });
  var cats = ordenCategorias_(servicios);
  var out = cats.map(function (c) {
    var items = [];
    servicios.filter(function (s) { return s.categoria === c; }).forEach(function (s) {
      var it = null;
      for (var i = 0; i < items.length; i++) if (items[i].servicio === s.servicio) it = items[i];
      if (!it) { it = { servicio: s.servicio, variantes: [] }; items.push(it); }
      it.variantes.push({ id: s.id, variante: s.variante, precio: s.precio });
    });
    return { categoria: c, items: items };
  });
  return { categorias: out, mediosPago: mediosPago_(), negocio: getConfig_('nombre_negocio') };
}

function mediosPago_() {
  return str_(getConfig_('medios_pago')).split(',').map(function (m) { return m.trim(); }).filter(Boolean);
}

/** Panel: todos los servicios, planos, en orden. */
function listarServicios_() {
  return { servicios: todosServicios_().map(function (s) { delete s._fila; return s; }), mediosPago: mediosPago_() };
}

function crearServicio_(d) {
  var categoria = str_(d.categoria), servicio = str_(d.servicio), variante = str_(d.variante);
  if (!categoria) throw new Error('Falta la categoría.');
  if (!servicio) throw new Error('Falta el nombre del servicio.');
  var todos = todosServicios_();
  var dup = todos.some(function (s) {
    return s.categoria.toLowerCase() === categoria.toLowerCase() && s.servicio.toLowerCase() === servicio.toLowerCase() && s.variante.toLowerCase() === variante.toLowerCase();
  });
  if (dup) throw new Error('Ese servicio ya existe' + (variante ? ' con esa variante.' : '.'));
  var maxOrden = 0;
  var hermanos = todos.filter(function (s) { return s.categoria.toLowerCase() === categoria.toLowerCase(); });
  if (hermanos.length) {
    // nueva variante va justo después de las variantes existentes del mismo servicio
    var mismo = hermanos.filter(function (s) { return s.servicio.toLowerCase() === servicio.toLowerCase(); });
    var base = mismo.length ? mismo : hermanos;
    maxOrden = Math.max.apply(null, base.map(function (s) { return s.orden; }));
    if (mismo.length) {
      // desplazar lo que viene después para hacer lugar
      var sh = hoja_(SHEETS.SERVICIOS);
      var colOrden = colIndex_(COLS.SERVICIOS, 'orden');
      todos.forEach(function (s) { if (s.orden > maxOrden) sh.getRange(s._fila, colOrden).setValue(s.orden + 10); });
      maxOrden += 5;
    } else maxOrden += 10;
  } else {
    maxOrden = (todos.length ? Math.max.apply(null, todos.map(function (s) { return s.orden; })) : 0) + 10;
  }
  var nuevo = { id: nuevoId_(), categoria: categoria, servicio: servicio, variante: variante, precio: num_(d.precio), orden: maxOrden, activo: 'SI' };
  appendFila_(SHEETS.SERVICIOS, COLS.SERVICIOS, nuevo);
  normalizarOrden_();
  return nuevo;
}

function actualizarServicio_(id, d) {
  var s = buscarServicio_(id);
  var sh = hoja_(SHEETS.SERVICIOS);
  if (d.precio !== undefined) {
    var p = num_(d.precio);
    if (p < 0) throw new Error('El precio no puede ser negativo.');
    sh.getRange(s._fila, colIndex_(COLS.SERVICIOS, 'precio')).setValue(p);
  }
  if (d.servicio !== undefined) {
    var nombre = str_(d.servicio);
    if (!nombre) throw new Error('El nombre no puede quedar vacío.');
    // renombrar todas las variantes del mismo servicio
    var col = colIndex_(COLS.SERVICIOS, 'servicio');
    todosServicios_().forEach(function (x) {
      if (x.categoria === s.categoria && x.servicio === s.servicio) sh.getRange(x._fila, col).setValue(nombre);
    });
  }
  if (d.variante !== undefined) sh.getRange(s._fila, colIndex_(COLS.SERVICIOS, 'variante')).setValue(str_(d.variante));
  if (d.activo !== undefined) sh.getRange(s._fila, colIndex_(COLS.SERVICIOS, 'activo')).setValue(d.activo ? 'SI' : 'NO');
  return true;
}

function buscarServicio_(id) {
  var s = todosServicios_().filter(function (x) { return x.id === str_(id); })[0];
  if (!s) throw new Error('Servicio no encontrado.');
  return s;
}

/** Mueve un servicio (con todas sus variantes) un lugar arriba o abajo dentro de su categoría. */
function moverServicio_(id, dir) {
  var s = buscarServicio_(id);
  var todos = todosServicios_();
  var grupos = [];
  todos.filter(function (x) { return x.categoria === s.categoria; }).forEach(function (x) {
    var g = grupos.filter(function (gg) { return gg.nombre === x.servicio; })[0];
    if (!g) { g = { nombre: x.servicio, filas: [] }; grupos.push(g); }
    g.filas.push(x);
  });
  var idx = -1;
  grupos.forEach(function (g, i) { if (g.nombre === s.servicio) idx = i; });
  var j = dir < 0 ? idx - 1 : idx + 1;
  if (j < 0 || j >= grupos.length) return false;
  var tmp = grupos[idx]; grupos[idx] = grupos[j]; grupos[j] = tmp;
  // reasignar orden dentro de la categoría usando el rango de órdenes que ya ocupaba
  var ordenes = todos.filter(function (x) { return x.categoria === s.categoria; }).map(function (x) { return x.orden; }).sort(function (a, b) { return a - b; });
  var sh = hoja_(SHEETS.SERVICIOS);
  var col = colIndex_(COLS.SERVICIOS, 'orden');
  var k = 0;
  grupos.forEach(function (g) { g.filas.forEach(function (x) { sh.getRange(x._fila, col).setValue(ordenes[k++]); }); });
  return true;
}

function moverCategoria_(categoria, dir) {
  var todos = todosServicios_();
  var cats = ordenCategorias_(todos);
  var idx = cats.indexOf(categoria);
  var j = dir < 0 ? idx - 1 : idx + 1;
  if (idx < 0 || j < 0 || j >= cats.length) return false;
  var tmp = cats[idx]; cats[idx] = cats[j]; cats[j] = tmp;
  var sh = hoja_(SHEETS.SERVICIOS);
  var col = colIndex_(COLS.SERVICIOS, 'orden');
  var n = 10;
  cats.forEach(function (c) {
    todos.filter(function (x) { return x.categoria === c; }).forEach(function (x) { sh.getRange(x._fila, col).setValue(n); n += 10; });
  });
  return true;
}

function renombrarCategoria_(vieja, nueva) {
  nueva = str_(nueva);
  if (!nueva) throw new Error('El nombre no puede quedar vacío.');
  var sh = hoja_(SHEETS.SERVICIOS);
  var col = colIndex_(COLS.SERVICIOS, 'categoria');
  todosServicios_().forEach(function (x) { if (x.categoria === vieja) sh.getRange(x._fila, col).setValue(nueva); });
  return true;
}

/** Reescribe la columna orden como 10,20,30... respetando el orden actual. */
function normalizarOrden_() {
  var sh = hoja_(SHEETS.SERVICIOS);
  var col = colIndex_(COLS.SERVICIOS, 'orden');
  var n = 10;
  todosServicios_().forEach(function (x) { sh.getRange(x._fila, col).setValue(n); n += 10; });
}

function guardarMediosPago_(lista) {
  var limpia = (lista || []).map(function (m) { return str_(m); }).filter(Boolean);
  if (!limpia.length) throw new Error('Tiene que haber al menos un medio de pago.');
  setConfig_('medios_pago', limpia.join(','));
  return limpia;
}
