import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const fuentes = {};
for (const nombre of ['areas', 'recursos']) {
    fuentes[nombre] = {};
    for (const capa of ['service', 'controller']) {
        fuentes[nombre][capa] = await readFile(new URL(`../modules/${nombre}/${nombre}.${capa}.js`, import.meta.url), 'utf8');
    }
}
const libro = { codigo_topografico: 'L-1', titulo: 'Libro de prueba', tipo_recurso: 'LIBRO', autor: 'Autor de prueba', anio_publicacion: 2026, cantidad_total: 3 };
const tesis = { ...libro, tipo_recurso: 'TESIS', autor_postulante: 'Postulante', tutor_guia: 'Tutor', gestion_defensa: '2026', tribunal_jurado: ['Jurado'], soporte_fisico: 'EMPASTADO' };

// No importar config/db.js ni conectar a la base real.
const preparar = async (nombre, { error, inexistente = false } = {}) => {
    const context = createContext({ console: { error() {} } });
    const modulo = (exports) => new SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
    const llamadas = [];
    const nombres = nombre === 'areas'
        ? ['getAllAreas', 'getAllAreasActivas', 'createArea', 'updateArea', 'toggleAreaEstado']
        : ['getAllRecursos', 'getRecursoById', 'createRecurso', 'updateRecurso', 'updateEstadoRecurso', 'deleteRecurso'];
    const repository = modulo(Object.fromEntries(nombres.map((metodo) => [metodo, async (...args) => {
        llamadas.push({ metodo, args });
        if (error) throw error;
        if (metodo.startsWith('getAll')) return [];
        return inexistente ? null : { id: 1, estado: 'ACTIVO' };
    }])));
    const service = new SourceTextModule(fuentes[nombre].service, { context });
    await service.link(() => repository);
    await service.evaluate();
    const controller = new SourceTextModule(fuentes[nombre].controller, { context });
    await controller.link(() => service);
    await controller.evaluate();
    return { llamadas, async solicitar(accion, body = nombre === 'areas' ? { nombre: 'Área de prueba' } : libro, id = '1') {
        const response = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
        await controller.namespace[accion]({ body, params: { id } }, response);
        return response;
    } };
};

test('Áreas: validaciones 400, inexistentes 404, duplicados 409 y errores internos 500', async () => {
    for (const nombre of [undefined, null, '', ' ', 123, {}]) {
        for (const accion of ['crearArea', 'updateArea']) {
            const caso = await preparar('areas');
            assert.equal((await caso.solicitar(accion, { nombre })).code, 400);
            assert.equal(caso.llamadas.length, 0);
        }
    }
    for (const accion of ['updateArea', 'cambiarEstadoArea']) {
        assert.equal((await (await preparar('areas', { inexistente: true })).solicitar(accion)).code, 404);
        for (const id of ['abc', '0', '-1', '1.5', '2147483648', [], null]) {
            assert.equal((await (await preparar('areas')).solicitar(accion, { nombre: 'Área' }, id)).code, 400);
        }
    }
    for (const accion of ['getAreas', 'getAreasActivas', 'crearArea', 'updateArea', 'cambiarEstadoArea']) {
        const res = await (await preparar('areas', { error: new Error('Detalle privado') })).solicitar(accion);
        assert.equal(res.code, 500);
        assert.equal(res.data.error, 'Error interno del servidor');
    }
    for (const accion of ['crearArea', 'updateArea']) {
        assert.equal((await (await preparar('areas', { error: Object.assign(new Error('Duplicado'), { code: '23505' }) })).solicitar(accion)).code, 409);
    }
});

test('Áreas: éxitos 200/201 y normalización del nombre', async () => {
    for (const [accion, expected] of [['getAreas', 200], ['getAreasActivas', 200], ['crearArea', 201], ['updateArea', 200], ['cambiarEstadoArea', 200]]) {
        const caso = await preparar('areas');
        assert.equal((await caso.solicitar(accion, { nombre: '  Nueva   área ' })).code, expected);
        if (accion === 'crearArea' || accion === 'updateArea') assert.equal(caso.llamadas[0].args.at(-1), 'NUEVA ÁREA');
    }
});

