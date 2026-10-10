import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const serviceSource = await readFile(new URL('../modules/prestamos/prestamos.service.js', import.meta.url), 'utf8');
const controllerSource = await readFile(new URL('../modules/prestamos/prestamos.controller.js', import.meta.url), 'utf8');
const repositorySource = await readFile(new URL('../modules/prestamos/prestamos.repository.js', import.meta.url), 'utf8');
const datos = { lector_id: 1, recurso_id: 2, fecha_devolucion_prevista: '2999-12-31', tipo_prestamo: 'DOMICILIO' };
const modulo = (context, exports) => new SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
}, { context });

// Evitar cargar config/db.js y credenciales; no se usan datos reales.
const preparar = async (opciones = {}) => {
    const context = createContext({ console: { error() {} } });
    const llamadas = [];
    const ejecutar = (nombre) => async (...args) => {
        llamadas.push({ nombre, args });
        if (opciones.error) throw opciones.error;
        if (nombre === 'getLectorById') return opciones.sinLector ? null : { estado: opciones.estadoLector || 'ACTIVO' };
        if (nombre === 'getRecursoById') return opciones.sinRecurso ? null : { estado: opciones.estadoRecurso || 'DISPONIBLE', tipo_recurso: opciones.tipoRecurso || 'LIBRO', cantidad_disponible: opciones.stock ?? 1 };
        if (nombre.startsWith('execute')) return { id: 1 };
        return [];
    };
    const repo = modulo(context, Object.fromEntries(['updateVencidos', 'getAllPrestamos', 'getLectorById', 'getRecursoById',
        'executeCreatePrestamoTx', 'executeDevolucionTx', 'getPrestamosByPersona', 'getAlertasByPersona'].map((nombre) => [nombre, ejecutar(nombre)])));
    const service = new SourceTextModule(serviceSource, { context });
    await service.link(() => repo);
    await service.evaluate();
    const controller = new SourceTextModule(controllerSource, { context });
    await controller.link(() => service);
    await controller.evaluate();
    return { llamadas, async solicitar(accion, body = datos, id = '1') {
        const response = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
        await controller.namespace[accion]({ body, params: { id }, user: { personaId: id } }, response);
        return response;
    } };
};

test('Préstamos: datos, IDs, tipos y fechas inválidos devuelven 400 antes de consultar BD', async () => {
    for (const body of [null, {}, [], { ...datos, lector_id: true }, { ...datos, recurso_id: [] },
        { ...datos, tipo_prestamo: {} }, { ...datos, tipo_prestamo: 'OTRO' }, { ...datos, fecha_devolucion_prevista: ['2999-12-31'] },
        { ...datos, fecha_devolucion_prevista: '2999-02-31' }, { ...datos, fecha_devolucion_prevista: '2000-01-01' }]) {
        const caso = await preparar();
        assert.equal((await caso.solicitar('crearPrestamo', body)).code, 400);
        assert.equal(caso.llamadas.length, 0);
    }
    for (const id of ['abc', '0', '-1', '1.5', '2147483648', {}, null]) {
        assert.equal((await (await preparar()).solicitar('devolver', datos, id)).code, 400);
    }
});

test('Préstamos: lector/recurso inexistente 404; estados o stock incompatibles 409', async () => {
    for (const [opciones, expected] of [[{ sinLector: true }, 404], [{ sinRecurso: true }, 404],
        [{ estadoLector: 'SANCIONADO' }, 409], [{ estadoLector: 'INACTIVO' }, 409],
        [{ estadoRecurso: 'BAJA' }, 409], [{ estadoRecurso: 'MANTENIMIENTO' }, 409], [{ stock: 0 }, 409]]) {
        const caso = await preparar(opciones);
        assert.equal((await caso.solicitar('crearPrestamo')).code, expected);
        assert.equal(caso.llamadas.some(({ nombre }) => nombre === 'executeCreatePrestamoTx'), false);
    }
    assert.equal((await (await preparar({ tipoRecurso: 'TESIS' })).solicitar('crearPrestamo')).code, 400);
    assert.equal((await (await preparar({ tipoRecurso: 'TESIS' })).solicitar('crearPrestamo', { ...datos, tipo_prestamo: 'SALA' })).code, 201);
});

