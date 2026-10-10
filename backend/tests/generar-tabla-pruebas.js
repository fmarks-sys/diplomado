import { readFile, mkdir, writeFile } from 'node:fs/promises';

const reporte = JSON.parse(await readFile(new URL('./reportes/resultado_pruebas.json', import.meta.url), 'utf8'));
const destino = new URL('../../docs/', import.meta.url);
await mkdir(destino, { recursive: true });

const corregirTexto = (texto) => texto
    .replaceAll('p?blica', 'pública').replaceAll('v?lido', 'válido')
    .replaceAll('inv?lido', 'inválido').replaceAll('Contrase?a', 'Contraseña')
    .replaceAll('contrase?as', 'contraseñas').replaceAll('vac?o', 'vacío')
    .replaceAll('bibliotecario', 'Bibliotecario');
const xml = (texto) => String(texto).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const nombresHttp = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 500: 'Internal Server Error' };
const codigo = (status) => status == null ? 'Sin respuesta HTTP' : `${status} ${nombresHttp[status] || ''}`.trim();
const evidencia = 'tests/reportes/resultado_pruebas.json';
const filas = reporte.casos.map((caso) => {
    const extras = caso.pruebas.map((p) => corregirTexto(p.nombre)).filter((nombre) => !/^HTTP \d+$/.test(nombre)
        && !['Respuesta JSON', 'Sin credenciales en respuesta', 'Sin contraseñas ni hashes'].includes(nombre));
    const aprobadas = caso.pruebas.filter((p) => p.estado === 'Aprobado').length;
    const fallidas = caso.pruebas.filter((p) => p.estado !== 'Aprobado').map((p) => `${corregirTexto(p.nombre)}: ${p.estado}`);
    return [caso.id, `${caso.modulo}: ${corregirTexto(caso.escenario.replace(new RegExp(`^${caso.id}\\s+`), ''))}`,
        `${caso.metodo} ${caso.ruta}`, `${codigo(caso.esperado)}; respuesta JSON${extras.length ? '; ' + extras.join('; ') : ''}.`,
        `${codigo(caso.obtenido)}. ${aprobadas}/${caso.pruebas.length} comprobaciones aprobadas. ${caso.tiempo_ms ?? '—'} ms.${fallidas.length ? ' ' + fallidas.join('; ') : ''}`,
        `${evidencia}; caso ${caso.id}`, caso.estado];
});
const fecha = new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', dateStyle: 'long', timeStyle: 'medium' }).format(new Date(reporte.ejecucion_utc));
const encabezados = ['ID', 'Escenario', 'Ruta', 'Esperado', 'Obtenido', 'Evidencia', 'Estado'];
const notas = [
    `Fuente: ejecución real registrada el ${fecha} (America/La_Paz). Fecha original UTC: ${reporte.ejecucion_utc}.`,
    `Entorno: API local ${reporte.api}; ${reporte.herramienta}. Roles comprobados: BIBLIOTECARIO y LECTOR.`,
    `Resultado: ${reporte.resumen.solicitudes} solicitudes; ${reporte.resumen.casos_aprobados} casos aprobados; ${reporte.resumen.casos_fallidos} casos fallidos; ${reporte.resumen.comprobaciones} comprobaciones; ${reporte.resumen.comprobaciones_fallidas} comprobaciones fallidas.`,
    'Para completar tu documento, copia esta tabla a la sección 2.8.3. P-01 y P-02 pasan de Pendiente a Aprobado según la ejecución registrada.',
    'Las rutas reproducen los identificadores usados en esa ejecución. Los datos temporales se eliminaron después de probar; al repetir las pruebas se crean identificadores nuevos.',
    `Evidencia: ${evidencia}, ruta relativa a backend/. Cada fila indica el ID que debe localizarse dentro de casos. Las comprobaciones detalladas están en casos[].pruebas.`,
    `Limpieza de datos temporales: ${reporte.limpieza.completada ? 'completada' : 'incompleta'}. El ejecutor eliminó ${reporte.limpieza.personas_temporales_eliminadas} personas, ${reporte.limpieza.prestamos_temporales_eliminados} préstamos, ${reporte.limpieza.recursos_temporales_eliminados} recursos y ${reporte.limpieza.areas_temporales_eliminadas} área; otros registros temporales se eliminaron en los casos de borrado.`,
    'Comando para repetir, desde backend/: pnpm test:automated. Los resultados documentados corresponden únicamente al entorno local y a los casos ejecutados.'
];
const parrafo = (texto, estilo = 'Normal') => `<w:p><w:pPr><w:pStyle w:val="${estilo}"/></w:pPr><w:r><w:t xml:space="preserve">${xml(texto)}</w:t></w:r></w:p>`;
const anchos = [650, 2300, 2250, 3600, 1700, 3400, 1000];
const filaWord = (celdas, cabecera = false) => `<w:tr><w:trPr><w:cantSplit/>${cabecera ? '<w:tblHeader/>' : ''}</w:trPr>${celdas.map((texto, i) => `<w:tc><w:tcPr><w:tcW w:w="${anchos[i]}" w:type="dxa"/>${cabecera ? '<w:shd w:fill="E3EAF2"/>' : ''}<w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="60"/></w:pPr><w:r><w:rPr>${cabecera ? '<w:b/>' : ''}<w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">${xml(texto)}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
const tabla = `<w:tbl><w:tblPr><w:tblW w:w="14900" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((b) => `<w:${b} w:val="single" w:sz="4" w:color="A0A0A0"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="65" w:type="dxa"/><w:left w:w="65" w:type="dxa"/><w:bottom w:w="65" w:type="dxa"/><w:right w:w="65" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${anchos.map((a) => `<w:gridCol w:w="${a}"/>`).join('')}</w:tblGrid>${filaWord(encabezados, true)}${filas.map((f) => filaWord(f)).join('')}</w:tbl>`;
const partes = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/_rels/document.xml.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'word/styles.xml': '<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="20"/><w:lang w:val="es-BO"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:sz w:val="28"/></w:rPr></w:style></w:styles>',
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${parrafo('2.8.3 Tabla de casos de prueba', 'Title')}${notas.map((n) => parrafo(n)).join('')}${tabla}${parrafo('Tabla 22. Tabla de casos de prueba. Fuente: elaboración propia, a partir del reporte de Newman.')}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`
};

