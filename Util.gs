/**
 * Util.gs — Acceso a la planilla, lectura como objetos, helpers.
 */
var _memo = {};

function db_() {
  if (_memo.ss) return _memo.ss;
  var id = PropertiesService.getScriptProperties().getProperty(PROP_SHEET_ID);
  if (!id) throw new Error('La base de datos no está inicializada. Ejecutá inicializarSistema() en el editor.');
  _memo.ss = SpreadsheetApp.openById(id);
  return _memo.ss;
}

function hoja_(nombre) {
  var sh = db_().getSheetByName(nombre);
  if (!sh) throw new Error('Falta la hoja ' + nombre + ' en la planilla. Ejecutá inicializarSistema().');
  return sh;
}

/** Lee una hoja como array de objetos usando la fila 1 como claves. Verifica columnas esperadas. */
function leerObjetos_(nombre, esperadas) {
  var sh = hoja_(nombre);
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];
  var vals = sh.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = vals[0].map(function (h) { return String(h).trim(); });
  if (esperadas) {
    var faltan = esperadas.filter(function (c) { return headers.indexOf(c) < 0; });
    if (faltan.length) throw new Error('En la hoja ' + nombre + ' faltan las columnas: ' + faltan.join(', '));
  }
  var out = [];
  for (var r = 1; r < vals.length; r++) {
    var row = vals[r];
    var vacia = row.every(function (c) { return c === '' || c === null; });
    if (vacia) continue;
    var o = { _fila: r + 1 };
    for (var c = 0; c < headers.length; c++) o[headers[c]] = row[c];
    out.push(o);
  }
  return out;
}

function appendFila_(nombre, headers, obj) {
  var sh = hoja_(nombre);
  var fila = headers.map(function (h) { return obj[h] === undefined ? '' : obj[h]; });
  sh.appendRow(fila);
}

function appendFilas_(nombre, headers, objs) {
  if (!objs.length) return;
  var sh = hoja_(nombre);
  var filas = objs.map(function (o) {
    return headers.map(function (h) { return o[h] === undefined ? '' : o[h]; });
  });
  sh.getRange(sh.getLastRow() + 1, 1, filas.length, headers.length).setValues(filas);
}

function colIndex_(headers, nombre) {
  var i = headers.indexOf(nombre);
  if (i < 0) throw new Error('Columna ' + nombre + ' no encontrada');
  return i + 1;
}

function getConfig_(clave) {
  var filas = leerObjetos_(SHEETS.CONFIG, COLS.CONFIG);
  for (var i = 0; i < filas.length; i++) if (String(filas[i].clave) === clave) return filas[i].valor;
  return CONFIG_DEFAULT[clave] !== undefined ? CONFIG_DEFAULT[clave] : '';
}

function setConfig_(clave, valor) {
  var sh = hoja_(SHEETS.CONFIG);
  var filas = leerObjetos_(SHEETS.CONFIG, COLS.CONFIG);
  for (var i = 0; i < filas.length; i++) {
    if (String(filas[i].clave) === clave) { sh.getRange(filas[i]._fila, 2).setValue(valor); return; }
  }
  sh.appendRow([clave, valor]);
}

function num_(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
function str_(v) { return v === null || v === undefined ? '' : String(v).trim(); }

function fmtFecha_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd'); }
function fmtHora_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'HH:mm'); }
function fmtFechaHora_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss'); }

/** Devuelve fecha como 'yyyy-MM-dd' tanto si la celda trae Date como string. */
function fechaCelda_(v) {
  if (v instanceof Date) return fmtFecha_(v);
  return str_(v).slice(0, 10);
}

/** Devuelve 'HH:mm' tanto si la celda trae Date (Sheets la interpretó como hora) como string. */
function horaCelda_(v) {
  if (v instanceof Date) return fmtHora_(v);
  return str_(v).slice(0, 5);
}

function nuevoId_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 12);
}
