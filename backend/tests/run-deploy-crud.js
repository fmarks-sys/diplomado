// Produccion: operar solo sobre fixtures propios, comprobar la identidad de la DB
// con ambos perfiles del despliegue y limpiar dentro de una transaccion.
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const require = createRequire(import.meta.url);
let newman;
try { newman = require('newman'); }
catch { newman = require(path.join(process.env.APPDATA, 'npm', 'node_modules', 'newman')); }
const api = 'https://diplomado-production-40c1.up.railway.app';
let credentials;
if (process.argv.includes('--credentials-stdin')) {
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    credentials = JSON.parse(input);
} else {
    credentials = {
        bibliotecario: { username: process.env.E3_PROD_BIBLIOTECARIO_USERNAME, password: process.env.E3_PROD_BIBLIOTECARIO_PASSWORD },
        lector: { username: process.env.E3_PROD_LECTOR_USERNAME, password: process.env.E3_PROD_LECTOR_PASSWORD }
    };
}
if (!credentials?.bibliotecario?.username || !credentials.bibliotecario.password
    || !credentials?.lector?.username || !credentials.lector.password) throw new Error('Faltan las dos cuentas de revision');

// No cargar ni cambiar el .env activo: el desarrollo debe continuar siendo local.
const envText = await readFile(new URL('../.env', import.meta.url), 'utf8');
const production = dotenv.parse(envText.split(/\r?\n/).filter((line) => /^\s*#/.test(line)).map((line) => line.replace(/^\s*#\s?/, '')).join('\n'));
if (!['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].every((key) => production[key])
    || ['localhost', '127.0.0.1', '::1'].includes(production.DB_HOST)) throw new Error('Falta configuracion remota para la limpieza');
const pool = new pg.Pool({ host: production.DB_HOST, port: Number(production.DB_PORT), user: production.DB_USER,
    // Misma configuracion SSL de backend/config/db.js para esta base de produccion.
    password: production.DB_PASSWORD, database: production.DB_NAME, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
const marca = randomBytes(6).toString('hex');
const password = `E3-${randomBytes(24).toString('hex')}`;
const variables = { url_backend: api, test_password: password, password_nuevo: `E3-${randomBytes(24).toString('hex')}`,
    bibliotecario_username: credentials.bibliotecario.username, area_nombre: `E3_${marca.toUpperCase()}`,
    area_nombre_editado: `E3_${marca.toUpperCase()}_EDITADA`, libro_codigo: `E3-${marca}-L`, tesis_codigo: `E3-${marca}-T`, borrable_codigo: `E3-${marca}-B`,
    usuario_username: `e3_${marca}_usuario`, persona_username: `e3_${marca}_persona`,
    usuario_ci_alternativo: `E3${marca}x`, usuario_correo_alternativo: `e3_${marca}_x@example.org` };
const identidades = [];
for (const prefijo of ['usuario', 'nuevo_lector']) {
    variables[`${prefijo}_ci`] = `E3${marca}${prefijo === 'usuario' ? 'u' : 'n'}`;
    variables[`${prefijo}_correo`] = `e3_${marca}_${prefijo}@example.org`;
    identidades.push({ ci: variables[`${prefijo}_ci`], correo: variables[`${prefijo}_correo`] });
}
identidades.push({ ci: variables.usuario_ci_alternativo, correo: variables.usuario_correo_alternativo });
let reporte;
let dbVerificada = false;
let fixturesPreparados = false;
let consultaVencidosPermitida = false;
const preflight = [];
const http = async (route, token, body) => {
    const res = await fetch(api + route, { method: body === undefined ? 'GET' : 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(20000) });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) throw new Error(`Preflight HTTP ${res.status}`);
    return res.json();
};
const limpiar = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const cis = identidades.map((p) => p.ci);
        const correos = identidades.map((p) => p.correo);
        const codigos = [variables.libro_codigo, variables.tesis_codigo, variables.borrable_codigo];
        const nombres = [variables.area_nombre, variables.area_nombre_editado];
        const prestamos = await client.query(`DELETE FROM prestamos WHERE
            recurso_id IN (SELECT id FROM recursos WHERE codigo_topografico = ANY($1::varchar[]))
            AND lector_id IN (SELECT l.id FROM lectores l JOIN personas p ON p.id = l.persona_id
            WHERE p.ci = ANY($2::varchar[]) AND p.correo = ANY($3::varchar[])) RETURNING id`, [codigos, cis, correos]);
        const recursos = await client.query('DELETE FROM recursos WHERE codigo_topografico = ANY($1::varchar[]) RETURNING id', [codigos]);
        const personas = await client.query('DELETE FROM personas WHERE ci = ANY($1::varchar[]) AND correo = ANY($2::varchar[]) RETURNING id', [cis, correos]);
        const areas = await client.query('DELETE FROM areas_menciones WHERE nombre = ANY($1::varchar[]) RETURNING id', [nombres]);
        const pendientes = await client.query(`SELECT
            (SELECT COUNT(*) FROM personas WHERE ci = ANY($1::varchar[])) +
            (SELECT COUNT(*) FROM recursos WHERE codigo_topografico = ANY($2::varchar[])) +
            (SELECT COUNT(*) FROM areas_menciones WHERE nombre = ANY($3::varchar[])) AS total`, [cis, codigos, nombres]);
        if (Number(pendientes.rows[0].total) !== 0) throw new Error('Limpieza incompleta');
        await client.query('COMMIT');
        return { completada: true, personas_temporales_eliminadas: personas.rowCount, prestamos_temporales_eliminados: prestamos.rowCount,
            recursos_temporales_eliminados: recursos.rowCount, areas_temporales_eliminadas: areas.rowCount, registros_temporales_restantes: 0 };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
};

try {
    for (const rol of ['bibliotecario', 'lector']) {
        const login = await http('/api/auth/login', null, credentials[rol]);
        if (login.user?.rol !== rol.toUpperCase() || !login.token) throw new Error('Rol de revision incorrecto');
        const perfil = await http('/api/lectores/mi-perfil', login.token);
        const identidad = await pool.query(`SELECT lo.id AS login_id, p.id AS persona_id, lo.username, p.ci, p.correo, r.nombre AS rol
            FROM login lo JOIN personas p ON p.id = lo.persona_id JOIN roles r ON r.id = lo.rol_id WHERE lo.id = $1`, [perfil.login_id]);
        if (identidad.rowCount !== 1 || ['login_id', 'persona_id', 'username', 'ci', 'correo', 'rol'].some((campo) => String(identidad.rows[0][campo]) !== String(perfil[campo]))) {
            throw new Error('La base remota no coincide con el despliegue');
        }
        if (rol === 'bibliotecario') variables.token_bibliotecario = login.token;
        preflight.push({ rol: rol.toUpperCase(), login_http: 200, perfil_http: 200, identidad_base_coincidente: true });
    }
    dbVerificada = true;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const roles = await client.query("SELECT id,nombre FROM roles WHERE nombre IN ('BIBLIOTECARIO','LECTOR') AND estado='ACTIVO'");
        const ids = Object.fromEntries(roles.rows.map((r) => [r.nombre, r.id]));
        if (!ids.LECTOR || !ids.BIBLIOTECARIO) throw new Error('Faltan roles activos');
        variables.rol_lector = ids.LECTOR;
        const fecha = await client.query("SELECT CURRENT_DATE::text AS hoy, (CURRENT_DATE-1)::text AS ayer");
        variables.fecha_hoy = fecha.rows[0].hoy;
        variables.fecha_ayer = fecha.rows[0].ayer;
        const pendientes = await client.query("SELECT COUNT(*)::int AS total FROM prestamos WHERE estado='PRESTADO' AND fecha_devolucion_prevista<CURRENT_DATE");
        consultaVencidosPermitida = pendientes.rows[0].total === 0;
        const ausente = await client.query(`SELECT 2147483647 AS id WHERE NOT EXISTS (
            SELECT id FROM personas WHERE id=2147483647 UNION ALL SELECT id FROM login WHERE id=2147483647 UNION ALL
            SELECT id FROM lectores WHERE id=2147483647 UNION ALL SELECT id FROM recursos WHERE id=2147483647 UNION ALL
            SELECT id FROM areas_menciones WHERE id=2147483647 UNION ALL SELECT id FROM prestamos WHERE id=2147483647 UNION ALL SELECT id FROM roles WHERE id=2147483647)`);
        if (!ausente.rowCount) throw new Error('El ID de casos inexistentes esta ocupado');
        variables.id_inexistente = ausente.rows[0].id;
        const hash = await bcrypt.hash(password, 10);
        for (const [sufijo, clave, estado] of [['a', 'lector_id', 'ACTIVO'], ['o', 'lector_otro_id', 'ACTIVO'], ['s', 'lector_sancionado_id', 'SANCIONADO']]) {
            const ci = `E3${marca}${sufijo}`;
            const username = `e3_${marca}_${sufijo}`;
            const correo = `${username}@example.org`;
            identidades.push({ ci, correo });
            const persona = await client.query('INSERT INTO personas(ci,nombres,ap,am,correo) VALUES($1,$2,$3,$4,$5) RETURNING id', [ci, 'Prueba', 'E3', 'Temporal', correo]);
            await client.query("INSERT INTO login(persona_id,rol_id,username,password_hash,estado) VALUES($1,$2,$3,$4,'ACTIVO')", [persona.rows[0].id, ids.LECTOR, username, hash]);
            const lector = await client.query("INSERT INTO lectores(persona_id,tipo_lector,estado) VALUES($1,'EXTERNO',$2) RETURNING id", [persona.rows[0].id, estado]);
            variables[clave] = lector.rows[0].id;
            if (sufijo === 'a') variables.lector_username = username;
        }
        await client.query('COMMIT');
        fixturesPreparados = true;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
    const loginLector = await http('/api/auth/login', null, { username: variables.lector_username, password });
    if (loginLector.user?.rol !== 'LECTOR') throw new Error('El lector ficticio no puede autenticarse');
    variables.token_lector = loginLector.token;

    const source = JSON.parse(await readFile(new URL('./biblioteca.postman_collection.json', import.meta.url), 'utf8'));
    const folders = structuredClone(source.item.filter((folder) => ['Usuarios', 'Lectores', 'Areas', 'Recursos', 'Prestamos'].includes(folder.name)));
    const omitted = [];
    for (const folder of folders) {
        folder.item = folder.item.filter((item) => {
            const modificaVencidos = item.request.method === 'GET' && /\/api\/prestamos(?:\/mis-prestamos|\/mis-alertas)?$/.test(item.request.url)
                && item.event[0].script.exec.some((s) => s.includes('HTTP 200'));
            if (modificaVencidos && !consultaVencidosPermitida) { omitted.push({ id: item.name.split(' ')[0], escenario: item.name, estado: 'Omitido', motivo: 'Consulta actualizaria prestamos ajenos a los datos ficticios' }); return false; }
            return true;
        });
    }
    const collection = { info: { ...source.info, name: 'E3 - Deploy CRUD con datos ficticios', description: 'Requiere pnpm test:deploy:crud: verifica la base del despliegue, prepara cuentas temporales y limpia exclusivamente sus datos. Credenciales y tokens mediante variables.' },
        variable: [{ key: 'url_backend', value: api }], item: folders };
    await writeFile(new URL('./deploy-crud.postman_collection.json', import.meta.url), JSON.stringify(collection, null, 2) + '\n');
    const executions = [];
    let assertions = 0;
    let assertionFailures = 0;
    let newmanFailures = 0;
    const execute = async (items) => {
        const summary = await new Promise((resolve, reject) => {
            newman.run({ collection: { ...collection, item: items }, reporters: [], timeoutRequest: 20000,
                environment: { name: 'Fixtures de produccion en memoria', values: Object.entries(variables).map(([key, value]) => ({ key, value, enabled: true })) }
            }, (error, result) => error ? reject(error) : resolve(result));
        });
        for (const variable of summary.environment.values.all()) variables[variable.key] = variable.value;
        executions.push(...summary.run.executions);
        assertions += summary.run.stats.assertions.total;
        assertionFailures += summary.run.stats.assertions.failed;
        newmanFailures += summary.run.failures.length;
    };
    for (const folder of folders) {
        if (folder.name !== 'Prestamos') await execute([folder]);
        else {
            for (const item of folder.item) {
                const actualizaVencidos = item.request.method === 'GET' && /\/api\/prestamos(?:\/mis-prestamos|\/mis-alertas)?$/.test(item.request.url)
                    && item.event[0].script.exec.some((script) => script.includes('HTTP 200'));
                if (actualizaVencidos) {
                    const pendientes = await pool.query("SELECT COUNT(*)::int AS total FROM prestamos WHERE estado='PRESTADO' AND fecha_devolucion_prevista<CURRENT_DATE");
                    if (pendientes.rows[0].total !== 0) {
                        omitted.push({ id: item.name.split(' ')[0], escenario: item.name, estado: 'Omitido', motivo: 'Consulta actualizaria prestamos ajenos a los datos ficticios' });
                        continue;
                    }
                }
                await execute([{ name: folder.name, item: [item] }]);
            }
        }
        console.log('Modulo finalizado:', folder.name);
    }
    const casos = executions.map((e) => {
        const pruebas = (e.assertions || []).map((p) => ({ nombre: p.assertion, estado: p.error ? 'Fallido' : p.skipped ? 'Omitido' : 'Aprobado' }));
        return { id: e.item.name.split(' ')[0], escenario: e.item.name, modulo: e.item.parent().name, metodo: e.request.method, ruta: `/${e.request.url.path.join('/')}`,
            esperado: Number(pruebas.find((p) => /^HTTP \d+$/.test(p.nombre))?.nombre.split(' ')[1]) || null, obtenido: e.response?.code ?? null,
            tiempo_ms: e.response?.responseTime ?? null, estado: !e.response || e.requestError || !pruebas.length || pruebas.some((p) => p.estado !== 'Aprobado') ? 'Fallido' : 'Aprobado', pruebas };
    });
    reporte = { coleccion: collection.info.name, ejecucion_utc: new Date().toISOString(), api, entorno: 'Produccion', herramienta: 'Newman',
        preflight, alcance: 'Usuarios, Lectores, Areas, Recursos y Prestamos con fixtures propios; altas, ediciones, permisos, conflictos, bajas y devoluciones.',
        resumen: { solicitudes: casos.length, casos_aprobados: casos.filter((c) => c.estado === 'Aprobado').length, casos_fallidos: casos.filter((c) => c.estado !== 'Aprobado').length,
            comprobaciones: assertions, comprobaciones_fallidas: assertionFailures, fallos_newman: newmanFailures }, casos, omitidos: omitted };
    if (reporte.resumen.casos_fallidos || reporte.resumen.fallos_newman) process.exitCode = 1;
} catch (error) {
    process.exitCode = 1;
    console.error('No se pudo completar la ejecucion CRUD de produccion. Diagnostico:', error.code || error.name);
    if (!error.code) console.error(error.message.replace(/Preflight HTTP (\d+)/, 'Preflight HTTP $1'));
} finally {
    if (dbVerificada && fixturesPreparados) {
        try {
            const limpieza = await limpiar();
            if (reporte) reporte.limpieza = limpieza;
            console.log('Limpieza:', JSON.stringify(limpieza));
        } catch (error) {
            process.exitCode = 1;
            if (reporte) reporte.limpieza = { completada: false };
            console.error('Limpieza incompleta. Diagnostico:', error.code || error.name);
        }
    }
    await pool.end();
    if (reporte) {
        const contenido = JSON.stringify(reporte, null, 2) + '\n';
        const secretos = [password, variables.password_nuevo, production.DB_PASSWORD, credentials.bibliotecario.password, credentials.lector.password];
        if (secretos.filter(Boolean).some((s) => contenido.includes(s)) || /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(contenido)) {
            process.exitCode = 1; console.error('No se guardara un reporte con secretos');
        } else {
            await mkdir(new URL('./reportes/', import.meta.url), { recursive: true });
            await writeFile(new URL('./reportes/deploy-crud-produccion.json', import.meta.url), contenido);
            for (const caso of reporte.casos) console.log(`${caso.id}: ${caso.obtenido} / esperado ${caso.esperado} - ${caso.estado}`);
            console.log(JSON.stringify(reporte.resumen));
            console.log(`Omitidos: ${reporte.omitidos.length}. Reporte: tests/reportes/deploy-crud-produccion.json`);
        }
    }
}

