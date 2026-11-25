/**
 * Salida de integrantes — Equipo Nexa (encuesta + certificado)
 *
 * Va en la cuenta de Google DUEÑA de la plantilla del certificado:
 *   https://docs.google.com/document/d/1vH2v6I-PWC0c-Si2tkSfivvC6k-K22PxJzEx0JDTtGg/edit
 *
 * Qué hace (la web lo llama con POST y un campo "action"):
 *   - estado:      ¿este integrante ya respondió la encuesta?
 *   - responder:   guarda sus respuestas como una fila en el Google Sheet
 *                  "Encuestas de salida - Equipo Nexa" (lo crea solo).
 *   - certificado: rellena la plantilla y devuelve el PDF. Desde el botón
 *                  "Generar certificado" del admin sale directo; si lo pide
 *                  el integrante, solo si ya respondió (y se anota la fecha
 *                  de descarga). No deja archivos nuevos en el Drive (la
 *                  copia temporal va a la papelera).
 *
 * Instalación (con esa cuenta):
 *   1. script.google.com → Nuevo proyecto → pega este archivo.
 *   2. Configuración del proyecto → Propiedades del script → agrega
 *      TOKEN = una clave larga al azar (la misma va en Netlify como
 *      GOOGLE_SALIDA_SCRIPT_TOKEN).
 *   3. Ejecuta una vez la función `instalar` y acepta los permisos. Crea el
 *      Sheet de respuestas y deja un PDF de prueba en tu Drive (bórralo).
 *   4. Implementar → Nueva implementación → Aplicación web:
 *        Ejecutar como: Yo
 *        Quién tiene acceso: Cualquier persona
 *      Copia la URL (termina en /exec) → Netlify: GOOGLE_SALIDA_SCRIPT_URL.
 *   Si cambias el código después: Implementar → Gestionar implementaciones →
 *   editar → Versión nueva (la URL se mantiene).
 *
 * Marcadores de la plantilla: {{RUC}} {{NOMBRE_COMPLETO}} {{DNI}}
 * {{FECHA_INICIO}} {{FECHA_FIN}} {{FECHA_EMISION}}
 */

const TEMPLATE_ID = '1vH2v6I-PWC0c-Si2tkSfivvC6k-K22PxJzEx0JDTtGg';
const SHEET_NAME = 'Encuestas de salida - Equipo Nexa';

const CERT_FIELDS = {
  RUC: 'ruc',
  NOMBRE_COMPLETO: 'nombreCompleto',
  DNI: 'dni',
  FECHA_INICIO: 'fechaInicio',
  FECHA_FIN: 'fechaFin',
  FECHA_EMISION: 'fechaEmision',
};

const HEADERS = [
  'Fecha de respuesta',
  'ID integrante',
  'Nombre',
  'DNI',
  'Correo',
  'Área',
  'Cargo',
  'Ambiente laboral (1-10)',
  'Qué aprendió',
  'Qué espera luego',
  'A dónde quiere llegar',
  'Recomienda Nexa',
  'Por qué',
  'Qué mejoraría',
  'Certificado descargado',
];
const COL_ID = 2;
const COL_CERT = HEADERS.length;

function doPost(e) {
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    if (token && data.token !== token) return json_({ success: false, error: 'No autorizado' });
    if (!data.memberId) return json_({ success: false, error: 'Falta memberId' });

    if (data.action === 'estado') {
      return json_({ success: true, respondido: findRow_(data.memberId) > 0 });
    }
    if (data.action === 'responder') return json_(responder_(data));
    if (data.action === 'certificado') return json_(certificado_(data));
    return json_({ success: false, error: 'Acción desconocida' });
  } catch (err) {
    return json_({ success: false, error: String((err && err.message) || err) });
  }
}

function responder_(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (findRow_(d.memberId) > 0) return { success: true, yaRespondido: true };
    const rating = Number(d.ambiente);
    if (!(rating >= 1 && rating <= 10)) return { success: false, error: 'Calificación inválida' };
    sheet_().appendRow([
      new Date(),
      d.memberId,
      text_(d.nombre),
      text_(d.dni),
      text_(d.correo),
      text_(d.area),
      text_(d.cargo),
      rating,
      text_(d.aprendio),
      text_(d.espera),
      text_(d.meta),
      text_(d.recomienda),
      text_(d.porque),
      text_(d.mejoras),
      '',
    ]);
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

// sinEncuesta = lo pide el admin desde la ficha: se genera directo, sin
// exigir la encuesta. Si lo pide el integrante, debe haberla respondido.
function certificado_(d) {
  const row = findRow_(d.memberId);
  if (row < 0 && d.sinEncuesta !== true) return { success: false, error: 'Primero responde la encuesta de salida.' };
  for (const key of Object.values(CERT_FIELDS)) {
    if (!d[key] || typeof d[key] !== 'string') return { success: false, error: 'Falta el dato: ' + key };
  }
  const nombreArchivo = 'Certificado de participación - ' + d.nombreCompleto + '.pdf';
  const pdf = buildPdf_(d, nombreArchivo);
  if (row > 0 && d.sinEncuesta !== true) {
    const cell = sheet_().getRange(row, COL_CERT);
    if (!cell.getValue()) cell.setValue(new Date());
  }
  return { success: true, nombreArchivo: nombreArchivo, pdfBase64: Utilities.base64Encode(pdf.getBytes()) };
}

function buildPdf_(data, nombreArchivo) {
  const copy = DriveApp.getFileById(TEMPLATE_ID).makeCopy('tmp - ' + nombreArchivo);
  try {
    const doc = DocumentApp.openById(copy.getId());
    const sections = [doc.getBody(), doc.getHeader(), doc.getFooter()].filter(Boolean);
    for (const [marker, key] of Object.entries(CERT_FIELDS)) {
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

// ---------- Sheet ----------

function sheet_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SHEET_ID');
  let ss = null;
  if (id) {
    try {
      ss = SpreadsheetApp.openById(id);
    } catch (e) {
      ss = null;
    }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_NAME);
    props.setProperty('SHEET_ID', ss.getId());
    const sh = ss.getSheets()[0];
    sh.setName('Respuestas');
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return ss.getSheets()[0];
}

// Fila (1-based) del integrante, o -1.
function findRow_(memberId) {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, COL_ID, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(memberId)) return i + 2;
  }
  return -1;
}

function text_(v) {
  // Evita que el Sheet interprete el texto como fórmula.
  const s = String(v == null ? '' : v).slice(0, 4000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Ejecutar una vez desde el editor: pide permisos, crea el Sheet y deja un
// PDF de prueba en tu Drive.
function instalar() {
  const ss = SpreadsheetApp.openById(sheet_().getParent().getId());
  Logger.log('Sheet de respuestas: ' + ss.getUrl());
  const pdf = buildPdf_(
    {
      ruc: '20616354664',
      nombreCompleto: 'Nombre De Prueba',
      dni: '12345678',
      fechaInicio: '1 de septiembre de 2026',
      fechaFin: '17 de noviembre de 2026',
      fechaEmision: '24 de noviembre de 2026',
    },
    'PRUEBA certificado.pdf',
  );
  DriveApp.createFile(pdf);
  Logger.log('PDF de prueba creado en tu Drive (puedes borrarlo).');
}
