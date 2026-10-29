/**
 * Schema.gs — Nombres de hojas y columnas. Única fuente de verdad del modelo.
 */
var PROP_SHEET_ID = 'SHEET_ID';
var NOMBRE_DB = 'Andrea Canepa — Caja';

var SHEETS = {
  CONFIG: 'CONFIG',
  SERVICIOS: 'SERVICIOS',
  COBROS: 'COBROS',
  DETALLE: 'COBROS_DETALLE'
};

var COLS = {
  CONFIG: ['clave', 'valor'],
  SERVICIOS: ['id', 'categoria', 'servicio', 'variante', 'precio', 'orden', 'activo'],
  COBROS: ['id', 'fecha', 'hora', 'cliente', 'subtotal', 'desc_tipo', 'desc_valor', 'desc_monto', 'total', 'medio_pago', 'estado', 'creado_en'],
  DETALLE: ['cobro_id', 'servicio_id', 'categoria', 'servicio', 'variante', 'cantidad', 'precio_unit', 'importe']
};

var ID_OTROS = 'OTROS';

/** Catálogo inicial tomado de la hoja de papel. Precios en 0: se cargan desde el panel. */
var SEMILLA_SERVICIOS = [
  ['Lavado', 'Lavado Kerastase'],
  ['Lavado', "Lavado L'Oreal"],
  ['Corte', 'Corte Andrea'],
  ['Corte', 'Corte Staff'],
  ['Nutrición', 'Ampollas'],
  ['Nutrición', 'Baño Crema'],
  ['Nutrición', 'Rituales'],
  ['Peinados', 'Modelado'],
  ['Peinados', 'Brushing'],
  ['Peinados', 'Recogido'],
  ['Peinados', 'Recogido Staff'],
  ['Color', 'Reflejos'],
  ['Color', 'Mechas'],
  ['Color', 'Iluminación'],
  ['Color', "Tintura L'Oreal / Wella"],
  ['Color', 'INOA'],
  ['Color', 'Henna'],
  ['Color', 'Tono sobre tono'],
  ['Belleza', 'Manos'],
  ['Belleza', 'Pies'],
  ['Belleza', 'Maquillaje'],
  ['Belleza', 'Depilación']
];

var CONFIG_DEFAULT = {
  medios_pago: 'Efectivo,Transferencia,Tarjeta',
  nombre_negocio: 'Andrea Canepa'
};
