import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const serviceSource = await readFile(new URL('../modules/usuarios/usuarios.service.js', import.meta.url), 'utf8');
const controllerSource = await readFile(new URL('../modules/usuarios/usuarios.controller.js', import.meta.url), 'utf8');
const datos = { ci: '123', nombres: 'Prueba', ap: 'Apellido', am: 'Ejemplo', correo: 'prueba@example.org', username: 'prueba', password: 'clave-ficticia', rol_id: 2, tipo_lector: 'ESTUDIANTE', ru: '123' };

// Probar controller y service reales con repositorio aislado de la BD y .env.
const preparar = async (opciones = {}) => {
    const context = createContext({ console: { error() {} } });
    const modulo = (exports) => new SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
    const guardados = [];
    const consultar = (valor) => async () => {
        if (opciones.falloLectura) throw new Error('Detalle interno de conexión');
        return valor;
    };
    const escribir = async (...args) => {
        if (opciones.errorEscritura) throw opciones.errorEscritura;
        guardados.push(args);
        return opciones.sinActualizacion ? undefined : { id: 1 };
    };
    const repository = modulo({
        findAll: consultar([]),
        findById: consultar(opciones.noExiste ? undefined : { login_id: 1 }),
        findPersonById: consultar(opciones.noExiste ? undefined : { id: 10 }),
        findPersonByCi: consultar(opciones.ciDuplicado ? { id: 10 } : undefined),
        findPersonByEmail: consultar(opciones.correoDuplicado ? { id: 10 } : undefined),
        findByUsername: consultar(opciones.usernameDuplicado ? { id: 2 } : opciones.mismoUsername ? { id: 1 } : undefined),
        findLoginByPersonId: consultar(opciones.cuentaDuplicada ? { id: 1 } : undefined),
        createNewUser: escribir, createLoginForExistingPerson: escribir,
        updateUser: escribir, updatePassword: escribir, updateStatus: escribir
    });
    const service = new SourceTextModule(serviceSource, { context });
    await service.link((name) => name === 'bcryptjs' ? modulo({ default: { hash: async () => 'hash-ficticio' } }) : repository);
    await service.evaluate();
    const controller = new SourceTextModule(controllerSource, { context });
    await controller.link(() => service);
    await controller.evaluate();
    return { guardados, async solicitar(accion, body = datos, id = '1') {
        const response = {
            code: 200,
            status(code) { this.code = code; return this; },
            json(data) { this.data = data; return this; }
        };
        await controller.namespace[accion]({ body, params: { id, personaId: id } }, response);
        return response;
    } };
};

test('IDs inválidos devuelven 400 en todas las operaciones por ID', async () => {
    for (const accion of ['getById', 'createFromPerson', 'update', 'changePassword', 'changeStatus']) {
        for (const id of ['abc', '0', '-1', '1.5', '2147483648', [], null]) {
            assert.equal((await (await preparar()).solicitar(accion, { ...datos, estado: 'ACTIVO' }, id)).code, 400);
        }
    }
});

test('datos ausentes o inválidos devuelven 400 sin escribir', async () => {
    for (const accion of ['create', 'createFromPerson', 'update', 'changePassword', 'changeStatus']) {
        for (const body of [null, {}, [], { ...datos, username: {} , password: [], estado: 1 }]) {
            const caso = await preparar();
            assert.equal((await caso.solicitar(accion, body)).code, 400);
            assert.equal(caso.guardados.length, 0);
        }
    }
    for (const body of [{ ...datos, rol_id: true }, { ...datos, correo: 'incorrecto' }, { ...datos, telefono: {} }]) {
        assert.equal((await (await preparar()).solicitar('create', body)).code, 400);
    }
});

test('usuario o persona inexistente devuelve 404', async () => {
    for (const accion of ['getById', 'createFromPerson', 'update', 'changePassword', 'changeStatus']) {
        assert.equal((await (await preparar({ noExiste: true })).solicitar(accion, { ...datos, estado: 'ACTIVO' })).code, 404);
    }
});

test('duplicados anticipados devuelven 409', async () => {
    for (const opciones of [{ ciDuplicado: true }, { correoDuplicado: true }, { usernameDuplicado: true }]) {
        assert.equal((await (await preparar(opciones)).solicitar('create')).code, 409);
    }
    assert.equal((await (await preparar({ cuentaDuplicada: true })).solicitar('createFromPerson')).code, 409);
    assert.equal((await (await preparar({ usernameDuplicado: true })).solicitar('createFromPerson')).code, 409);
    assert.equal((await (await preparar({ usernameDuplicado: true })).solicitar('update')).code, 409);
});

test('conflictos SQL 409, restricciones de datos 400 y fallos internos 500', async () => {
    for (const accion of ['create', 'createFromPerson', 'update', 'changePassword', 'changeStatus']) {
        for (const [code, expected] of [['23505', 409], ['23502', 400], ['23503', 400], ['23514', 400], ['22001', 400], ['22P02', 400], ['08006', 500]]) {
            const errorEscritura = Object.assign(new Error('Detalle SQL privado'), { code });
            const res = await (await preparar({ errorEscritura })).solicitar(accion, { ...datos, estado: 'ACTIVO' });
            assert.equal(res.code, expected);
            assert.notEqual(res.data.error, 'Detalle SQL privado');
        }
    }
    for (const accion of ['getAll', 'getById']) {
        const res = await (await preparar({ falloLectura: true })).solicitar(accion);
        assert.equal(res.code, 500);
        assert.equal(res.data.error, 'Error interno del servidor');
    }
});

test('éxitos mantienen 200/201 y se envían los datos de lector al repositorio', async () => {
    for (const [accion, expected] of [['getAll', 200], ['getById', 200], ['create', 201], ['createFromPerson', 201], ['update', 200], ['changePassword', 200], ['changeStatus', 200]]) {
        const caso = await preparar({ mismoUsername: accion === 'update' });
        assert.equal((await caso.solicitar(accion, { ...datos, estado: 'ACTIVO' })).code, expected);
        if (['create', 'createFromPerson', 'update'].includes(accion)) {
            const enviado = caso.guardados[0].at(-1);
            assert.equal(enviado.tipo_lector, 'ESTUDIANTE');
            assert.equal(enviado.ru, '123');
        }
    }
});

test('usuario desaparecido durante cambio de estado/contraseña devuelve 404', async () => {
    for (const accion of ['changePassword', 'changeStatus']) {
        assert.equal((await (await preparar({ sinActualizacion: true })).solicitar(accion, { ...datos, estado: 'ACTIVO' })).code, 404);
    }
});
