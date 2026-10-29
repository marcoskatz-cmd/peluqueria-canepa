/**
 * Main.gs — Entrada del Web App. Toda la SPA vive en index.html.
 * Se sirve como HTML plano (sin motor de templates).
 */
/**
 * API JSON para el frontend hospedado fuera de Google (GitHub Pages).
 * Body: { metodo, payload }. Respuesta: el mismo JSON que apiCall.
 */
function doPost(e) {
  var salida;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    salida = apiCall(String(body.metodo || ''), JSON.stringify(body.payload || {}));
  } catch (err) {
    salida = JSON.stringify({ ok: false, error: 'Pedido inválido: ' + (err.message || err) });
  }
  return ContentService.createTextOutput(salida).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Andrea Canepa — Caja')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
