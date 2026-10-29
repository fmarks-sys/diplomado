import {writeFile} from 'node:fs/promises';
const items=[];
const e=k=>`pm.environment.get('${k}')`;
const request=(id,name,method,route,status,extra='',body,readerToken)=>{
 const script=`pm.test('HTTP ${status}',()=>pm.response.to.have.status(${status}));
pm.test('Respuesta JSON',()=>pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json'));
${status>=400?"pm.test('Error informado',()=>pm.expect(pm.response.json().error).to.be.a('string').and.not.empty);":''}
const base=pm.environment.get('url_backend');
const admin=pm.environment.get('token_bibliotecario');
const inspect=async(route)=>{const r=await pm.sendRequest({url:base+route,method:'GET',header:{Authorization:'Bearer '+admin}});pm.test('Consulta auxiliar '+route,()=>pm.expect(r.code).to.eql(200));if(r.code!==200)throw Error('Consulta auxiliar no aprobada');return r.json();};
${extra}`;
 items.push({name:`${id} ${name}`,request:{method,header:[{key:'Authorization',value:`Bearer {{${readerToken||'token_bibliotecario'}}}`},...(body?[{key:'Content-Type',value:'application/json'}]:[])],url:'{{url_backend}}'+route,...(body?{body:{mode:'raw',raw:JSON.stringify(body,null,2),options:{raw:{language:'json'}}}}:{})},event:[{listen:'test',script:{type:'text/javascript',exec:script.split('\n')}}]});
};
const loan=(reader,resource=1)=>({lector_id:`{{lector_${reader}}}`,recurso_id:`{{recurso_${resource}}}`,fecha_devolucion_prevista:'{{fecha_futura}}',tipo_prestamo:'DOMICILIO'});
const state=(reader,expected,manual='ACTIVO')=>`const lector=(await inspect('/api/lectores')).find(l=>l.id===Number(${e('lector_'+reader)}));
pm.test('Estado efectivo ${expected}',()=>pm.expect(lector?.estado).to.eql('${expected}'));
pm.test('Estado manual ${manual} conservado',()=>pm.expect(lector?.estado_manual).to.eql('${manual}'));`;
request('O4-01','Primer préstamo permitido','POST','/api/prestamos',201,`pm.test('Préstamo creado',()=>pm.expect(pm.response.json().prestamo.lector_id).to.eql(Number(${e('lector_base')})));pm.environment.set('prestamo_base',pm.response.json().prestamo.id);`,loan('base'));
request('O4-02','Segundo recurso rechazado sin descontar stock','POST','/api/prestamos',409,`const r=await inspect('/api/recursos/'+${e('recurso_2')});pm.test('Stock conservado',()=>pm.expect(r.cantidad_disponible).to.eql(Number(${e('stock_recurso_2')})));`,loan('base',2));
request('O4-03','Dos altas simultáneas para el mismo lector','GET','/api/v1/salud',200,`
const send=id=>pm.sendRequest({url:base+'/api/prestamos',method:'POST',header:{Authorization:'Bearer '+admin,'Content-Type':'application/json'},body:{mode:'raw',raw:JSON.stringify({lector_id:Number(${e('lector_concurrente')}),recurso_id:Number(pm.environment.get('recurso_'+id)),fecha_devolucion_prevista:${e('fecha_futura')},tipo_prestamo:'DOMICILIO'})}});
const responses=await Promise.all([send(1),send(2)]);
pm.test('Concurrencia: una 201 y otra 409',()=>pm.expect(responses.map(r=>r.code).sort()).to.eql([201,409]));
const own=(await inspect('/api/prestamos')).filter(p=>p.lector_id===Number(${e('lector_concurrente')})&&['PRESTADO','VENCIDO'].includes(p.estado));
pm.test('Un único préstamo pendiente',()=>pm.expect(own.length).to.eql(1));`);
request('O4-04','Atraso registrado automáticamente','GET','/api/prestamos/mis-prestamos',200,`const p=pm.response.json().find(p=>p.id===Number(${e('prestamo_atraso')}));pm.test('Préstamo vencido',()=>pm.expect(p?.estado).to.eql('VENCIDO'));${state('atraso','SANCIONADO')}`,undefined,'token_atraso');
request('O4-05','Revisión repetida no duplica sanciones','GET','/api/prestamos/mis-prestamos',200,`pm.test('Préstamo sigue vencido',()=>pm.expect(pm.response.json().find(p=>p.id===Number(${e('prestamo_atraso')}))?.estado).to.eql('VENCIDO'));await inspect('/api/prestamos/mis-prestamos');${state('atraso','SANCIONADO')}`,undefined,'token_atraso');
// La tabla sanciones no tiene endpoint de consulta: la unicidad se verifica
// mediante SQL al ejecutar el comando de verificación y limpieza.
items.at(-1).event[0].script.exec=items.at(-1).event[0].script.exec.map(s=>s.replace("await inspect('/api/prestamos/mis-prestamos');",''));
request('O4-06','Préstamo vencido impide otro recurso','POST','/api/prestamos',409,'',loan('atraso',2));
request('O4-14','Cambio manual no elude ni sustituye sanción por atraso','PATCH','/api/lectores/estado/{{lector_atraso}}',409,state('atraso','SANCIONADO'));
request('O4-07','Devolución levanta únicamente el atraso','PATCH','/api/prestamos/devolver/{{prestamo_devolucion}}',200,`pm.test('Préstamo devuelto',()=>pm.expect(pm.response.json().prestamo.estado).to.eql('DEVUELTO'));${state('devolucion','ACTIVO')}`);
request('O4-08','Lector habilitado puede volver a prestar','POST','/api/prestamos',201,'',loan('devolucion'));
request('O4-09','Devolución conserva INACTIVO manual','PATCH','/api/prestamos/devolver/{{prestamo_inactivo}}',200,state('inactivo','INACTIVO','INACTIVO'));
request('O4-10','Devolución conserva SANCIONADO manual','PATCH','/api/prestamos/devolver/{{prestamo_manual}}',200,state('manual','SANCIONADO','SANCIONADO'));
request('O4-11','Devolución conserva otra sanción activa','PATCH','/api/prestamos/devolver/{{prestamo_otra}}',200,state('otra','SANCIONADO'));
request('O4-12','Datos históricos con varios atrasos mantienen restricción','PATCH','/api/prestamos/devolver/{{prestamo_historico_1}}',200,`${state('historico','SANCIONADO')}
const r=await pm.sendRequest({url:base+'/api/prestamos/devolver/'+${e('prestamo_historico_2')},method:'PATCH',header:{Authorization:'Bearer '+admin}});
pm.test('Segunda devolución HTTP 200',()=>pm.expect(r.code).to.eql(200));
const final=(await inspect('/api/lectores')).find(l=>l.id===Number(${e('lector_historico')}));pm.test('Habilitado al devolver ambos',()=>pm.expect(final?.estado).to.eql('ACTIVO'));`);
request('O4-13','Fecha de hoy no constituye atraso','GET','/api/prestamos/mis-prestamos',200,`pm.test('Vence hoy sin estar vencido',()=>pm.expect(pm.response.json().find(p=>p.id===Number(${e('prestamo_hoy')}))?.estado).to.eql('PRESTADO'));${state('hoy','ACTIVO')}`,undefined,'token_hoy');
const collection={info:{name:'E3 - O4 en despliegue (fixtures preparados)',schema:'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',description:'Ejecutar los 14 casos completos, en orden y con una sola iteración. Antes: pnpm postman:objetivo4:preparar. Después, incluso si falla: pnpm postman:objetivo4:limpiar. Ver tests/POSTMAN-O4.md. Los tokens e IDs se importan desde un entorno privado generado. Las comprobaciones SQL de sanciones se realizan al verificar y limpiar; un Runner verde por sí solo no acredita esas comprobaciones. O4-03 usa GET salud como disparador de dos POST concurrentes mediante pm.sendRequest.'},event:[{listen:'prerequest',script:{type:'text/javascript',exec:["if(!pm.environment.get('o4_fixture')||!pm.environment.get('token_bibliotecario'))throw Error('Importar el entorno privado generado por postman:objetivo4:preparar');","if(Date.now()>Number(pm.environment.get('o4_expira')))throw Error('El entorno de pruebas venció; limpiar y preparar datos nuevos');"]}}],item:items};
// Compatibilidad con los runtimes de Newman que no admiten await en el cuerpo
// superior ni la versión Promise de pm.sendRequest.
for(const item of items){
 const script=item.event[0].script;
 const body=script.exec.join('\n').replaceAll('pm.sendRequest(', 'sendRequest(');
 script.exec=[`(async function(){
 const sendRequest=options=>new Promise((resolve,reject)=>pm.sendRequest(options,(error,response)=>error?reject(error):resolve(response)));
 ${body}
 })().catch(error=>pm.test('Ejecución del script sin errores',function(){throw error;}));`];
}
await writeFile(new URL('./objetivo4-deploy.postman_collection.json',import.meta.url),JSON.stringify(collection,null,2)+'\n');
console.log('Colección O4 generada: 14 casos.');