test('Préstamos: tokens sin persona válida devuelven 401 en consultas propias', async () => {
    for (const accion of ['getMisPrestamos', 'getMisAlertas']) {
        for (const id of [null, {}, 'abc', '0', '-1']) {
            const caso = await preparar();
            assert.equal((await caso.solicitar(accion, datos, id)).code, 401);
            assert.equal(caso.llamadas.length, 0);
        }
    }
});

test('Préstamos: éxitos mantienen 200/201 y consultas propias usan personaId', async () => {
    for (const [accion, expected] of [['getPrestamos', 200], ['crearPrestamo', 201], ['devolver', 200], ['getMisPrestamos', 200], ['getMisAlertas', 200]]) {
        const caso = await preparar();
        assert.equal((await caso.solicitar(accion, datos, '7')).code, expected);
        if (accion.startsWith('getMis')) assert.equal(caso.llamadas.at(-1).args[0], 7);
    }
});

test('Préstamos: fallos inesperados son 500 sin detalles internos', async () => {
    for (const accion of ['getPrestamos', 'crearPrestamo', 'devolver', 'getMisPrestamos', 'getMisAlertas']) {
        const res = await (await preparar({ error: new Error('Detalle privado de conexión') })).solicitar(accion);
        assert.equal(res.code, 500);
        assert.equal(res.data.error, 'Error interno del servidor');
    }
    for (const [code, expected] of [['23505', 409], ['23503', 400], ['23514', 400], ['22007', 400], ['22008', 400]]) {
        const res = await (await preparar({ error: Object.assign(new Error('Detalle SQL privado'), { code }) })).solicitar('crearPrestamo');
        assert.equal(res.code, expected);
        assert.notEqual(res.data.error, 'Detalle SQL privado');
    }
});

test('Repositorio Préstamos: conflictos y registros inexistentes revierten la transacción', async () => {
    for (const [escenario, expected] of [['duplicado', 409], ['stock', 409], ['recurso-inexistente', 404], ['devuelto', 409], ['prestamo-inexistente', 404]]) {
        const context = createContext({});
        const consultas = [];
        const client = {
            async query(sql) {
                sql = sql.replace(/\s+/g, ' ').trim();
                consultas.push(sql);
                if (sql.startsWith('SELECT id FROM prestamos') && sql.includes('lector_id')) return { rows: escenario === 'duplicado' ? [{ id: 1 }] : [] };
                if (sql.startsWith('UPDATE recursos') || sql.startsWith('UPDATE prestamos')) return { rows: [] };
                if (sql.startsWith('SELECT id FROM recursos')) return { rows: escenario === 'recurso-inexistente' ? [] : [{ id: 2 }] };
                if (sql.startsWith('SELECT id FROM prestamos')) return { rows: escenario === 'prestamo-inexistente' ? [] : [{ id: 1 }] };
                return { rows: [] };
            },
            release() { consultas.push('RELEASE'); }
        };
        const db = modulo(context, { pool: { connect: async () => client } });
        const repo = new SourceTextModule(repositorySource, { context });
        await repo.link(() => db);
        await repo.evaluate();
        const run = escenario === 'devuelto' || escenario === 'prestamo-inexistente'
            ? repo.namespace.executeDevolucionTx(1)
            : repo.namespace.executeCreatePrestamoTx(1, 2, datos.fecha_devolucion_prevista, 'DOMICILIO');
        await assert.rejects(run, (error) => error.status === expected);
        assert.deepEqual(consultas.slice(-2), ['ROLLBACK', 'RELEASE']);
        assert.equal(consultas.some((sql) => sql.startsWith('INSERT INTO prestamos')), false);
    }
});
