import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dotenv.config({ path: new URL('../.env', import.meta.url), quiet: true });
const require = createRequire(import.meta.url);
let newman;
let newmanVersion;
try {
    newman = require('newman');
    newmanVersion = require('newman/package.json').version;
} catch {
    // Admitir la instalación global existente en Windows.
    if (!process.env.APPDATA) throw new Error('Instala Newman: npm install -g newman');
    newman = require(path.join(process.env.APPDATA, 'npm', 'node_modules', 'newman'));
    newmanVersion = require(path.join(process.env.APPDATA, 'npm', 'node_modules', 'newman', 'package.json')).version;
}

const url = process.env.URL_BACKEND_PRUEBAS || 'http://localhost:3000';
const destino = new URL(url);
if (destino.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(destino.hostname)
    || !['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST)
    || process.env.NODE_ENV !== 'development') {
    throw new Error('Estas pruebas requieren API y PostgreSQL locales con NODE_ENV=development');
}
if (!process.env.JWT_SECRET) throw new Error('Falta JWT_SECRET para probar el token vencido');
const salud = await fetch(`${url}/api/v1/salud`);
if (salud.status !== 200) throw new Error('La API local no está disponible');

const pool = new pg.Pool({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    connectionTimeoutMillis: 10000
});
const marca = randomBytes(6).toString('hex');
const completa = process.argv.includes('--completa');
const password = `E3-${randomBytes(24).toString('hex')}`;
const variables = {
    url_backend: url, test_password: password,
    password_incorrecto: `incorrecta-${randomBytes(12).toString('hex')}`,
    username_inexistente: `e3_${marca}_no_existe`, token_invalido: 'token-invalido-de-prueba',
    registro_username: `e3_${marca}_registro`, registro_ci: `E3${marca}r`,
    registro_correo: `e3_${marca}_registro@example.org`
};
const identidades = [{ ci: variables.registro_ci, correo: variables.registro_correo }];
if (completa) {
    for (const prefijo of ['usuario', 'nuevo_lector']) {
        variables[`${prefijo}_ci`] = `E3${marca}${prefijo === 'usuario' ? 'u' : 'n'}`;
        variables[`${prefijo}_correo`] = `e3_${marca}_${prefijo}@example.org`;
        identidades.push({ ci: variables[`${prefijo}_ci`], correo: variables[`${prefijo}_correo`] });
    }
    Object.assign(variables, {
        usuario_username: `e3_${marca}_usuario`, persona_username: `e3_${marca}_persona`,
        usuario_ci_alternativo: `E3${marca}x`, usuario_correo_alternativo: `e3_${marca}_x@example.org`,
        password_nuevo: `E3-${randomBytes(24).toString('hex')}`,
        area_nombre: `E3_${marca.toUpperCase()}`, area_nombre_editado: `E3_${marca.toUpperCase()}_EDITADA`,
        libro_codigo: `E3-${marca}-L`, tesis_codigo: `E3-${marca}-T`, borrable_codigo: `E3-${marca}-B`
    });
    // Cubrir tambien una creacion inesperada en casos negativos antes de limpiar.
    identidades.push({ ci: variables.usuario_ci_alternativo, correo: variables.usuario_correo_alternativo });
}
const nombreReporte = completa ? 'resultado_pruebas' : 'salud-auth';
const reporteUrl = new URL(`./reportes/${nombreReporte}.json`, import.meta.url);
let reporte;

const limpiarModulos = async (cis, correos) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const codigos = [variables.libro_codigo, variables.tesis_codigo, variables.borrable_codigo];
        await client.query(`DELETE FROM sanciones WHERE lector_id IN (
            SELECT l.id FROM lectores l JOIN personas p ON p.id=l.persona_id
            WHERE p.ci=ANY($1::varchar[]) AND p.correo=ANY($2::varchar[]))`, [cis, correos]);
        const prestamos = await client.query(`DELETE FROM prestamos WHERE
            recurso_id IN (SELECT id FROM recursos WHERE codigo_topografico = ANY($1::varchar[]))
            AND lector_id IN (SELECT l.id FROM lectores l JOIN personas p ON p.id = l.persona_id
            WHERE p.ci = ANY($2::varchar[]) AND p.correo = ANY($3::varchar[])) RETURNING id`, [codigos, cis, correos]);
        const recursos = await client.query('DELETE FROM recursos WHERE codigo_topografico = ANY($1::varchar[]) RETURNING id', [codigos]);
        const areas = await client.query('DELETE FROM areas_menciones WHERE nombre = ANY($1::varchar[]) RETURNING id', [[variables.area_nombre, variables.area_nombre_editado]]);
        const restantes = await client.query(`SELECT
            (SELECT COUNT(*) FROM recursos WHERE codigo_topografico = ANY($1::varchar[])) +
            (SELECT COUNT(*) FROM areas_menciones WHERE nombre = ANY($2::varchar[])) AS total`, [codigos, [variables.area_nombre, variables.area_nombre_editado]]);
        if (Number(restantes.rows[0].total) !== 0) throw new Error('Quedaron recursos o areas temporales');
        await client.query('COMMIT');
        return { prestamos_temporales_eliminados: prestamos.rowCount, recursos_temporales_eliminados: recursos.rowCount, areas_temporales_eliminadas: areas.rowCount };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally { client.release(); }
};

