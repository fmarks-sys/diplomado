import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { guardarWord } from './word-document.js';

const fuentes = [
    { codigo: 'E1', archivo: 'deploy-produccion.json' },
    { codigo: 'E2', archivo: 'deploy-crud-produccion.json' }
];
for (const fuente of fuentes) fuente.reporte = JSON.parse(await readFile(new URL(`./reportes/${fuente.archivo}`, import.meta.url), 'utf8'));
const casos = fuentes.flatMap((fuente) => fuente.reporte.casos.map((caso) => ({ ...caso, evidencia: fuente.codigo })));
assert.equal(new Set(casos.map((c) => c.id)).size, casos.length, 'Los ID deben identificar un caso unico');
assert.equal(casos.length, fuentes.reduce((n, f) => n + f.reporte.resumen.solicitudes, 0));
const principales = [
    ['DEP-01', 'Disponibilidad pública de la API', '200; estado ok en JSON'],
    ['DEP-23', 'Login válido de Bibliotecario', '200; JWT y rol BIBLIOTECARIO'],
    ['DEP-24', 'Login válido de Lector', '200; JWT y rol LECTOR'],
    ['DEP-06', 'Rechazo de credenciales inexistentes', '401; error en JSON'],
    ['DEP-07', 'Protección de usuarios sin token', '401; error en JSON'],
    ['DEP-33', 'Lector sin permiso para gestionar usuarios', '403; error en JSON'],
    ['U-06', 'Rechazo de datos obligatorios faltantes', '400; error en JSON'],
    ['U-05', 'Consulta de usuario inexistente', '404; error en JSON'],
    ['U-10', 'Creación de persona y usuario con rol Lector', '201; respuesta JSON'],
    ['U-11', 'Sincronización del usuario con Lectores', '200; rol LECTOR y lector_id asociado'],
    ['U-12', 'Rechazo de CI duplicado', '409; error en JSON'],
    ['L-08', 'Creación de lector', '201; respuesta JSON'],
    ['AR-06', 'Creación de área bibliográfica', '201; respuesta JSON'],
    ['R-10', 'Creación de libro y disponibilidad inicial', '201; 2 unidades disponibles'],
    ['R-12', 'Consulta de disponibilidad por el Lector', '200; 2 unidades disponibles'],
    ['PR-17', 'Registro de préstamo de libro', '201; respuesta JSON'],
    ['PR-19', 'Rechazo de préstamo activo duplicado', '409; error en JSON'],
    ['PR-22', 'Préstamos propios y aislamiento entre lectores', '200; préstamo pendiente propio, sin préstamos de otro lector'],
    ['PR-23', 'Alertas propias del Lector', '200; alerta VENCE_HOY y únicamente préstamos propios'],
    ['PR-31', 'Registro de devolución de libro', '200; estado DEVUELTO'],
    ['PR-34', 'Historial del préstamo devuelto', '200; préstamo propio con estado DEVUELTO'],
    ['PR-39', 'Recuperación del stock tras las devoluciones', '200; 2 unidades disponibles']
].map(([id, escenario, esperado]) => {
    const caso = casos.find((c) => c.id === id);
    assert(caso, `Falta evidencia del caso ${id}`);
    return { ...caso, descripcion: escenario, expectativa: esperado };
});
const labels = { 200: 'OK', 201: 'Created', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 409: 'Conflict', 500: 'Internal Server Error' };
const http = (n) => n == null ? 'Sin respuesta HTTP' : `${n} ${labels[n] || ''}`.trim();
const modulo = (caso) => caso.modulo || (caso.ruta === '/api/v1/salud' ? 'Salud' : caso.ruta.startsWith('/api/auth/') ? 'Auth' : 'Despliegue');
const corregir = (texto) => texto.replaceAll('valido', 'válido').replaceAll('invalido', 'inválido').replaceAll('publica', 'pública')
    .replaceAll('Prestamo', 'Préstamo').replaceAll('prestamo', 'préstamo').replaceAll('prestamos', 'préstamos')
    .replaceAll('devolucion', 'devolución').replaceAll('Codigo', 'Código').replaceAll('Crear area', 'Crear área');
