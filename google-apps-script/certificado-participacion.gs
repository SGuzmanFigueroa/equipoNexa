/**
 * Certificado de participación — Equipo Nexa
 *
 * Va en la cuenta de Google DUEÑA de la plantilla:
 *   https://docs.google.com/document/d/1vH2v6I-PWC0c-Si2tkSfivvC6k-K22PxJzEx0JDTtGg/edit
 *
 * Instalación (con esa cuenta):
 *   1. script.google.com → Nuevo proyecto → pega este archivo.
 *   2. Configuración del proyecto → Propiedades del script → agrega
 *      TOKEN = (una clave larga al azar; la misma va en Netlify como
 *      GOOGLE_CERT_SCRIPT_TOKEN).
 *   3. Ejecuta una vez la función `probar` y acepta los permisos
 *      (Drive + Docs). Debe aparecer un PDF de prueba en tu Drive raíz.
 *   4. Implementar → Nueva implementación → Aplicación web:
 *        Ejecutar como: Yo
 *        Quién tiene acceso: Cualquier persona
 *      Copia la URL (termina en /exec) → Netlify: GOOGLE_CERT_SCRIPT_URL.
 *
 * Marcadores de la plantilla: {{RUC}} {{NOMBRE_COMPLETO}} {{DNI}}
 * {{FECHA_INICIO}} {{FECHA_FIN}} {{FECHA_EMISION}}
 *
 * Cada pedido copia la plantilla, reemplaza los datos, exporta el PDF,
 * manda la copia a la papelera y devuelve el PDF en base64. No queda
 * ningún archivo nuevo en el Drive.
 */

const TEMPLATE_ID = '1vH2v6I-PWC0c-Si2tkSfivvC6k-K22PxJzEx0JDTtGg';

const FIELDS = {
  RUC: 'ruc',
  NOMBRE_COMPLETO: 'nombreCompleto',
  DNI: 'dni',
  FECHA_INICIO: 'fechaInicio',
  FECHA_FIN: 'fechaFin',
  FECHA_EMISION: 'fechaEmision',
};

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (token && data.token !== token) return json_({ success: false, error: 'No autorizado' });

    for (const key of Object.values(FIELDS)) {
      if (!data[key] || typeof data[key] !== 'string') {
        return json_({ success: false, error: 'Falta el dato: ' + key });
      }
    }

    const nombreArchivo = 'Certificado de participación - ' + data.nombreCompleto + '.pdf';
    const pdf = buildPdf_(data, nombreArchivo);
    return json_({
      success: true,
      nombreArchivo: nombreArchivo,
      pdfBase64: Utilities.base64Encode(pdf.getBytes()),
    });
  } catch (err) {
    return json_({ success: false, error: String((err && err.message) || err) });
  }
}

function buildPdf_(data, nombreArchivo) {
  const copy = DriveApp.getFileById(TEMPLATE_ID).makeCopy('tmp - ' + nombreArchivo);
  try {
    const doc = DocumentApp.openById(copy.getId());
    const sections = [doc.getBody(), doc.getHeader(), doc.getFooter()].filter(Boolean);
    for (const [marker, key] of Object.entries(FIELDS)) {
      // Escapa "$" para que replaceText no lo trate como referencia.
      const value = String(data[key]).replace(/\$/g, '\\$');
      sections.forEach(function (s) {
        s.replaceText('\\{\\{' + marker + '\\}\\}', value);
      });
    }
    doc.saveAndClose();
    return copy.getAs('application/pdf').setName(nombreArchivo);
  } finally {
    copy.setTrashed(true);
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Prueba manual desde el editor: deja un PDF de ejemplo en tu Drive.
function probar() {
  const data = {
    ruc: '20616354664',
    nombreCompleto: 'Nombre De Prueba',
    dni: '12345678',
    fechaInicio: '1 de septiembre de 2026',
    fechaFin: '17 de noviembre de 2026',
    fechaEmision: '24 de noviembre de 2026',
  };
  const pdf = buildPdf_(data, 'PRUEBA certificado.pdf');
  DriveApp.createFile(pdf);
}
