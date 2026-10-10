// Pruebas del despliegue: sin altas, ediciones, bajas ni consultas que actualicen vencidos.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const require = createRequire(import.meta.url);
let newman;
try { newman = require('newman'); }
catch {
    if (!process.env.APPDATA) throw new Error('Instala Newman en el backend');
    newman = require(path.join(process.env.APPDATA, 'npm', 'node_modules', 'newman'));
}
const api = 'https://diplomado-production-40c1.up.railway.app';
let credentials = {};
if (process.argv.includes('--credentials-stdin')) {
    let input = '';
    for await (const chunk of process.stdin) input += chunk;
    credentials = JSON.parse(input);
}
const variables = {
    url_backend: api, username_inexistente: `e3_deploy_${randomBytes(12).toString('hex')}`,
    password_incorrecto: randomBytes(24).toString('hex'), token_invalido: 'token-invalido-de-prueba',
    bibliotecario_username: credentials.bibliotecario?.username || process.env.E3_PROD_BIBLIOTECARIO_USERNAME,
    bibliotecario_password: credentials.bibliotecario?.password || process.env.E3_PROD_BIBLIOTECARIO_PASSWORD,
    lector_username: credentials.lector?.username || process.env.E3_PROD_LECTOR_USERNAME,
    lector_password: credentials.lector?.password || process.env.E3_PROD_LECTOR_PASSWORD
};
const cases = [];
let index = 0;
const check = (name, method, route, status, { body, token, extra = [], needsRole } = {}) => {
    const header = [];
    if (token) header.push({ key: 'Authorization', value: `Bearer {{${token}}}` });
    if (body !== undefined) header.push({ key: 'Content-Type', value: 'application/json' });
    const exec = [
        `pm.test('HTTP ${status}', () => pm.response.to.have.status(${status}));`,
        "pm.test('Respuesta JSON', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('application/json'));",
        "pm.test('Sin hashes de password', () => pm.expect(pm.response.text()).not.to.include('password_hash'));"
    ];
    if (status >= 400) exec.push("pm.test('Error informado', () => pm.expect(pm.response.json().error).to.be.a('string').and.not.empty);");
    cases.push({ needsRole, expected: status, item: {
        name: `DEP-${String(++index).padStart(2, '0')} ${name}`,
        request: { method, header, url: `{{url_backend}}${route}`,
            ...(body === undefined ? {} : { body: { mode: 'raw', raw: typeof body === 'string' ? body : JSON.stringify(body), options: { raw: { language: 'json' } } } }) },
        event: [{ listen: 'test', script: { type: 'text/javascript', exec: [...exec, ...extra] } }], response: []
    } });
};
check('Salud publica', 'GET', '/api/v1/salud', 200, { extra: ["pm.test('Estado ok', () => pm.expect(pm.response.json().estado).to.eql('ok'));"] });
check('Ruta inexistente', 'GET', '/api/v1/no-existe-e3', 404);
check('JSON mal formado', 'POST', '/api/auth/login', 400, { body: '{invalido' });
check('Login sin datos', 'POST', '/api/auth/login', 400, { body: {} });
check('Login con formato invalido', 'POST', '/api/auth/login', 400, { body: { username: [], password: '{{password_incorrecto}}' } });
check('Credenciales inexistentes', 'POST', '/api/auth/login', 401, { body: { username: '{{username_inexistente}}', password: '{{password_incorrecto}}' } });
for (const route of ['/api/usuarios', '/api/lectores', '/api/areas', '/api/recursos', '/api/prestamos', '/api/lectores/mi-perfil', '/api/prestamos/mis-prestamos', '/api/prestamos/mis-alertas']) {
    check(`Sin token: ${route}`, 'GET', route, 401);
    check(`Token invalido: ${route}`, 'GET', route, 401, { token: 'token_invalido' });
}
for (const role of ['bibliotecario', 'lector']) {
    check(`Login valido ${role}`, 'POST', '/api/auth/login', 200, {
        needsRole: role, body: { username: `{{${role}_username}}`, password: `{{${role}_password}}` },
        extra: [
            "pm.test('JWT emitido', () => pm.expect(pm.response.json().token).to.match(/^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/));",
            `pm.test('Rol ${role.toUpperCase()}', () => pm.expect(pm.response.json().user.rol).to.eql('${role.toUpperCase()}'));`,
            `if (pm.response.code === 200) pm.environment.set('token_${role}', pm.response.json().token);`
        ]
    });
}
const array = "pm.test('Listado JSON', () => pm.expect(pm.response.json()).to.be.an('array'));";
for (const route of ['/api/usuarios', '/api/lectores', '/api/areas', '/api/areas/activas', '/api/recursos']) {
    check(`Consulta bibliotecario: ${route}`, 'GET', route, 200, { needsRole: 'bibliotecario', token: 'token_bibliotecario', extra: [array] });
}
for (const role of ['bibliotecario', 'lector']) {
    check(`Perfil propio ${role}`, 'GET', '/api/lectores/mi-perfil', 200, { needsRole: role, token: `token_${role}`, extra: [
        `pm.test('Identidad propia', () => { const data = pm.response.json(); pm.expect(data.username).to.eql(pm.environment.get('${role}_username')); pm.expect(data.rol).to.eql('${role.toUpperCase()}'); });`
    ] });
}
check('Lector consulta recursos', 'GET', '/api/recursos', 200, { needsRole: 'lector', token: 'token_lector', extra: [array] });
for (const route of ['/api/usuarios', '/api/lectores', '/api/areas', '/api/prestamos']) {
    check(`Lector sin permiso: ${route}`, 'GET', route, 403, { needsRole: 'lector', token: 'token_lector' });
}
for (const route of ['/api/prestamos/mis-prestamos', '/api/prestamos/mis-alertas']) {
    check(`Bibliotecario sin permiso: ${route}`, 'GET', route, 403, { needsRole: 'bibliotecario', token: 'token_bibliotecario' });
}
const collection = {
    info: { name: 'E3 - Deploy produccion: salud, auth, consultas y permisos', description: 'Sin crear, editar ni eliminar registros. El login registra ultimo acceso. Se omiten consultas de prestamos autorizadas porque actualizan vencidos.', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    variable: [{ key: 'url_backend', value: api }], item: cases.map((c) => c.item)
};
await writeFile(new URL('./deploy-seguro.postman_collection.json', import.meta.url), JSON.stringify(collection, null, 2) + '\n');
const active = cases.filter((c) => !c.needsRole || (variables[`${c.needsRole}_username`] && variables[`${c.needsRole}_password`]));
const summary = await new Promise((resolve, reject) => {
    newman.run({ collection: { ...collection, item: active.map((c) => c.item) }, reporters: [], timeoutRequest: 20000,
        environment: { name: 'Deploy - variables en memoria', values: Object.entries(variables).filter(([, value]) => value !== undefined).map(([key, value]) => ({ key, value, enabled: true })) }
    }, (error, result) => error ? reject(error) : resolve(result));
});
const resultados = summary.run.executions.map((e) => {
    const pruebas = (e.assertions || []).map((p) => ({ nombre: p.assertion, estado: p.error ? 'Fallido' : p.skipped ? 'Omitido' : 'Aprobado' }));
    return {
        id: e.item.name.split(' ')[0], escenario: e.item.name, metodo: e.request.method, ruta: `/${e.request.url.path.join('/')}`,
        esperado: active.find((c) => c.item.name === e.item.name).expected, obtenido: e.response?.code ?? null,
        error_red: e.requestError?.code ?? null,
        tiempo_ms: e.response?.responseTime ?? null,
        estado: !e.response || e.requestError || !pruebas.length || pruebas.some((p) => p.estado !== 'Aprobado') ? 'Fallido' : 'Aprobado', pruebas
    };
});
const report = {
    coleccion: collection.info.name, ejecucion_utc: new Date().toISOString(), api, entorno: 'Produccion', herramienta: 'Newman',
    alcance: 'Salud, entradas invalidas en login, autenticacion, consultas de usuarios/lectores/areas/recursos/perfil y permisos. Sin operaciones CRUD de escritura.',
    observaciones: ['El login valido registra el ultimo acceso de la cuenta.', 'No se ejecutaron consultas de prestamos autorizadas: actualizan estados a VENCIDO.', 'No se guardan credenciales, tokens, datos personales ni cuerpos de peticiones/respuestas.'],
    resumen: { solicitudes: resultados.length, casos_aprobados: resultados.filter((r) => r.estado === 'Aprobado').length,
        casos_fallidos: resultados.filter((r) => r.estado !== 'Aprobado').length,
        comprobaciones: summary.run.stats.assertions.total, comprobaciones_fallidas: summary.run.stats.assertions.failed, fallos_newman: summary.run.failures.length },
    casos: resultados,
    pendientes: cases.filter((c) => !active.includes(c)).map((c) => ({ id: c.item.name.split(' ')[0], escenario: c.item.name, estado: 'Pendiente', motivo: 'Faltan credenciales ficticias del rol' }))
};
const content = JSON.stringify(report, null, 2) + '\n';
if ([variables.bibliotecario_password, variables.lector_password].filter(Boolean).some((value) => content.includes(value))
    || /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(content)) throw new Error('No se guardara un reporte con secretos');
await mkdir(new URL('./reportes/', import.meta.url), { recursive: true });
await writeFile(new URL('./reportes/deploy-produccion.json', import.meta.url), content);
for (const caso of resultados) console.log(`${caso.id}: ${caso.obtenido} / esperado ${caso.esperado} - ${caso.estado}`);
console.log(JSON.stringify(report.resumen));
console.log(`Pendientes: ${report.pendientes.length}. Reporte: tests/reportes/deploy-produccion.json`);
if (report.resumen.casos_fallidos || report.resumen.fallos_newman || report.pendientes.length) process.exitCode = 1;
