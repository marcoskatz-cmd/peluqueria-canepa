/**
 * Cobros.gs — Registro de tickets y datos para el tablero.
 * El id lo genera la tablet: si llega dos veces (reintento offline), se ignora la segunda.
 */

function registrarCobro_(d) {
  var id = str_(d.id);
  if (!/^[a-z0-9]{8,32}$/i.test(id)) throw new Error('Ticket sin identificador válido.');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (existeCobro_(id)) return { id: id, duplicado: true };

    var items = Array.isArray(d.items) ? d.items : [];
    if (!items.length) throw new Error('El ticket no tiene servicios.');
    var catalogo = {};
    todosServicios_().forEach(function (s) { catalogo[s.id] = s; });

    var detalle = [];
    var subtotal = 0;
    items.forEach(function (it) {
      var cant = Math.max(1, Math.round(num_(it.cantidad) || 1));
      var fila;
      if (str_(it.servicioId) === ID_OTROS) {
        var precioOtro = num_(it.precio);
        if (precioOtro <= 0) throw new Error('"Otros" necesita un precio mayor a cero.');
        fila = { cobro_id: id, servicio_id: ID_OTROS, categoria: 'Otros', servicio: str_(it.descripcion) || 'Otros', variante: '', cantidad: cant, precio_unit: precioOtro };
      } else {
        var s = catalogo[str_(it.servicioId)];
        if (!s) throw new Error('Un servicio del ticket ya no existe en el catálogo. Recargá la hoja.');
        // precio: el de catálogo salvo que la caja lo haya pisado a mano
        var precio = it.precio !== undefined && it.precio !== null && it.precio !== '' ? num_(it.precio) : s.precio;
        if (precio < 0) throw new Error('Precio negativo en ' + s.servicio);
        fila = { cobro_id: id, servicio_id: s.id, categoria: s.categoria, servicio: s.servicio, variante: s.variante, cantidad: cant, precio_unit: precio };
      }
      fila.importe = Math.round(fila.cantidad * fila.precio_unit * 100) / 100;
      subtotal += fila.importe;
      detalle.push(fila);
    });
    subtotal = Math.round(subtotal * 100) / 100;

    var descTipo = str_(d.descTipo); // '' | '%' | '$'
    var descValor = num_(d.descValor);
    var descMonto = 0;
    if (descTipo === '%') {
      if (descValor < 0 || descValor > 100) throw new Error('El descuento en % tiene que estar entre 0 y 100.');
      descMonto = Math.round(subtotal * descValor) / 100;
    } else if (descTipo === '$') {
      if (descValor < 0 || descValor > subtotal) throw new Error('El descuento no puede superar el subtotal.');
      descMonto = Math.round(descValor * 100) / 100;
    } else { descTipo = ''; descValor = 0; }
    var total = Math.round((subtotal - descMonto) * 100) / 100;

    var medio = str_(d.medioPago);
    if (mediosPago_().indexOf(medio) < 0) throw new Error('Medio de pago no válido: ' + medio);

    var ahora = new Date();
    var fechaTicket = d.fechaHora ? new Date(d.fechaHora) : ahora; // la tablet manda cuándo se cobró (puede ser offline)
    if (isNaN(fechaTicket.getTime())) fechaTicket = ahora;

    appendFila_(SHEETS.COBROS, COLS.COBROS, {
      id: id, fecha: fmtFecha_(fechaTicket), hora: fmtHora_(fechaTicket), cliente: str_(d.cliente).slice(0, 80),
      subtotal: subtotal, desc_tipo: descTipo, desc_valor: descValor, desc_monto: descMonto,
      total: total, medio_pago: medio, estado: 'OK', creado_en: fmtFechaHora_(ahora)
    });
    appendFilas_(SHEETS.DETALLE, COLS.DETALLE, detalle);
    return { id: id, total: total };
  } finally {
    lock.releaseLock();
  }
}

function existeCobro_(id) {
  var sh = hoja_(SHEETS.COBROS);
  var n = sh.getLastRow();
  if (n < 2) return false;
  var ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (str_(ids[i][0]) === id) return true;
  return false;
}

function anularCobro_(id, motivo) {
  var sh = hoja_(SHEETS.COBROS);
  var filas = leerObjetos_(SHEETS.COBROS, COLS.COBROS);
  for (var i = 0; i < filas.length; i++) {
    if (str_(filas[i].id) === str_(id)) {
      sh.getRange(filas[i]._fila, colIndex_(COLS.COBROS, 'estado')).setValue('ANULADO' + (motivo ? ': ' + str_(motivo).slice(0, 60) : ''));
      return true;
    }
  }
  throw new Error('Ticket no encontrado.');
}

/** Todo lo necesario para el tablero. Se filtra y agrega en el navegador. */
function datosTablero_() {
  var cobros = leerObjetos_(SHEETS.COBROS, COLS.COBROS).map(function (f) {
    return {
      id: str_(f.id), fecha: fechaCelda_(f.fecha), hora: horaCelda_(f.hora), cliente: str_(f.cliente),
      subtotal: num_(f.subtotal), descTipo: str_(f.desc_tipo), descValor: num_(f.desc_valor), descMonto: num_(f.desc_monto),
      total: num_(f.total), medio: str_(f.medio_pago), estado: str_(f.estado) || 'OK'
    };
  });
  var detalle = leerObjetos_(SHEETS.DETALLE, COLS.DETALLE).map(function (f) {
    return {
      cobroId: str_(f.cobro_id), servicioId: str_(f.servicio_id), categoria: str_(f.categoria), servicio: str_(f.servicio),
      variante: str_(f.variante), cantidad: num_(f.cantidad), precio: num_(f.precio_unit), importe: num_(f.importe)
    };
  });
  return { cobros: cobros, detalle: detalle, mediosPago: mediosPago_(), hoy: fmtFecha_(new Date()) };
}
