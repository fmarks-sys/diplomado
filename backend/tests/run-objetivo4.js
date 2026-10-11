// Integración HTTP + PostgreSQL local. Sólo crea y elimina fixtures propios.
import dotenv from 'dotenv';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import jwt from 'jsonwebtoken';
dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });
if (process.env.NODE_ENV !== 'development' || !['localhost','127.0.0.1','::1'].includes(process.env.DB_HOST)) {
  throw Error('Estas pruebas requieren PostgreSQL local y NODE_ENV=development');
}
const { pool } = await import('../config/db.js');
const { default: app } = await import('../app.js');
const { getLectorById } = await import('../modules/prestamos/prestamos.repository.js');
const { getAllLectores } = await import('../modules/lectores/lectores.repository.js');
const { MOTIVO_ATRASO } = await import('../modules/prestamos/sanciones.js');
const tag = 'O4_' + randomBytes(6).toString('hex');
const personas = [], lectores = [], recursos = [], casos = [];
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening',resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const token = (rol, personaId) => jwt.sign({ loginId: 1, personaId, rol }, process.env.JWT_SECRET, { expiresIn: '10m' });
const admin = token('BIBLIOTECARIO',1);
const request = async (method, route, body, auth = admin) => {
  const response = await fetch(base + route, { method, headers: { Authorization: `Bearer ${auth}`, 'Content-Type':'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
  return { status: response.status, body: await response.json() };
};
const caso = async (id, escenario, ruta, esperado, ejecutar) => {
  try {
    const obtenido = await ejecutar();
    casos.push({id, escenario, ruta, esperado, obtenido, estado:'Aprobado'});
    console.log(`${id} Aprobado: ${escenario}`);
  } catch(error) {
    casos.push({id, escenario, ruta, esperado, obtenido:'La verificación no coincidió', estado:'Fallido'});
    throw error;
  }
};
let limpieza = { completada:false };
let fallo;
try {
  const fecha = (await pool.query("SELECT CURRENT_DATE::text AS hoy, (CURRENT_DATE-1)::text AS ayer")).rows[0];
  for(let i=0;i<3;i++) {
    const persona = (await pool.query('INSERT INTO personas(ci,nombres,ap,am,correo) VALUES($1,$2,$3,$4,$5) RETURNING id',
      [`${tag}_${i}`, 'Prueba objetivo 4','Ficticio','Temporal',`${tag}_${i}@example.org`])).rows[0].id;
    personas.push(persona);
    lectores.push((await pool.query("INSERT INTO lectores(persona_id,tipo_lector,estado) VALUES($1,'EXTERNO','ACTIVO') RETURNING id",[persona])).rows[0].id);
  }
  for(let i=0;i<2;i++) {
    recursos.push((await pool.query(`INSERT INTO recursos(codigo_topografico,titulo,anio_publicacion,tipo_recurso,cantidad_total,cantidad_disponible)
      VALUES($1,$2,2026,'LIBRO',5,5) RETURNING id`,[`${tag}_${i}`,'Libro ficticio objetivo 4'])).rows[0].id);
  }
  const datos = (lector = lectores[0], recurso = recursos[0]) => ({ lector_id:lector, recurso_id:recurso, fecha_devolucion_prevista:'2999-12-31', tipo_prestamo:'DOMICILIO' });
  const devolver = async id => request('PATCH',`/api/prestamos/devolver/${id}`);
  const refrescar = async () => request('GET','/api/prestamos/mis-prestamos',undefined,token('LECTOR',personas[0]));
  const atrasar = async id => pool.query("UPDATE prestamos SET fecha_devolucion_prevista=CURRENT_DATE-1 WHERE id=$1 AND lector_id=ANY($2::int[])",[id,lectores]);
  let primero;
  await caso('O4-01','Primer préstamo permitido','POST /api/prestamos','201',async()=>{
    const r=await request('POST','/api/prestamos',datos()); assert.equal(r.status,201); primero=r.body.prestamo.id;return '201 Created';
  });
  await caso('O4-02','Segundo recurso rechazado sin descontar stock','POST /api/prestamos','409 y stock sin cambios',async()=>{
    const antes=(await pool.query('SELECT cantidad_disponible FROM recursos WHERE id=$1',[recursos[1]])).rows[0];
    const r=await request('POST','/api/prestamos',datos(lectores[0],recursos[1]));assert.equal(r.status,409);
    assert.deepEqual((await pool.query('SELECT cantidad_disponible FROM recursos WHERE id=$1',[recursos[1]])).rows[0],antes);return '409 Conflict; stock conservado';
  });
  await caso('O4-03','Dos altas simultáneas para el mismo lector','POST /api/prestamos (concurrente)','Una 201 y otra 409',async()=>{
    const responses=await Promise.all(recursos.map(recurso=>request('POST','/api/prestamos',datos(lectores[1],recurso))));
    assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
    assert.equal((await pool.query("SELECT count(*)::int AS n FROM prestamos WHERE lector_id=$1 AND estado IN ('PRESTADO','VENCIDO')",[lectores[1]])).rows[0].n,1);
    return '201 + 409; un único préstamo pendiente';
  });
  await atrasar(primero);
  await caso('O4-04','Atraso registrado automáticamente','GET /api/prestamos/mis-prestamos','200, VENCIDO y sanción ACTIVA',async()=>{
    const r=await refrescar();assert.equal(r.status,200);assert.equal(r.body.find(p=>p.id===primero).estado,'VENCIDO');
    assert.equal((await pool.query('SELECT estado FROM sanciones WHERE prestamo_id=$1 AND motivo=$2',[primero,MOTIVO_ATRASO])).rows[0].estado,'ACTIVA');
    assert.equal((await getLectorById(lectores[0])).estado,'SANCIONADO');
    assert.equal((await getAllLectores()).find(l=>l.id===lectores[0]).estado,'SANCIONADO');return '200; VENCIDO; sanción ACTIVA; lector SANCIONADO';
  });
  await caso('O4-05','Revisión repetida no duplica sanciones','GET /api/prestamos/mis-prestamos','200 y una sanción',async()=>{
    await refrescar();await refrescar();assert.equal((await pool.query('SELECT count(*)::int AS n FROM sanciones WHERE prestamo_id=$1 AND motivo=$2',[primero,MOTIVO_ATRASO])).rows[0].n,1);return '200; una sanción';
  });
  await caso('O4-06','Préstamo vencido impide otro recurso','POST /api/prestamos','409',async()=>{
    const r=await request('POST','/api/prestamos',datos(lectores[0],recursos[1]));assert.equal(r.status,409);return '409 Conflict';
  });
  await caso('O4-14','Cambio manual no elude ni sustituye la sanción por atraso','PATCH /api/lectores/estado/:id','409 y estado manual conservado',async()=>{
    const r=await request('PATCH',`/api/lectores/estado/${lectores[0]}`);
    assert.equal(r.status,409);
    assert.equal((await pool.query('SELECT estado FROM lectores WHERE id=$1',[lectores[0]])).rows[0].estado,'ACTIVO');
    assert.equal((await getLectorById(lectores[0])).estado,'SANCIONADO');return '409; atraso vigente y estado manual conservado';
  });
  await caso('O4-07','Devolución levanta únicamente el atraso','PATCH /api/prestamos/devolver/:id','200, CUMPLIDA y lector ACTIVO',async()=>{
    assert.equal((await devolver(primero)).status,200);
    assert.equal((await pool.query('SELECT estado FROM sanciones WHERE prestamo_id=$1 AND motivo=$2',[primero,MOTIVO_ATRASO])).rows[0].estado,'CUMPLIDA');
    assert.equal((await getLectorById(lectores[0])).estado,'ACTIVO');return '200; sanción CUMPLIDA; lector ACTIVO';
  });
  await caso('O4-08','Lector habilitado puede volver a prestar','POST /api/prestamos','201',async()=>{
    const r=await request('POST','/api/prestamos',datos());assert.equal(r.status,201);primero=r.body.prestamo.id;return '201 Created';
  });
  await atrasar(primero);await refrescar();
  await caso('O4-09','Devolución conserva INACTIVO manual','PATCH /api/prestamos/devolver/:id','200 y lector INACTIVO',async()=>{
    await pool.query("UPDATE lectores SET estado='INACTIVO' WHERE id=$1",[lectores[0]]);
    assert.equal((await devolver(primero)).status,200);assert.equal((await getLectorById(lectores[0])).estado,'INACTIVO');return '200; INACTIVO conservado';
  });
  await pool.query("UPDATE lectores SET estado='ACTIVO' WHERE id=$1",[lectores[0]]);
  primero=(await request('POST','/api/prestamos',datos())).body.prestamo.id;await atrasar(primero);await refrescar();
  await caso('O4-10','Devolución conserva SANCIONADO manual','PATCH /api/prestamos/devolver/:id','200 y lector SANCIONADO',async()=>{
    await pool.query("UPDATE lectores SET estado='SANCIONADO' WHERE id=$1",[lectores[0]]);
    assert.equal((await devolver(primero)).status,200);assert.equal((await getLectorById(lectores[0])).estado,'SANCIONADO');return '200; SANCIONADO manual conservado';
  });
  await pool.query("UPDATE lectores SET estado='ACTIVO' WHERE id=$1",[lectores[0]]);
  primero=(await request('POST','/api/prestamos',datos())).body.prestamo.id;await atrasar(primero);await refrescar();
  await caso('O4-11','Devolución conserva otra sanción activa','PATCH /api/prestamos/devolver/:id','200 y otra sanción ACTIVA',async()=>{
    await pool.query("INSERT INTO sanciones(lector_id,motivo,fecha_fin) VALUES($1,'Restricción manual ficticia',CURRENT_DATE+7)",[lectores[0]]);
    assert.equal((await devolver(primero)).status,200);assert.equal((await getLectorById(lectores[0])).estado,'SANCIONADO');
    assert.equal((await pool.query("SELECT estado FROM sanciones WHERE lector_id=$1 AND motivo='Restricción manual ficticia'",[lectores[0]])).rows[0].estado,'ACTIVA');return '200; restricción manual ACTIVA conservada';
  });
  const historicos=[];
  for(const recurso of recursos){
    historicos.push((await pool.query("INSERT INTO prestamos(lector_id,recurso_id,fecha_devolucion_prevista,tipo_prestamo) VALUES($1,$2,CURRENT_DATE-1,'DOMICILIO') RETURNING id",[lectores[2],recurso])).rows[0].id);
    await pool.query('UPDATE recursos SET cantidad_disponible=cantidad_disponible-1 WHERE id=$1',[recurso]);
  }
  await caso('O4-12','Datos históricos con varios atrasos mantienen restricción','PATCH /api/prestamos/devolver/:id','200 y restricción mientras quede otro atraso',async()=>{
    assert.equal((await devolver(historicos[0])).status,200);assert.equal((await getLectorById(lectores[2])).estado,'SANCIONADO');
    assert.equal((await devolver(historicos[1])).status,200);assert.equal((await getLectorById(lectores[2])).estado,'ACTIVO');return '200; restricción hasta devolver ambos';
  });
  await caso('O4-13','Fecha de hoy no constituye atraso','GET /api/prestamos/mis-prestamos','200 y ninguna sanción por vencer hoy',async()=>{
    await pool.query("UPDATE sanciones SET estado='ANULADA' WHERE lector_id=$1 AND motivo='Restricción manual ficticia'",[lectores[0]]);
    const nuevo=await request('POST','/api/prestamos',{...datos(),fecha_devolucion_prevista:fecha.hoy});assert.equal(nuevo.status,201);
    await refrescar();assert.equal((await getLectorById(lectores[0])).estado,'ACTIVO');
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM sanciones WHERE prestamo_id=$1',[nuevo.body.prestamo.id])).rows[0].n,0);return '200; sin sanción por fecha de hoy';
  });
} catch(error) { fallo=error; }
finally {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM sanciones WHERE lector_id=ANY($1::int[])',[lectores]);
    await client.query('DELETE FROM prestamos WHERE lector_id=ANY($1::int[])',[lectores]);
    await client.query('DELETE FROM recursos WHERE id=ANY($1::int[]) AND codigo_topografico LIKE $2',[recursos,tag+'%']);
    await client.query('DELETE FROM personas WHERE id=ANY($1::int[]) AND ci LIKE $2',[personas,tag+'%']);
    const restantes=(await client.query(`SELECT
      (SELECT count(*) FROM personas WHERE ci LIKE $1) +
      (SELECT count(*) FROM recursos WHERE codigo_topografico LIKE $1) AS n`,[tag+'%'])).rows[0].n;
    assert.equal(Number(restantes),0);await client.query('COMMIT');limpieza={completada:true,registros_temporales_restantes:0};
  } catch(error) {await client.query('ROLLBACK');fallo ||= error;}
  finally {client.release();}
  await new Promise(resolve=>server.close(resolve));await pool.end();
  const reporte={ejecucion_utc:new Date().toISOString(),entorno:'Development local',herramienta:'Node.js, HTTP y PostgreSQL',
    alcance:'CA05.4 y CA05.5; fixtures ficticios, concurrencia y preservación de restricciones manuales',
    resumen:{casos:casos.length,aprobados:casos.filter(c=>c.estado==='Aprobado').length,fallidos:casos.filter(c=>c.estado==='Fallido').length},casos,limpieza};
  await mkdir(new URL('./reportes/',import.meta.url),{recursive:true});
  await writeFile(new URL('./reportes/objetivo4-local.json',import.meta.url),JSON.stringify(reporte,null,2)+'\n');
}
if(fallo) throw fallo;
