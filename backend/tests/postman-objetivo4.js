import {readFile,writeFile,mkdir,unlink} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import {MOTIVO_ATRASO} from '../modules/prestamos/sanciones.js';

const modo=process.argv[2];
if(!['preparar','limpiar','newman'].includes(modo))throw Error('Usar preparar, limpiar o newman');
const privateDir=new URL('./.privado-o4/',import.meta.url);
const manifestFile=new URL('estado.json',privateDir);
const envFile=new URL('O4.postman_environment.json',privateDir);
const api='https://diplomado-production-40c1.up.railway.app';
const env=await readFile(new URL('../.env',import.meta.url),'utf8');
const config=dotenv.parse(env.split(/\r?\n/).filter(s=>/^\s*#/.test(s)).map(s=>s.replace(/^\s*#\s?/, '')).join('\n'));
if(!['DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD'].every(k=>config[k])||['localhost','127.0.0.1','::1'].includes(config.DB_HOST))throw Error('Falta la configuración remota DB_* comentada en backend/.env');
const fingerprint=createHash('sha256').update([config.DB_HOST,config.DB_PORT,config.DB_NAME,config.DB_USER].join('|')).digest('hex');
const pool=new pg.Pool({host:config.DB_HOST,port:Number(config.DB_PORT),database:config.DB_NAME,user:config.DB_USER,password:config.DB_PASSWORD,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});
let estado;
let preparadoEnEstaEjecucion=false;
const request=async(method,route,token,body)=>{
 const r=await fetch(api+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('Preparación HTTP '+r.status);
 return r.json();
};
const prepare=async()=>{
 try{await readFile(manifestFile);throw Error('Hay fixtures pendientes: ejecutar primero postman:objetivo4:limpiar');}catch(e){if(e.code!=='ENOENT')throw e;}
 let credentials;
 if(process.argv.includes('--credentials-stdin')){let s='';for await(const chunk of process.stdin)s+=chunk;credentials=JSON.parse(s).bibliotecario;}
 else credentials={username:process.env.E3_PROD_BIBLIOTECARIO_USERNAME,password:process.env.E3_PROD_BIBLIOTECARIO_PASSWORD};
 if(!credentials?.username||!credentials?.password)throw Error('Definir E3_PROD_BIBLIOTECARIO_USERNAME y E3_PROD_BIBLIOTECARIO_PASSWORD en la terminal');
 const login=await request('POST','/api/auth/login',null,credentials);
 assert.equal(login.user.rol,'BIBLIOTECARIO');
 const perfil=await request('GET','/api/lectores/mi-perfil',login.token);
 const identidad=await pool.query(`SELECT lo.id AS login_id,p.id AS persona_id,lo.username,p.ci,p.correo,r.nombre AS rol
 FROM login lo JOIN personas p ON p.id=lo.persona_id JOIN roles r ON r.id=lo.rol_id WHERE lo.id=$1`,[perfil.login_id]);
 assert.equal(identidad.rowCount,1);
 for(const campo of ['login_id','persona_id','username','ci','correo','rol'])assert.equal(String(identidad.rows[0][campo]),String(perfil[campo]),'La base no coincide con Railway');
 const pendientes=await pool.query("SELECT count(*)::int AS n FROM prestamos WHERE estado='PRESTADO' AND fecha_devolucion_prevista<CURRENT_DATE");
 if(pendientes.rows[0].n)throw Error('Existen atrasos ajenos sin procesar; no se prepararán las pruebas');
 const role=(await pool.query("SELECT id FROM roles WHERE nombre='LECTOR' AND estado='ACTIVO'")).rows[0];
 if(!role)throw Error('Falta rol LECTOR activo');
 const tag='P4_'+randomBytes(5).toString('hex');
 const password=randomBytes(24).toString('hex'),hash=await bcrypt.hash(password,10);
 estado={tag,fingerprint,lectores:{},personas:[],recursos:[],prestamos:{},inicio_utc:new Date().toISOString()};
 const variables={url_backend:api,token_bibliotecario:login.token,o4_fixture:tag,o4_expira:Date.now()+45*60*1000};
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  for(const key of ['base','concurrente','atraso','devolucion','inactivo','manual','otra','historico','hoy']){
   const persona=(await client.query('INSERT INTO personas(ci,nombres,ap,am,correo) VALUES($1,$2,$3,$4,$5) RETURNING id',[tag+'_'+estado.personas.length,'Prueba O4','Postman','Ficticia',tag+'_'+key+'@example.org'])).rows[0].id;
   estado.personas.push(persona);
   const manual=key==='inactivo'?'INACTIVO':key==='manual'?'SANCIONADO':'ACTIVO';
   const lector=(await client.query("INSERT INTO lectores(persona_id,tipo_lector,estado) VALUES($1,'EXTERNO',$2) RETURNING id",[persona,manual])).rows[0].id;
   estado.lectores[key]=lector;variables['lector_'+key]=lector;
   await client.query("INSERT INTO login(persona_id,rol_id,username,password_hash,estado) VALUES($1,$2,$3,$4,'ACTIVO')",[persona,role.id,tag+'_'+key,hash]);
  }
  for(let i=1;i<=2;i++){
   const resource=(await client.query("INSERT INTO recursos(codigo_topografico,titulo,anio_publicacion,tipo_recurso,cantidad_total,cantidad_disponible) VALUES($1,$2,2026,'LIBRO',50,50) RETURNING id",[tag+'_'+i,'Libro ficticio Postman O4'])).rows[0].id;
   estado.recursos.push(resource);variables['recurso_'+i]=resource;
  }
  const dates=(await client.query("SELECT CURRENT_DATE::text AS hoy,(CURRENT_DATE+7)::text AS futura,(CURRENT_DATE-1)::text AS ayer")).rows[0];
  variables.fecha_futura=dates.futura;estado.fecha_hoy=dates.hoy;
  for(const key of ['atraso','devolucion','inactivo','manual','otra','historico','hoy']){
   for(let i=1;i<=(key==='historico'?2:1);i++){
    const name=key==='historico'?key+'_'+i:key;
    const prestamo=(await client.query("INSERT INTO prestamos(lector_id,recurso_id,fecha_devolucion_prevista,tipo_prestamo) VALUES($1,$2,$3,'DOMICILIO') RETURNING id",[estado.lectores[key],estado.recursos[i-1],key==='hoy'?dates.hoy:dates.ayer])).rows[0].id;
    estado.prestamos[name]=prestamo;variables['prestamo_'+name]=prestamo;
    await client.query('UPDATE recursos SET cantidad_disponible=cantidad_disponible-1 WHERE id=$1',[estado.recursos[i-1]]);
   }
  }
  await client.query("INSERT INTO sanciones(lector_id,motivo,fecha_fin) VALUES($1,'Restricción manual ficticia Postman O4',CURRENT_DATE+7)",[estado.lectores.otra]);
  variables.stock_recurso_2=(await client.query('SELECT cantidad_disponible FROM recursos WHERE id=$1',[estado.recursos[1]])).rows[0].cantidad_disponible;
  await mkdir(privateDir,{recursive:true});
  // Guardar el manifiesto antes de confirmar permite recuperar la limpieza
  // también si falla la exportación del entorno o se interrumpe el proceso.
  await writeFile(manifestFile,JSON.stringify(estado,null,2));
  preparadoEnEstaEjecucion=true;
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 for(const key of ['atraso','hoy']){
  const account=await request('POST','/api/auth/login',null,{username:tag+'_'+key,password});
  assert.equal(account.user.rol,'LECTOR');variables['token_'+key]=account.token;
 }
 await writeFile(envFile,JSON.stringify({name:'O4 Railway - fixtures privados',values:Object.entries(variables).map(([key,value])=>({key,value:String(value),enabled:true,type:key.startsWith('token_')?'secret':'default'})),_postman_variable_scope:'environment'},null,2));
 console.log('Fixtures preparados. Importar tests/.privado-o4/O4.postman_environment.json y la colección objetivo4-deploy. No publicar el entorno.');
};
const clean=async(verificar=true)=>{
 estado=JSON.parse(await readFile(manifestFile,'utf8'));
 assert.equal(estado.fingerprint,fingerprint,'Cambió la base: no se limpiará otra configuración');
 assert.match(estado.tag,/^P4_[a-f0-9]{10}$/);
 const personas=await pool.query('SELECT id,ci FROM personas WHERE id=ANY($1::int[])',[estado.personas]);
 assert.ok(personas.rows.every(p=>p.ci.startsWith(estado.tag+'_')),'No eliminar personas ajenas');
 const lectorIds=Object.values(estado.lectores),comprobaciones=[];
 const check=(nombre,ok)=>comprobaciones.push({nombre,estado:ok?'Aprobado':'Fallido'});
 if(verificar){
  const sanciones=(await pool.query('SELECT prestamo_id,motivo,estado FROM sanciones WHERE lector_id=ANY($1::int[])',[lectorIds])).rows;
  const lectorRows=(await pool.query('SELECT id,estado FROM lectores WHERE id=ANY($1::int[])',[lectorIds])).rows;
  const loanRows=(await pool.query('SELECT id,lector_id,estado FROM prestamos WHERE lector_id=ANY($1::int[])',[lectorIds])).rows;
  for(const key of ['atraso','devolucion','inactivo','manual','otra','historico_1','historico_2']){
   const rows=sanciones.filter(s=>s.prestamo_id===estado.prestamos[key]&&s.motivo===MOTIVO_ATRASO);
   check('Sanción automática única: '+key,rows.length===1);
   check('Estado de sanción: '+key,rows.length===1&&rows[0].estado===(key==='atraso'?'ACTIVA':'CUMPLIDA'));
  }
  check('Sanción manual continúa activa',sanciones.some(s=>s.motivo==='Restricción manual ficticia Postman O4'&&s.estado==='ACTIVA'));
  check('Sin sanción por vencer hoy',!sanciones.some(s=>s.prestamo_id===estado.prestamos.hoy));
  check('Un único préstamo concurrente',loanRows.filter(p=>p.lector_id===estado.lectores.concurrente&&['PRESTADO','VENCIDO'].includes(p.estado)).length===1);
  for(const key of ['atraso','inactivo','manual','otra'])check('Estado manual conservado: '+key,lectorRows.find(l=>l.id===estado.lectores[key])?.estado===(key==='inactivo'?'INACTIVO':key==='manual'?'SANCIONADO':'ACTIVO'));
 }
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('DELETE FROM sanciones WHERE lector_id=ANY($1::int[])',[lectorIds]);
  await client.query('DELETE FROM prestamos WHERE lector_id=ANY($1::int[])',[lectorIds]);
  await client.query('DELETE FROM recursos WHERE id=ANY($1::int[]) AND codigo_topografico LIKE $2',[estado.recursos,estado.tag+'_%']);
  await client.query('DELETE FROM personas WHERE id=ANY($1::int[]) AND ci LIKE $2',[estado.personas,estado.tag+'_%']);
  const n=(await client.query(`SELECT (SELECT count(*) FROM personas WHERE id=ANY($1::int[]))+
   (SELECT count(*) FROM lectores WHERE id=ANY($2::int[]))+
   (SELECT count(*) FROM prestamos WHERE lector_id=ANY($2::int[]))+
   (SELECT count(*) FROM sanciones WHERE lector_id=ANY($2::int[]))+
   (SELECT count(*) FROM recursos WHERE id=ANY($3::int[])) AS n`,[estado.personas,lectorIds,estado.recursos])).rows[0].n;
  assert.equal(Number(n),0);await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 const reporte={ejecucion_utc:new Date().toISOString(),entorno:'Producción Railway',comprobaciones_sql:comprobaciones,limpieza:{completada:true,registros_temporales_restantes:0},nota:'Complemento SQL. El resultado de las aserciones HTTP debe consultarse en Postman o en el reporte Newman de esta ejecución.'};
 await mkdir(new URL('./reportes/',import.meta.url),{recursive:true});
 await writeFile(new URL('./reportes/objetivo4-postman-verificacion.json',import.meta.url),JSON.stringify(reporte,null,2)+'\n');
 await unlink(manifestFile);await unlink(envFile).catch(e=>{if(e.code!=='ENOENT')throw e;});
 console.log('Limpieza completa: 0 registros ficticios restantes. SQL: '+comprobaciones.filter(c=>c.estado==='Aprobado').length+'/'+comprobaciones.length);
 if(comprobaciones.some(c=>c.estado==='Fallido'))throw Error('Alguna comprobación SQL no fue aprobada; datos limpiados. Revisar el reporte.');
};
try{
 if(modo==='limpiar')await clean(!process.argv.includes('--solo-limpiar'));
 else{
  let failure;
  try{
   await prepare();
   if(modo==='newman'){
    const require=createRequire(import.meta.url);let newman;
    try{newman=require('newman');}catch{newman=require(path.join(process.env.APPDATA,'npm','node_modules','newman'));}
    const collection=JSON.parse(await readFile(new URL('./objetivo4-deploy.postman_collection.json',import.meta.url),'utf8'));
    const environment=JSON.parse(await readFile(envFile,'utf8'));
    const result=await new Promise((resolve,reject)=>newman.run({collection,environment,reporters:[],timeoutRequest:20000},(error,summary)=>error?reject(error):resolve(summary)));
    const failures=result.run.failures.map(f=>({caso:f.source?.name||'Colección',tipo:f.error?.name,mensaje:f.error?.message}));
    // Newman registra también las solicitudes auxiliares pm.sendRequest como
    // ejecuciones del mismo item. Agruparlas evita confundir HTTPs con casos.
    const grupos=new Map();
    for(const ex of result.run.executions){
      const id=ex.item.name.split(' ')[0];
      if(!grupos.has(id))grupos.set(id,{id,escenario:ex.item.name,http_observados:[],pruebas:[],error_red:false});
      const c=grupos.get(id);c.http_observados.push(ex.response?.code??null);c.error_red ||= !!ex.requestError;
      for(const a of ex.assertions||[]){const previous=c.pruebas.find(p=>p.nombre===a.assertion);if(previous){if(a.error)previous.estado='Fallido';}else c.pruebas.push({nombre:a.assertion,estado:a.error?'Fallido':'Aprobado'});}
    }
    const casos=[...grupos.values()].map(c=>({...c,estado:c.error_red||!c.pruebas.length||failures.some(f=>f.caso===c.escenario)||c.pruebas.some(p=>p.estado==='Fallido')?'Fallido':'Aprobado'}));
    const output={ejecucion_utc:new Date().toISOString(),entorno:'Producción Railway',herramienta:'Newman',resumen:{casos:casos.length,aprobados:casos.filter(c=>c.estado==='Aprobado').length,fallos_newman:result.run.failures.length},casos,errores:failures};
    await mkdir(new URL('./reportes/',import.meta.url),{recursive:true});
    await writeFile(new URL('./reportes/objetivo4-postman-produccion.json',import.meta.url),JSON.stringify(output,null,2)+'\n');
    for(const c of casos)console.log(c.id+' '+c.estado);
    if(result.run.failures.length||casos.length!==14)throw Error('La colección no aprobó todos los casos');
   }
  }catch(e){failure=e;}
  if(preparadoEnEstaEjecucion&&(modo==='newman'||failure)){
   try{await readFile(manifestFile);await clean(!failure);}catch(e){if(e.code!=='ENOENT')failure ||= e;}
  }
  if(failure)throw failure;
 }
}finally{await pool.end();}
