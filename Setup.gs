/**
 * Setup.gs — Crea la planilla y las hojas. Idempotente: no pisa datos.
 * Ejecutar inicializarSistema() una vez después del primer clasp push.
 */
var COLOR_HEADER = '#1F1F1F';

function inicializarSistema() {
  var ss = crearOAbrirDB_();
  ensureHoja_(ss, SHEETS.CONFIG, COLS.CONFIG);
  ensureHoja_(ss, SHEETS.SERVICIOS, COLS.SERVICIOS);
  ensureHoja_(ss, SHEETS.COBROS, COLS.COBROS);
  ensureHoja_(ss, SHEETS.DETALLE, COLS.DETALLE);
  var extra = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (extra && ss.getSheets().length > 1) ss.deleteSheet(extra);

  _memo = {};
  sembrarConfig_();
  sembrarPins_();
  sembrarServicios_();
  formatearHojas_(ss);
  Logger.log('Listo. Planilla: ' + ss.getUrl());
  return ss.getUrl();
}

function crearOAbrirDB_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(PROP_SHEET_ID);
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { /* se recrea */ } }
  var ss = SpreadsheetApp.create(NOMBRE_DB);
  props.setProperty(PROP_SHEET_ID, ss.getId());
  _memo = {};
  return ss;
}

function ensureHoja_(ss, nombre, headers) {
  var sh = ss.getSheetByName(nombre);
  if (!sh) sh = ss.insertSheet(nombre);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  sh.getRange(1, 1, 1, headers.length).setBackground(COLOR_HEADER).setFontColor('#FFFFFF').setFontWeight('bold');
  sh.setFrozenRows(1);
  return sh;
}

function sembrarConfig_() {
  Object.keys(CONFIG_DEFAULT).forEach(function (k) {
    var filas = leerObjetos_(SHEETS.CONFIG, COLS.CONFIG);
    var existe = filas.some(function (f) { return String(f.clave) === k; });
    if (!existe) setConfig_(k, CONFIG_DEFAULT[k]);
  });
}

function sembrarServicios_() {
  var actuales = leerObjetos_(SHEETS.SERVICIOS, COLS.SERVICIOS);
  if (actuales.length) return; // ya hay catálogo, no tocar
  var filas = SEMILLA_SERVICIOS.map(function (s, i) {
    return { id: nuevoId_(), categoria: s[0], servicio: s[1], variante: '', precio: 0, orden: (i + 1) * 10, activo: 'SI' };
  });
  appendFilas_(SHEETS.SERVICIOS, COLS.SERVICIOS, filas);
}

function formatearHojas_(ss) {
  var cob = ss.getSheetByName(SHEETS.COBROS);
  cob.getRange('B2:B').setNumberFormat('yyyy-mm-dd');
  cob.getRange('C2:C').setNumberFormat('@'); // hora como texto
  cob.getRange('E2:E').setNumberFormat('#,##0.00');
  cob.getRange('H2:I').setNumberFormat('#,##0.00');
  var det = ss.getSheetByName(SHEETS.DETALLE);
  det.getRange('G2:H').setNumberFormat('#,##0.00');
  ss.getSheetByName(SHEETS.SERVICIOS).getRange('E2:E').setNumberFormat('#,##0.00');
}
