import { mkdir, writeFile } from 'node:fs/promises';
import { guardarWord } from './word-document.js';

const contenido = [
['Anexo A. Manual de usuario', 'titulo'],
['Sistema de Biblioteca de Ingeniería Informática', 'subtitulo'],
['A.1 Acceso y opciones comunes', 'encabezado'],
['Requisitos: conexión a internet, navegador web y una cuenta habilitada proporcionada por el responsable de la biblioteca.'],
['1. Ingresar a https://diplomado-bov.pages.dev/login.'],
['2. Escribir el usuario y la contraseña; presionar el botón de inicio de sesión.'],
['3. Comprobar el rol mostrado en la barra superior. El menú presenta las opciones correspondientes a Bibliotecario o Lector.'],
['4. Para consultar los datos de la cuenta, seleccionar Mi perfil. Esta pantalla permite consultar la información del usuario autenticado.'],
['5. Al terminar, presionar Logout en la barra superior. Si la sesión vence, iniciar sesión nuevamente.'],
['A.2 Procedimientos del Bibliotecario', 'encabezado'],
['Gestionar usuarios', 'subtitulo'],
['Seleccionar Usuarios → Agregar Usuario. Elegir una persona existente o registrar una persona nueva, completar los datos solicitados, asignar el rol y guardar. Para una cuenta de Lector, completar también los datos de lector requeridos. Revisar el registro en la lista; usar Editar o las opciones de estado cuando corresponda.'],
['Gestionar áreas', 'subtitulo'],
['Seleccionar Áreas, ingresar el nombre y guardar el registro. Para corregir un nombre, usar Editar y Guardar. Cambiar el estado de un área mediante la opción correspondiente y confirmar la operación.'],
['Registrar y mantener recursos', 'subtitulo'],
['Seleccionar Recursos → Agregar Nuevo Recurso. Elegir Libro o Tesis, completar código topográfico, título, año, área y los campos específicos del tipo elegido; registrar las cantidades cuando corresponda y guardar. Revisar el recurso en la lista. Usar Editar para corregir sus datos y la opción de estado para indicar disponibilidad, mantenimiento o baja.'],
['Gestionar lectores', 'subtitulo'],
['Seleccionar Lectores y abrir el formulario de registro. Completar CI, nombres, apellidos, correo, tipo de lector y RU cuando corresponda. Guardar y verificar el registro. Usar Editar para corregir datos y consultar el estado antes de asignar un préstamo.'],
['Asignar un préstamo', 'subtitulo'],
['1. Seleccionar Préstamos → Asignar Nuevo Préstamo.'],
['2. Buscar y seleccionar el lector; buscar el recurso por título o código.'],
['3. Indicar la fecha prevista de devolución y el tipo de préstamo: sala o domicilio. Las tesis se prestan únicamente en sala.'],
['4. Guardar y verificar el préstamo en la lista. El sistema descuenta la disponibilidad del recurso.'],
['El lector debe estar habilitado y el recurso debe disponer de ejemplares. La versión actual del backend permite un único préstamo pendiente por lector, incluidos los vencidos. Si una condición impide la operación, revisar el mensaje mostrado y resolverla antes de volver a intentar.'],
['Registrar una devolución', 'subtitulo'],
['En Préstamos, localizar el registro pendiente y presionar Devolver. Confirmar la operación si se solicita y comprobar el estado Devuelto. El sistema recupera la disponibilidad del ejemplar.'],
['Atender atrasos y restricciones', 'subtitulo'],
['Cuando la fecha prevista ya pasó y el préstamo continúa pendiente, el sistema registra una sanción automática. Al devolverlo, concluye la sanción de ese préstamo; otros atrasos, sanciones manuales o el estado Inactivo mantienen la restricción. No cambiar manualmente el estado para eludir un atraso: registrar primero la devolución correspondiente.'],
['A.3 Procedimientos del Lector', 'encabezado'],
['Buscar recursos y consultar disponibilidad', 'subtitulo'],
['Seleccionar Buscar recursos. Escribir título, autor, código, área o palabra clave. Activar Solo disponibles si se desea limitar los resultados. Revisar el tipo, el estado de disponibilidad y los ejemplares disponibles en la tabla. Para obtener un préstamo, acudir al Bibliotecario; el Lector no registra préstamos desde esta pantalla.'],
['Consultar préstamos e historial', 'subtitulo'],
['Seleccionar Mis préstamos. Usar Pendientes para identificar los préstamos por devolver, Historial completo para consultar todos los registros y Devueltos para ver los concluidos. Revisar las fechas y los estados; presentar el recurso al Bibliotecario para registrar la devolución.'],
['El Lector consulta únicamente sus préstamos y sus datos en Mi perfil. No dispone de opciones para agregar, editar o eliminar recursos ni administrar otras cuentas.'],
['A.4 Aplicación móvil del Bibliotecario', 'encabezado'],
['Instalar el APK proporcionado por el responsable del proyecto, abrir la aplicación e iniciar sesión con una cuenta de Bibliotecario. Desde Recursos, buscar o filtrar registros, consultar detalles y usar los formularios de creación, edición y cambio de estado. Revisar los datos antes de guardar.'],
['Si está habilitada la opción Escanear recurso con IA, tomar una fotografía o elegir una imagen de la galería. Revisar los campos reconocidos, seleccionar cuáles aplicar y completar los datos faltantes antes de guardar. El registro manual permanece disponible si el escaneo no funciona.'],
['La app admite consultas de préstamos y lectores; sus operaciones administrativas completas se realizan en la web. El rol Lector utiliza la aplicación web. Cerrar sesión al finalizar.'],
['A.5 Solución de problemas frecuentes', 'encabezado'],
['Credenciales rechazadas: verificar usuario y contraseña. Si la cuenta está bloqueada o inactiva, contactar al responsable de la biblioteca.'],
['Sin permiso: confirmar que se inició sesión con el rol adecuado.'],
['Sin resultados: borrar o cambiar la búsqueda y desactivar Solo disponibles.'],
['Préstamo rechazado: comprobar el estado del lector, los préstamos pendientes y la disponibilidad del recurso.'],
['Sin conexión o error del servicio: comprobar internet y volver a intentar. Si el problema persiste, comunicar al responsable la pantalla y el mensaje observado.'],
['Nota de alcance: este manual describe la versión actual del proyecto. Las reglas nuevas de límite de préstamos y sanción por atraso fueron validadas localmente; su uso en la dirección pública requiere que esa versión esté desplegada.']
];
const dir = new URL('../../docs/', import.meta.url);
await mkdir(dir,{recursive:true});
const md=contenido.map(([t,tipo])=>(tipo==='titulo'?'# ':tipo==='encabezado'?'## ':tipo==='subtitulo'?'### ':'')+t).join('\n\n')+'\n';
await writeFile(new URL('Anexo_A_Manual_usuario.md',dir),md);
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const paragraph=([text,tipo])=>`<w:p><w:pPr><w:spacing w:after="120"/>${tipo?'<w:keepNext/>':''}</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>${tipo?'<w:b/>':''}<w:sz w:val="${tipo==='titulo'?32:tipo==='encabezado'?26:22}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
await guardarWord({
'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
'_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
'word/document.xml':`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${contenido.map(paragraph).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`
},new URL('Anexo_A_Manual_usuario.docx',dir));
console.log('Manual generado: docs/Anexo_A_Manual_usuario.docx y .md');
