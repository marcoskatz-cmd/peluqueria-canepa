/**
 * Main.gs — Entrada del Web App. Toda la SPA vive en index.html.
 * Se sirve como HTML plano (sin motor de templates).
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Andrea Canepa — Caja')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