test('Recursos: datos y tipos inválidos devuelven 400 antes de acceder a BD', async () => {
    for (const body of [null, {}, [], { ...libro, titulo: {} }, { ...libro, autor: 10 }, { ...libro, tipo_recurso: 'OTRO' },
        { ...libro, anio_publicacion: true }, { ...libro, cantidad_total: -1 }, { ...libro, area_id: [] },
        { ...libro, palabras_clave: [{}] }, { ...libro, isbn: {} }, { ...tesis, autor_postulante: [] },
        { ...tesis, tribunal_jurado: [123] }, { ...tesis, soporte_fisico: 'OTRO' }]) {
        for (const accion of ['createRecurso', 'updateRecurso']) {
            const caso = await preparar('recursos');
            assert.equal((await caso.solicitar(accion, body)).code, 400);
            assert.equal(caso.llamadas.length, 0);
        }
    }
    assert.equal((await (await preparar('recursos')).solicitar('cambiarEstado', undefined)).code, 400);
    assert.equal((await (await preparar('recursos')).solicitar('cambiarEstado', { estado: 'OTRO' })).code, 400);
});

test('Recursos: IDs inválidos 400 e inexistentes 404', async () => {
    for (const accion of ['getRecursoById', 'updateRecurso', 'cambiarEstado', 'deleteRecurso']) {
        for (const id of ['abc', '0', '-1', '1.5', '2147483648', [], null]) {
            assert.equal((await (await preparar('recursos')).solicitar(accion, { ...libro, estado: 'BAJA' }, id)).code, 400);
        }
        assert.equal((await (await preparar('recursos', { inexistente: true })).solicitar(accion, { ...libro, estado: 'BAJA' })).code, 404);
    }
});

test('Recursos: errores SQL y conflictos reciben códigos consistentes', async () => {
    for (const [code, expected] of [['23505', 409], ['23503', 400], ['23502', 400], ['23514', 400], ['22001', 400], ['22P02', 400], ['08006', 500]]) {
        const res = await (await preparar('recursos', { error: Object.assign(new Error('Detalle SQL privado'), { code }) })).solicitar('createRecurso');
        assert.equal(res.code, expected);
        assert.notEqual(res.data.error, 'Detalle SQL privado');
    }
    assert.equal((await (await preparar('recursos', { error: Object.assign(new Error('FK'), { code: '23503' }) })).solicitar('deleteRecurso')).code, 409);
    for (const accion of ['getRecursos', 'getRecursoById', 'createRecurso', 'updateRecurso', 'cambiarEstado', 'deleteRecurso']) {
        const res = await (await preparar('recursos', { error: new Error('Detalle privado') })).solicitar(accion, { ...libro, estado: 'BAJA' });
        assert.equal(res.code, 500);
        assert.equal(res.data.error, 'Error interno del servidor');
    }
});

test('Recursos: éxitos 200/201; tesis con una unidad y edición sin sobrescribir disponibilidad', async () => {
    for (const [accion, expected] of [['getRecursos', 200], ['getRecursoById', 200], ['createRecurso', 201], ['updateRecurso', 200], ['cambiarEstado', 200], ['deleteRecurso', 200]]) {
        assert.equal((await (await preparar('recursos')).solicitar(accion, { ...libro, estado: 'BAJA' })).code, expected);
    }
    const caso = await preparar('recursos');
    assert.equal((await caso.solicitar('updateRecurso', { ...tesis, cantidad_total: 8, cantidad_disponible: 8 })).code, 200);
    const enviado = caso.llamadas[0].args[1];
    assert.equal(enviado.cantidad_total, 1);
    assert.equal('cantidad_disponible' in enviado, false);
});

test('Repositorio Recursos: reducir stock por debajo de ejemplares prestados devuelve 409 y rollback', async () => {
    const context = createContext({});
    const consultas = [];
    const client = {
        async query(sql) {
            consultas.push(sql);
            return { rowCount: 1, rows: [{ id: 1, tipo_recurso: 'LIBRO', cantidad_total: 5, cantidad_disponible: 1 }] };
        },
        release() { consultas.push('RELEASE'); }
    };
    const db = new SyntheticModule(['pool'], function () { this.setExport('pool', { connect: async () => client }); }, { context });
    const repo = new SourceTextModule(await readFile(new URL('../modules/recursos/recursos.repository.js', import.meta.url), 'utf8'), { context });
    await repo.link(() => db);
    await repo.evaluate();
    await assert.rejects(repo.namespace.updateRecurso(1, { ...libro, cantidad_total: 2 }), (error) => error.status === 409);
    assert.deepEqual(consultas.slice(-2), ['ROLLBACK', 'RELEASE']);
});