const comunes = new Set(['Respuesta JSON', 'Sin credenciales en respuesta', 'Sin hashes de password']);
const columnas = ['ID', 'Escenario', 'Ruta', 'Esperado', 'Obtenido', 'Evidencia', 'Estado'];
const fila = (caso, completa) => {
    const extras = caso.pruebas.map((p) => corregir(p.nombre)).filter((n) => !/^HTTP \d+$/.test(n) && !comunes.has(n));
    const aprobadas = caso.pruebas.filter((p) => p.estado === 'Aprobado').length;
    const fallidas = caso.pruebas.filter((p) => p.estado !== 'Aprobado').map((p) => `${p.nombre}: ${p.estado}`);
    return [caso.id, caso.descripcion || `${modulo(caso)}: ${corregir(caso.escenario.slice(caso.id.length).trim())}`,
        `${caso.metodo} ${caso.ruta}`,
        caso.expectativa || `${http(caso.esperado)}; JSON${extras.length ? '; ' + extras.join('; ') : ''}`,
        `${http(caso.obtenido)}; ${aprobadas}/${caso.pruebas.length} comprobaciones aprobadas${completa ? `; ${caso.tiempo_ms ?? '—'} ms` : ''}${fallidas.length ? '; ' + fallidas.join('; ') : ''}`,
        `${caso.evidencia} · ${caso.id}`, caso.estado];
};
const resumenFilas = principales.map((c) => fila(c, false));
const anexoFilas = casos.map((c) => fila(c, true));
const total = fuentes.reduce((s, f) => ({ casos: s.casos + f.reporte.resumen.solicitudes, aprobados: s.aprobados + f.reporte.resumen.casos_aprobados,
    fallidos: s.fallidos + f.reporte.resumen.casos_fallidos, comprobaciones: s.comprobaciones + f.reporte.resumen.comprobaciones,
    comprobaciones_fallidas: s.comprobaciones_fallidas + f.reporte.resumen.comprobaciones_fallidas }), { casos: 0, aprobados: 0, fallidos: 0, comprobaciones: 0, comprobaciones_fallidas: 0 });