// Contenedor ZIP sin dependencias externas; DOCX usa XML dentro de un ZIP.
const crc32 = (bytes) => {
    let crc = 0xFFFFFFFF;
    for (const byte of bytes) {
        crc ^= byte;
        for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
};
const locales = [];
const centrales = [];
let offset = 0;
for (const [nombre, contenido] of Object.entries(partes)) {
    const name = Buffer.from(nombre);
    const data = Buffer.from(contenido);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034B50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(0x21, 12); local.writeUInt32LE(crc, 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    locales.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014B50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8);
    central.writeUInt16LE(0x21, 14); central.writeUInt32LE(crc, 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    centrales.push(central, name);
    offset += local.length + name.length + data.length;
}
const directorio = Buffer.concat(centrales);
const fin = Buffer.alloc(22);
fin.writeUInt32LE(0x06054B50); fin.writeUInt16LE(centrales.length / 2, 8); fin.writeUInt16LE(centrales.length / 2, 10); fin.writeUInt32LE(directorio.length, 12); fin.writeUInt32LE(offset, 16);
await writeFile(new URL('Tabla_casos_prueba_E3.docx', destino), Buffer.concat([...locales, directorio, fin]));
const escaparMd = (s) => s.replaceAll('|', '\\|').replaceAll('\n', ' ');
await writeFile(new URL('Tabla_casos_prueba_E3.md', destino), '# 2.8.3 Tabla de casos de prueba\n\n' + notas.join('\n\n') + '\n\n'
    + '| ' + encabezados.join(' | ') + ' |\n| ' + encabezados.map(() => '---').join(' | ') + ' |\n'
    + filas.map((f) => '| ' + f.map(escaparMd).join(' | ') + ' |').join('\n')
    + '\n\n*Tabla 22. Tabla de casos de prueba. Fuente: elaboración propia, a partir del reporte de Newman.*\n');
console.log(`Documento y Markdown generados con ${filas.length} casos: docs/Tabla_casos_prueba_E3.docx`);
