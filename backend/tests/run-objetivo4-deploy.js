// Reutiliza los mismos escenarios O4 contra HTTP real, sin importar app.js ni
// ejecutar repositorios locales como sustituto del servidor desplegado.
import { readFile, writeFile, unlink } from 'node:fs/promises';
const original = await readFile(new URL('./run-objetivo4.js', import.meta.url), 'utf8');
const comienzo = `
import dotenv from 'dotenv';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { MOTIVO_ATRASO } from '../modules/prestamos/sanciones.js';
let input=''; for await (const chunk of process.stdin) input+=chunk;
const credentials=JSON.parse(input);
const envText=await (await import('node:fs/promises')).readFile(new URL('../.env',import.meta.url),'utf8');
const production=dotenv.parse(envText.split(/\\r?\\n/).filter(line=>/^\\s*#/.test(line)).map(line=>line.replace(/^\\s*#\\s?/, '')).join('\\n'));
if(!['DB_HOST','DB_PORT','DB_USER','DB_PASSWORD','DB_NAME'].every(k=>production[k]) || ['localhost','127.0.0.1','::1'].includes(production.DB_HOST)) throw Error('Configuración remota incompleta');
const pool=new pg.Pool({host:production.DB_HOST,port:Number(production.DB_PORT),user:production.DB_USER,password:production.DB_PASSWORD,database:production.DB_NAME,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});
const base='https://diplomado-production-40c1.up.railway.app';
const adminLogin=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials.bibliotecario),signal:AbortSignal.timeout(20000)});
if(adminLogin.status!==200){await pool.end();throw Error('No se pudo autenticar la cuenta Bibliotecario: HTTP '+adminLogin.status)}
const login=await adminLogin.json();
if(login.user?.rol!=='BIBLIOTECARIO'||!login.token){await pool.end();throw Error('Rol de revisión incorrecto')}
const admin=login.token;
const perfilResponse=await fetch(base+'/api/lectores/mi-perfil',{headers:{Authorization:'Bearer '+admin},signal:AbortSignal.timeout(20000)});
if(perfilResponse.status!==200){await pool.end();throw Error('No se pudo verificar el perfil remoto')}
const perfil=await perfilResponse.json();
try {
 const identidad=await pool.query(\`SELECT lo.id AS login_id,p.id AS persona_id,lo.username,p.ci,p.correo,r.nombre AS rol FROM login lo JOIN personas p ON p.id=lo.persona_id JOIN roles r ON r.id=lo.rol_id WHERE lo.id=$1\`,[perfil.login_id]);
 assert.equal(identidad.rowCount,1);
 for(const campo of ['login_id','persona_id','username','ci','correo','rol'])assert.equal(String(identidad.rows[0][campo]),String(perfil[campo]));
 const pendientes=await pool.query(\`SELECT count(*)::int AS n FROM prestamos WHERE estado='PRESTADO' AND fecha_devolucion_prevista<CURRENT_DATE\`);
 if(pendientes.rows[0].n)throw Error('Hay atrasos ajenos sin procesar; no se ejecutará la prueba sobre ellos');
} catch(error){await pool.end();throw error}
const roles=await pool.query("SELECT id FROM roles WHERE nombre='LECTOR' AND estado='ACTIVO'");
assert.equal(roles.rowCount,1);
const fixturePassword=randomBytes(24).toString('hex');
const hash=await bcrypt.hash(fixturePassword,10);
const tokens=new Map();
const token=(_rol,personaId)=>{const value=tokens.get(personaId);if(!value)throw Error('Token ficticio no preparado');return value};
`;
let source = comienzo + original.slice(original.indexOf('const tag ='));
const start=source.indexOf('const server =');
const end=source.indexOf('const request =',start);
source=source.slice(0,start)+source.slice(end);
const marker='const caso = async';
const helpers=`const getAllLectores=async()=>{const r=await request('GET','/api/lectores');assert.equal(r.status,200);return r.body};
const getLectorById=async id=>(await getAllLectores()).find(l=>l.id===id);
`;
source=source.replace(marker,helpers+marker);
source=source.replace("for(let i=0;i<2;i++) {",`for(let i=0;i<personas.length;i++) {
    const username=tag+'_'+i;
    await pool.query("INSERT INTO login(persona_id,rol_id,username,password_hash,estado) VALUES($1,$2,$3,$4,'ACTIVO')",[personas[i],roles.rows[0].id,username,hash]);
    const res=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password:fixturePassword}),signal:AbortSignal.timeout(20000)});
    assert.equal(res.status,200);const body=await res.json();assert.equal(body.user.rol,'LECTOR');tokens.set(personas[i],body.token);
  }
  for(let i=0;i<2;i++) {`);
source=source.replace("await new Promise(resolve=>server.close(resolve));await pool.end();","await pool.end();");
source=source.replace("entorno:'Development local'","entorno:'Producción Railway',api:base,preflight:{identidad_base_verificada:true}");
source=source.replaceAll('objetivo4-local.json','objetivo4-produccion.json');
// Registrar el HTTP obtenido incluso si una aserción falla; nunca guardar cuerpos.
source=source.replace('const response = await fetch', 'const response = await fetch');
source=source.replace('const request = async', 'const observaciones=[];\nconst request = async');
source=source.replace('return { status: response.status, body: await response.json() };', "observaciones.push({metodo:method,ruta:route,http:response.status});\n  return { status: response.status, body: await response.json() };");
source=source.replace("obtenido:'La verificación no coincidió'", "obtenido:'La verificación no coincidió',http_observado:observaciones.at(-1)?.http");
source=source.replace('casos,limpieza};','casos,observaciones_http:observaciones,limpieza};');
source=source.replace("} catch(error) { fallo=error; }", "} catch(error) { fallo=new Error('Prueba remota no aprobada; consultar el reporte sanitizado'); }");
const temporal=new URL('./.objetivo4-deploy-temporal.mjs',import.meta.url);
await writeFile(temporal,source);
try { await import(temporal.href+'?t='+Date.now()); }
catch(error) {
  if(error.code==='28P01') {
    const {mkdir}=await import('node:fs/promises');
    await mkdir(new URL('./reportes/',import.meta.url),{recursive:true});
    await writeFile(new URL('./reportes/objetivo4-produccion-intento.json',import.meta.url),JSON.stringify({
      ejecucion_utc:new Date().toISOString(),entorno:'Producción Railway',
      api:'https://diplomado-production-40c1.up.railway.app',estado:'No ejecutado',
      preflight:{login_bibliotecario_http:200,perfil_http:200,identidad_base_verificada:false},
      motivo:'PostgreSQL rechazó la autenticación (28P01). No se prepararon fixtures ni se ejecutaron casos O4.',
      casos:[],registros_ficticios_creados:0
    },null,2)+'\n');
    throw Error('Pruebas O4 no ejecutadas: actualizar las credenciales remotas de PostgreSQL; reporte de intento guardado.');
  }
  throw error;
}
finally { await unlink(temporal); }