try {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const roles = await client.query("SELECT id, nombre FROM roles WHERE nombre IN ('BIBLIOTECARIO', 'LECTOR') AND estado = 'ACTIVO'");
        const idsRol = Object.fromEntries(roles.rows.map((rol) => [rol.nombre, rol.id]));
        if (!idsRol.BIBLIOTECARIO || !idsRol.LECTOR) throw new Error('Faltan los dos roles activos en la base local');
        variables.rol_lector = idsRol.LECTOR;
        variables.rol_bibliotecario = idsRol.BIBLIOTECARIO;
        if (completa) {
            const fechas = await client.query("SELECT CURRENT_DATE::text AS hoy, (CURRENT_DATE - 1)::text AS ayer");
            variables.fecha_hoy = fechas.rows[0].hoy;
            variables.fecha_ayer = fechas.rows[0].ayer;
            const ausente = await client.query(`SELECT 2147483647 AS id WHERE NOT EXISTS (
                SELECT id FROM personas WHERE id = 2147483647 UNION ALL
                SELECT id FROM login WHERE id = 2147483647 UNION ALL
                SELECT id FROM lectores WHERE id = 2147483647 UNION ALL
                SELECT id FROM recursos WHERE id = 2147483647 UNION ALL
                SELECT id FROM areas_menciones WHERE id = 2147483647 UNION ALL
                SELECT id FROM prestamos WHERE id = 2147483647 UNION ALL
                SELECT id FROM roles WHERE id = 2147483647)`);
            if (!ausente.rowCount) throw new Error('El ID reservado para casos inexistentes esta ocupado');
            variables.id_inexistente = ausente.rows[0].id;
        }
        const hash = await bcrypt.hash(password, 10);
        for (const rol of ['BIBLIOTECARIO', 'LECTOR']) {
            for (const estado of ['ACTIVO', 'INACTIVO', 'BLOQUEADO']) {
                const sufijo = `${rol === 'LECTOR' ? 'l' : 'b'}${estado[0].toLowerCase()}`;
                const username = `e3_${marca}_${sufijo}`;
                const ci = `E3${marca}${sufijo}`;
                const correo = `${username}@example.org`;
                identidades.push({ ci, correo });
                const persona = await client.query(
                    'INSERT INTO personas (ci, nombres, ap, am, correo) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                    [ci, 'Prueba', 'E3', 'Temporal', correo]
                );
                const login = await client.query(
                    'INSERT INTO login (persona_id, rol_id, username, password_hash, estado) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                    [persona.rows[0].id, idsRol[rol], username, hash, estado]
                );
                if (rol === 'LECTOR') {
                    const lector = await client.query("INSERT INTO lectores (persona_id, tipo_lector) VALUES ($1, 'EXTERNO') RETURNING id", [persona.rows[0].id]);
                    if (estado === 'ACTIVO') variables.lector_id = lector.rows[0].id;
                    if (estado === 'INACTIVO') variables.lector_otro_id = lector.rows[0].id;
                    if (completa && estado === 'BLOQUEADO') {
                        variables.lector_sancionado_id = lector.rows[0].id;
                        await client.query("UPDATE lectores SET estado = 'SANCIONADO' WHERE id = $1", [lector.rows[0].id]);
                    }
                }
                const clave = `${rol.toLowerCase()}_${estado === 'ACTIVO' ? 'username' : estado.toLowerCase()}`;
                variables[clave] = username;
                if (rol === 'BIBLIOTECARIO' && estado === 'ACTIVO') {
                    variables.token_expirado = jwt.sign({ loginId: login.rows[0].id, personaId: persona.rows[0].id, rol }, process.env.JWT_SECRET, { expiresIn: -60 });
                }
            }
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    const collection = JSON.parse(await readFile(new URL(completa ? './biblioteca.postman_collection.json' : './salud-auth.postman_collection.json', import.meta.url), 'utf8'));
    const summary = await new Promise((resolve, reject) => {
        newman.run({
            collection,
            environment: { name: 'Cuentas temporales locales', values: Object.entries(variables).map(([key, value]) => ({ key, value, enabled: true })) },
            reporters: [], timeoutRequest: 10000
        }, (error, result) => error ? reject(error) : resolve(result));
    });
    // Guardar solo resultados y métricas; jamás serializar el summary completo.
    const casos = summary.run.executions.map((execution) => {
        const pruebas = (execution.assertions || []).map((prueba) => ({
            nombre: prueba.assertion, estado: prueba.error ? 'Fallido' : prueba.skipped ? 'Omitido' : 'Aprobado'
        }));
        return {
            id: execution.item.name.split(' ')[0], escenario: execution.item.name,
            modulo: execution.item.parent().name,
            metodo: execution.request.method, ruta: `/${execution.request.url.path.join('/')}`,
            esperado: Number(pruebas.find((prueba) => /^HTTP \d+$/.test(prueba.nombre))?.nombre.split(' ')[1]) || null,
            obtenido: execution.response?.code ?? null, tiempo_ms: execution.response?.responseTime ?? null,
            estado: !execution.response || execution.requestError || pruebas.length === 0
                || pruebas.some((prueba) => prueba.estado !== 'Aprobado') ? 'Fallido' : 'Aprobado',
            pruebas
        };
    });
    reporte = {
        coleccion: collection.info.name, ejecucion_utc: new Date().toISOString(), api: url,
        herramienta: `Newman ${newmanVersion}`,
        resumen: {
            solicitudes: casos.length, casos_aprobados: casos.filter((caso) => caso.estado === 'Aprobado').length,
            casos_fallidos: casos.filter((caso) => caso.estado !== 'Aprobado').length,
            comprobaciones: summary.run.stats.assertions.total,
            comprobaciones_fallidas: summary.run.stats.assertions.failed,
            fallos_newman: summary.run.failures.length
        },
        casos
    };
    if (reporte.resumen.casos_fallidos || reporte.resumen.fallos_newman) process.exitCode = 1;
} catch (error) {
    process.exitCode = 1;
    console.error('No se pudo completar la ejecucion. Revisa el servidor y la configuracion local.');
    console.error('Diagnostico:', error.code || error.name);
    if (!error.code) console.error(error.stack?.split('\n').slice(1, 3).join('\n'));
} finally {
    try {
        const cis = identidades.map((persona) => persona.ci);
        const correos = identidades.map((persona) => persona.correo);
        let limpiezaModulos;
        if (completa) {
            limpiezaModulos = await limpiarModulos(cis, correos);
        }
        const eliminados = await pool.query(
            'DELETE FROM personas WHERE ci = ANY($1::varchar[]) AND correo = ANY($2::varchar[]) RETURNING id', [cis, correos]
        );
        const restantes = await pool.query('SELECT COUNT(*)::int AS total FROM personas WHERE ci = ANY($1::varchar[])', [cis]);
        const completada = restantes.rows[0].total === 0;
        if (!completada) {
            process.exitCode = 1;
            console.error('Quedaron datos temporales sin limpiar.');
        }
        if (reporte) reporte.limpieza = { completada, personas_temporales_eliminadas: eliminados.rowCount, ...limpiezaModulos };
    } catch (error) {
        if (reporte) reporte.limpieza = { completada: false };
        process.exitCode = 1;
        console.error('No se pudo completar la limpieza de las cuentas temporales.');
        console.error('Diagnostico de limpieza:', error.code || error.name);
    } finally {
        await pool.end();
        if (reporte) {
            const contenido = JSON.stringify(reporte, null, 2);
            if ([password, variables.password_nuevo, variables.token_expirado].filter(Boolean).some((secreto) => contenido.includes(secreto))) {
                process.exitCode = 1;
                console.error('El reporte contiene información de sesión y no se guardará.');
            } else {
                await mkdir(new URL('./reportes/', import.meta.url), { recursive: true });
                await writeFile(reporteUrl, contenido + '\n');
                if (completa) {
                    for (const modulo of ['Usuarios', 'Lectores', 'Areas', 'Recursos', 'Prestamos']) {
                        const casos = reporte.casos.filter((caso) => caso.modulo === modulo);
                        await writeFile(new URL(`./reportes/${modulo.toLowerCase()}.json`, import.meta.url), JSON.stringify({
                            modulo, ejecucion_utc: reporte.ejecucion_utc, api: url, herramienta: reporte.herramienta,
                            resumen: { solicitudes: casos.length, casos_aprobados: casos.filter((caso) => caso.estado === 'Aprobado').length, casos_fallidos: casos.filter((caso) => caso.estado !== 'Aprobado').length },
                            casos, limpieza: reporte.limpieza
                        }, null, 2) + '\n');
                    }
                }
                for (const caso of reporte.casos) console.log(`${caso.id}: ${caso.obtenido} / esperado ${caso.esperado} - ${caso.estado}`);
                console.log(JSON.stringify(reporte.resumen));
                console.log(`Reporte: tests/reportes/${nombreReporte}.json`);
            }
        }
    }
}
