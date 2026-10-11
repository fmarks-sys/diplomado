import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { guardarWord } from './word-document.js';
import assert from 'node:assert/strict';
const reporte=JSON.parse(await readFile(new URL('./reportes/objetivo4-local.json',import.meta.url),'utf8'));
assert.equal(reporte.resumen.casos,14,'Debe ejecutarse la cobertura completa O4');
assert.equal(reporte.resumen.aprobados,14,'No generar conclusión de cumplimiento si hay casos fallidos');
assert.equal(reporte.limpieza.completada,true,'Debe verificarse la limpieza');
const dir=new URL('../../docs/',import.meta.url);
await mkdir(dir,{recursive:true});
const fecha=new Intl.DateTimeFormat('es-BO',{timeZone:'America/La_Paz',dateStyle:'long',timeStyle:'medium'}).format(new Date(reporte.ejecucion_utc));
const conclusion='4. El objetivo de préstamos, devoluciones y sanciones se cumplió funcionalmente en el backend y se validó en desarrollo local. Se mantienen el registro de préstamos, las devoluciones y la disponibilidad, respaldados por PR-17, PR-19, PR-22, PR-31 y PR-39 de las pruebas anteriores de producción. Adicionalmente, CA05.4 impide más de un préstamo pendiente por lector, incluyendo vencidos, con respuesta 409 y bloqueo transaccional frente a altas simultáneas. CA05.5 registra automáticamente la sanción por atraso y la concluye al devolver el préstamo; conserva las restricciones manuales y otros atrasos pendientes. Los casos O4-01 a O4-14 de objetivo4-local.json verifican estas reglas con datos ficticios y limpieza completa. La versión modificada debe desplegarse y revalidarse antes de atribuir estos resultados nuevos al entorno de producción.';
const intro=[`Ejecución local: ${fecha} (America/La_Paz).`,`${reporte.resumen.aprobados}/${reporte.resumen.casos} casos aprobados; ${reporte.resumen.fallidos} fallos. Limpieza completa: ${reporte.limpieza.completada}.`,
'E3: backend/tests/reportes/objetivo4-local.json. Estos resultados locales complementan los reportes anteriores E1 y E2; no se suman como nuevos casos de producción.',
'Comando desde backend: pnpm test:objetivo4. Requiere NODE_ENV=development, PostgreSQL local y JWT_SECRET de desarrollo. Inicia una API temporal, crea fixtures ficticios y elimina únicamente sus registros.',
'La revisión automática se ejecuta al iniciar el servidor, cada 60 segundos y al consultar o crear préstamos. El estado efectivo también detecta atrasos inmediatamente. La sanción dura hasta devolver el préstamo; otros atrasos y restricciones manuales siguen bloqueando al lector.',
'El estado manual de lectores no se sobrescribe. La API calcula SANCIONADO cuando corresponde. La tabla sanciones conserva el historial automático con el motivo reservado Sanción automática por atraso (CA05.5). fecha_fin se actualiza mientras continúa el atraso y se fija al devolver; no define una penalización adicional.'];
const headers=['ID','Escenario','Ruta','Esperado','Obtenido','Evidencia','Estado'];
const row=c=>[c.id,c.escenario,c.ruta,c.esperado,c.obtenido,'E3 · '+c.id,c.estado];
const important=new Set(['O4-02','O4-03','O4-04','O4-07','O4-09','O4-10','O4-11','O4-14']);
const principales=reporte.casos.filter(c=>important.has(c.id)).map(row), todas=reporte.casos.map(row);
const mdTable=rows=>[headers,Array(7).fill('---'),...rows].map(r=>'| '+r.map(t=>String(t).replaceAll('|','/')).join(' | ')+' |').join('\n');
const md='# Objetivo 4: evidencia y conclusión\n\n'+intro.join('\n\n')+'\n\n## Casos principales para 2.8\n\n'+mdTable(principales)+'\n\n## Anexo: casos locales completos\n\n'+mdTable(todas)+'\n\n## Conclusión 4\n\n'+conclusion+'\n';
await writeFile(new URL('Objetivo4_Evidencias_y_Conclusion.md',dir),md);
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const p=(s,b=false)=>`<w:p><w:r><w:rPr>${b?'<w:b/>':''}<w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${esc(s)}</w:t></w:r></w:p>`;
const table=rows=>`<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(n=>`<w:${n} w:val="single" w:sz="4"/>`).join('')}</w:tblBorders></w:tblPr>${[headers,...rows].map((r,i)=>`<w:tr>${i===0?'<w:trPr><w:tblHeader/></w:trPr>':''}${r.map(t=>'<w:tc>'+p(t,i===0)+'</w:tc>').join('')}</w:tr>`).join('')}</w:tbl>`;
await guardarWord({
'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
'_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
'word/document.xml':`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${p('Objetivo 4: evidencia y conclusión',true)}${intro.map(t=>p(t)).join('')}${p('Casos principales para 2.8',true)}${table(principales)}${p('Anexo: casos locales completos',true)}${table(todas)}${p('Conclusión 4',true)}${p(conclusion)}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850"/></w:sectPr></w:body></w:document>`
},new URL('Objetivo4_Evidencias_y_Conclusion.docx',dir));
try {
 const file=new URL('revision_monografia/contenido.json',dir);
 const data=JSON.parse(await readFile(file,'utf8'));
 data.replacements['309']=conclusion;
 data.replacements['309']=data.replacements['309'].replace('O4-01 a O4-14','O4-01 a O4-14');
 data.replacements['315']='2. Mantener pruebas de regresión del límite de préstamos, la sanción por atraso y su levantamiento, incluyendo solicitudes simultáneas y conservación de restricciones manuales. Confirmar estas reglas con la biblioteca y repetir su validación al desplegar cada versión.';
 data.replacements['272']='El proyecto dispone de pruebas unitarias de Node.js y Flutter. Para esta modificación se ejecutaron 70 pruebas de Node.js, todas aprobadas, y 14 casos nuevos de integración HTTP con PostgreSQL local. Las ejecuciones Newman anteriores de producción se conservan como evidencia separada; no se realizó una nueva ejecución Flutter en esta revisión.';
 data.tables.find(t=>t.index===273).rows[1]=['Unitaria','Node.js: node --experimental-vm-modules --test tests/*.test.js','70 pruebas aprobadas. Las pruebas Flutter existentes no se volvieron a ejecutar.'];
 data.inserts.find(i=>i.after===290).blocks=[[`E3: backend/tests/reportes/objetivo4-local.json. La implementación nueva de CA05.4 y CA05.5 fue validada en desarrollo local con ${reporte.resumen.aprobados} casos aprobados y limpieza completa. Estos resultados complementan las ejecuciones anteriores de producción; deben revalidarse después de desplegar la versión modificada.`],['Las pruebas O4 verifican el límite de préstamos, concurrencia, sanción por atraso y conservación de restricciones manuales. Las pruebas de API no sustituyen aceptación integral de interfaces ni mediciones de carga.']];
 data.inserts.find(i=>i.after===302).blocks=data.inserts.find(i=>i.after===302).blocks.map(([s,...rest])=>[s.replace('Permanecen pendientes los formularios móviles administrativos señalados en 2.6 y las reglas de negocio identificadas en las conclusiones.','Permanecen pendientes los formularios móviles administrativos señalados en 2.6. Las reglas CA05.4 y CA05.5 verificadas localmente requieren el despliegue de la versión modificada y su revalidación en producción.'),...rest]);
 if(!data.replacements['335'].includes('objetivo4-local.json')) data.replacements['335']+=' Evidencia adicional local: backend/tests/reportes/objetivo4-local.json.';
 if(!data.replacements['336'].includes('Objetivo4_Evidencias_y_Conclusion.docx')) data.replacements['336']+=' Los casos adicionales O4 se encuentran en docs/Objetivo4_Evidencias_y_Conclusion.docx.';
 await writeFile(file,JSON.stringify(data,null,2));
}catch(error){if(error.code!=='ENOENT')throw error;}
console.log('Evidencias y conclusión generadas en docs/.');