const fecha = (utc) => new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', dateStyle: 'long', timeStyle: 'medium' }).format(new Date(utc));
const textoPrincipal = [
    'Se ejecutaron pruebas automatizadas de la API desplegada en Railway mediante Postman/Newman. Se verificaron autenticación, permisos de los roles BIBLIOTECARIO y LECTOR, validaciones, conflictos y operaciones de usuarios, lectores, áreas, recursos y préstamos.',
    `API evaluada: ${fuentes[0].reporte.api}. Las dos ejecuciones reportaron ${total.casos} casos, ${total.comprobaciones} comprobaciones y ${total.fallidos} casos fallidos. Los ${total.aprobados} casos fueron aprobados; no hubo comprobaciones fallidas ni casos omitidos.`,
    'Las operaciones de escritura emplearon datos ficticios temporales. Al finalizar se confirmó la limpieza de esos registros y cero registros temporales restantes. Los reportes no incluyen contraseñas ni tokens.',
    `La Tabla 22 presenta ${principales.length} casos seleccionados por su relevancia para disponibilidad, seguridad y el flujo de préstamo/devolución. El anexo contiene los ${casos.length} casos completos. La selección está incluida en el anexo; no son casos adicionales.`,
    'Se conservan los ID originales de los reportes de producción para localizar su evidencia.',
    'E1: backend/tests/reportes/deploy-produccion.json. E2: backend/tests/reportes/deploy-crud-produccion.json. Para cada fila, buscar su ID en el arreglo casos del reporte indicado.'
];
const textoAnexo = [
    'Este anexo reúne los casos reportados en producción en dos ejecuciones. Conserva los códigos esperados y obtenidos, las comprobaciones, los tiempos y el estado real de cada caso.',
    ...fuentes.map((f) => `${f.codigo}: ${fecha(f.reporte.ejecucion_utc)} (America/La_Paz); ${f.reporte.resumen.solicitudes} casos y ${f.reporte.resumen.comprobaciones} comprobaciones. Fuente: backend/tests/reportes/${f.archivo}.`),
    'Las rutas muestran los identificadores reales usados durante las pruebas. Sus datos ficticios se eliminaron al finalizar; una nueva ejecución genera identificadores distintos.',
    'El login registra el último acceso. Antes de ejecutar consultas que actualizan vencidos se comprobó que no hubiera préstamos PRESTADO con fecha vencida. No hubo casos omitidos en la ejecución registrada.',
    'La limpieza final eliminó 4 personas, 3 préstamos, 2 recursos y 1 área; otros registros ficticios se eliminaron durante los casos de borrado. El reporte E2 confirmó cero registros temporales restantes.',
    'Reproducción desde backend/: pnpm test:deploy y pnpm test:deploy:crud. Usar las cuentas ficticias y la configuración indicadas en README.md. El segundo comando escribe en producción y realiza la limpieza de sus registros.',
    'E1: backend/tests/reportes/deploy-produccion.json. E2: backend/tests/reportes/deploy-crud-produccion.json. Evidencia detallada: casos[].pruebas. Los resultados corresponden al despliegue y a las fechas indicadas.'
];
const escapeXml = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const parrafo = (texto, titulo = false) => `<w:p>${titulo ? '<w:pPr><w:keepNext/></w:pPr>' : ''}<w:r>${titulo ? '<w:rPr><w:b/><w:sz w:val="28"/></w:rPr>' : ''}<w:t xml:space="preserve">${escapeXml(texto)}</w:t></w:r></w:p>`;
const anchos = [900, 2400, 2650, 3950, 2250, 1600, 1150];
const filaWord = (valores, cabecera = false) => `<w:tr><w:trPr><w:cantSplit/>${cabecera ? '<w:tblHeader/>' : ''}</w:trPr>${valores.map((valor, i) => `<w:tc><w:tcPr><w:tcW w:w="${anchos[i]}" w:type="dxa"/><w:vAlign w:val="top"/>${cabecera ? '<w:shd w:fill="E2EAF3"/>' : ''}</w:tcPr><w:p><w:pPr><w:spacing w:after="50"/></w:pPr><w:r><w:rPr><w:sz w:val="17"/>${cabecera ? '<w:b/>' : ''}</w:rPr><w:t xml:space="preserve">${escapeXml(valor)}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
const tablaWord = (filas) => `<w:tbl><w:tblPr><w:tblW w:w="14900" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((b) => `<w:${b} w:val="single" w:sz="4" w:color="AAAAAA"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="75" w:type="dxa"/><w:left w:w="75" w:type="dxa"/><w:bottom w:w="75" w:type="dxa"/><w:right w:w="75" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${anchos.map((a) => `<w:gridCol w:w="${a}"/>`).join('')}</w:tblGrid>${filaWord(columnas, true)}${filas.map((f) => filaWord(f)).join('')}</w:tbl>`;
const salto = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
const tituloPrincipal = '2.8 Pruebas — 2.8.3 Tabla de casos principales';
const tituloAnexo = 'Anexo. Tabla completa de pruebas del despliegue';
const leyendaPrincipal = 'Tabla 22. Casos principales de prueba en producción. Fuente: elaboración propia, a partir de los reportes de Newman.';
const leyendaAnexo = 'Tabla del anexo. Casos completos de prueba en producción. Fuente: elaboración propia, a partir de los reportes de Newman.';
const partes = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${parrafo(tituloPrincipal, true)}${textoPrincipal.map((p) => parrafo(p)).join('')}${tablaWord(resumenFilas)}${parrafo(leyendaPrincipal)}${salto}${parrafo(tituloAnexo, true)}${textoAnexo.map((p) => parrafo(p)).join('')}${tablaWord(anexoFilas)}${parrafo(leyendaAnexo)}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr></w:body></w:document>`
};
const destino = new URL('../../docs/', import.meta.url);
const nombre = 'Pruebas_E3_Produccion_Resumen_y_Anexo';
await mkdir(destino, { recursive: true });
await guardarWord(partes, new URL(`${nombre}.docx`, destino));
const md = (filas) => '| ' + columnas.join(' | ') + ' |\n| ' + columnas.map(() => '---').join(' | ') + ' |\n'
    + filas.map((f) => '| ' + f.map((s) => s.replaceAll('|', '\\|').replaceAll('\n', ' ')).join(' | ') + ' |').join('\n');
await writeFile(new URL(`${nombre}.md`, destino), `# ${tituloPrincipal}\n\n${textoPrincipal.join('\n\n')}\n\n${md(resumenFilas)}\n\n*${leyendaPrincipal}*\n\n# ${tituloAnexo}\n\n${textoAnexo.join('\n\n')}\n\n${md(anexoFilas)}\n\n*${leyendaAnexo}*\n`);
console.log(`Word y Markdown: ${nombre}; ${resumenFilas.length} casos principales y ${anexoFilas.length} casos completos.`);
