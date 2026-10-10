import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const serviceSource = await readFile(new URL('../modules/lectores/lectores.service.js', import.meta.url), 'utf8');
const controllerSource = await readFile(new URL('../modules/lectores/lectores.controller.js', import.meta.url), 'utf8');
const datos = { ci: '123', nombres: 'Prueba', ap: 'Apellido', am: 'Ejemplo', correo: 'prueba@example.org', tipo_lector: 'ESTUDIANTE' };

// Controller y service reales; repositorio aislado sin importar BD ni .env.
const preparar = async ({ error, inexistente = false, rol = 'LECTOR' } = {}) => {
    const context = createContext({ console: { error() {} } });
    const modulo = (exports) => new SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
    const llamadas = [];
    const ejecutar = (nombre) => async (...args) => {
        llamadas.push({ nombre, args });
        if (error) throw error;
        if (inexistente && ['updateLector', 'deleteLector', 'toggleEstadoLector'].includes(nombre)) {
            throw Object.assign(new Error('Lector no encontrado'), { status: 404 });
        }
        if (nombre === 'getPerfilByUsuario') return inexistente ? undefined : { username: 'prueba', rol };
        return nombre === 'getAllLectores' ? [] : { id: 1 };
    };
    const repository = modulo(Object.fromEntries(['getAllLectores', 'createLector', 'updateLector',
        'deleteLector', 'toggleEstadoLector', 'getPerfilByUsuario'].map((nombre) => [nombre, ejecutar(nombre)])));
    const service = new SourceTextModule(serviceSource, { context });
    await service.link(() => repository);
    await service.evaluate();
    const controller = new SourceTextModule(controllerSource, { context });
    await controller.link(() => service);
    await controller.evaluate();
    return { llamadas, async solicitar(accion, body = datos, id = '1') {
        const response = {
            code: 200, status(code) { this.code = code; return this; },
            json(data) { this.data = data; return this; }
        };
        await controller.namespace[accion]({ body, params: { id }, user: { loginId: id } }, response);
        return response;
    } };
};

test('Lectores: altas y consultas mantienen 201/200 y normalización', async () => {
    for (const [accion, expected] of [['getLectores', 200], ['createLector', 201], ['updateLector', 200], ['deleteLector', 200], ['cambiarEstado', 200], ['getMiPerfil', 200]]) {
        const caso = await preparar();
        assert.equal((await caso.solicitar(accion, { ...datos, correo: ' PRUEBA@EXAMPLE.ORG ', ru: ' ' })).code, expected);
        if (['createLector', 'updateLector'].includes(accion)) {
            const enviado = caso.llamadas[0].args.at(-1);
            assert.equal(enviado.correo, 'prueba@example.org');
            assert.equal(enviado.ru, null);
            assert.equal(enviado.telefono, null);
        }
    }
});

test('Lectores: datos faltantes o tipos inválidos devuelven 400 sin consultar BD', async () => {
    for (const accion of ['createLector', 'updateLector']) {
        for (const body of [null, {}, [], { ...datos, ci: 123 }, { ...datos, nombres: ' ' },
            { ...datos, ru: {} }, { ...datos, telefono: [] }, { ...datos, correo: 'incorrecto' },
            { ...datos, tipo_lector: 'OTRO' }]) {
            const caso = await preparar();
            assert.equal((await caso.solicitar(accion, body)).code, 400);
            assert.equal(caso.llamadas.length, 0);
        }
    }
});

test('Lectores: ID de ruta inválido devuelve 400; identificador inválido en token, 401', async () => {
    for (const accion of ['updateLector', 'deleteLector', 'cambiarEstado', 'getMiPerfil']) {
        for (const id of ['abc', '0', '-1', '1.5', '2147483648', {}, null]) {
            const caso = await preparar();
            assert.equal((await caso.solicitar(accion, datos, id)).code, accion === 'getMiPerfil' ? 401 : 400);
            assert.equal(caso.llamadas.length, 0);
        }
    }
});

test('Lectores: registros inexistentes devuelven 404', async () => {
    for (const accion of ['updateLector', 'deleteLector', 'cambiarEstado', 'getMiPerfil']) {
        assert.equal((await (await preparar({ inexistente: true })).solicitar(accion)).code, 404);
    }
});

test('Lectores: duplicados 409 y restricciones de datos 400 sin detalles SQL', async () => {
    for (const accion of ['createLector', 'updateLector']) {
        for (const [code, expected] of [['23505', 409], ['23502', 400], ['23514', 400], ['23503', 400], ['22001', 400], ['22P02', 400]]) {
            const res = await (await preparar({ error: Object.assign(new Error('Detalle SQL privado'), { code }) })).solicitar(accion);
            assert.equal(res.code, expected);
            assert.notEqual(res.data.error, 'Detalle SQL privado');
        }
    }
});

test('Lectores: eliminación con préstamos o sanciones devuelve 409', async () => {
    const error = Object.assign(new Error('Detalle de FK'), { code: '23503' });
    const res = await (await preparar({ error })).solicitar('deleteLector');
    assert.equal(res.code, 409);
    assert.match(res.data.error, /préstamos o sanciones/);
});

test('Lectores: fallos inesperados devuelven 500 en todas las operaciones', async () => {
    for (const accion of ['getLectores', 'createLector', 'updateLector', 'deleteLector', 'cambiarEstado', 'getMiPerfil']) {
        const res = await (await preparar({ error: new Error('Detalle de conexión privado') })).solicitar(accion);
        assert.equal(res.code, 500);
        assert.equal(res.data.error, 'Error interno del servidor');
    }
});

test('Mi perfil sigue disponible para ambos roles', async () => {
    for (const rol of ['LECTOR', 'BIBLIOTECARIO']) {
        const res = await (await preparar({ rol })).solicitar('getMiPerfil');
        assert.equal(res.code, 200);
        assert.equal(res.data.rol, rol);
    }
});
