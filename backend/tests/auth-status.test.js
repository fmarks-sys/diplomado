import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import bcrypt from 'bcryptjs';

const serviceSource = await readFile(new URL('../modules/auth/auth.service.js', import.meta.url), 'utf8');
const controllerSource = await readFile(new URL('../modules/auth/auth.controller.js', import.meta.url), 'utf8');
const repositorySource = await readFile(new URL('../modules/auth/auth.repository.js', import.meta.url), 'utf8');
const password = 'clave-ficticia-de-prueba';
const passwordHash = bcrypt.hashSync(password, 4);
const registro = {
    ci: '123', nombres: 'Prueba', ap: 'Apellido', am: 'Ejemplo',
    correo: 'prueba@example.org', username: 'prueba', password, rol: 'LECTOR'
};

// Dependencias aisladas: no se carga config/db.js, .env ni la base real.
const preparar = async (opciones = {}) => {
    const context = createContext({ console: { error() {} }, process: { env: {} } });
    const modulo = (exports) => new SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
    let tokens = 0;
    const repository = modulo({
        findUserByUsername: async () => {
            if (opciones.falloBusqueda) throw new Error('Detalle interno de conexión');
            return opciones.user;
        },
        findPersonByCi: async () => opciones.personaCi,
        findPersonByEmail: async () => opciones.personaCorreo,
        createUser: async () => {
            if (opciones.errorRegistro) throw opciones.errorRegistro;
            return { persona: { id: 1 }, login: { id: 1 } };
        },
        createLoginForPerson: async () => {
            if (opciones.errorRegistro) throw opciones.errorRegistro;
            return { id: 1 };
        },
        updateLastAccess: async () => {
            if (opciones.falloAcceso) throw new Error('Detalle interno de actualización');
        }
    });
    const service = new SourceTextModule(serviceSource, { context });
    await service.link((name) => {
        if (name === 'bcryptjs') return modulo({ default: { compare: bcrypt.compare, hash: async () => passwordHash } });
        if (name === 'jsonwebtoken') return modulo({ default: { sign() { tokens++; return 'token-ficticio'; } } });
        return repository;
    });
    await service.evaluate();
    const controller = new SourceTextModule(controllerSource, { context });
    await controller.link(() => service);
    await controller.evaluate();
    return {
        tokens: () => tokens,
        async solicitar(accion, body) {
            const response = {
                status(code) { this.code = code; return this; },
                json(data) { this.data = data; return this; }
            };
            await controller.namespace[accion]({ body }, response);
            return response;
        }
    };
};

test('login: datos faltantes o con tipos inválidos devuelven 400', async () => {
    for (const body of [undefined, null, {}, { username: ' ', password }, { username: 5, password }, { username: 'prueba', password: [] }]) {
        const caso = await preparar();
        assert.equal((await caso.solicitar('login', body)).code, 400);
    }
});

test('login: credenciales, estados y éxito para ambos roles', async () => {
    for (const rol of ['LECTOR', 'BIBLIOTECARIO']) {
        for (const estado_login of ['ACTIVO', 'INACTIVO', 'BLOQUEADO']) {
            for (const valida of [true, false]) {
                const caso = await preparar({ user: { username: 'prueba', login_id: 1, persona_id: 1, rol, estado_login, password_hash: passwordHash } });
                const res = await caso.solicitar('login', { username: 'prueba', password: valida ? password : 'incorrecta' });
                const expected = !valida ? 401 : estado_login === 'ACTIVO' ? 200 : 403;
                assert.equal(res.code, expected);
                assert.equal(caso.tokens(), expected === 200 ? 1 : 0);
                if (expected === 200) assert.equal(res.data.token, 'token-ficticio');
                if (expected === 401) assert.equal(res.data.error, 'Credenciales incorrectas');
            }
        }
    }
    assert.equal((await (await preparar()).solicitar('login', { username: 'no-existe', password })).code, 401);
});

test('login: fallos de infraestructura devuelven 500 sin detalles internos', async () => {
    for (const opciones of [{ falloBusqueda: true }, { falloAcceso: true, user: { estado_login: 'ACTIVO', password_hash: passwordHash } }]) {
        const res = await (await preparar(opciones)).solicitar('login', { username: 'prueba', password });
        assert.equal(res.code, 500);
        assert.equal(res.data.error, 'Error interno del servidor');
    }
});

test('registro: campos faltantes, tipos, correo y rol inválidos devuelven 400', async () => {
    for (const body of [undefined, null, [], {}, { ...registro, nombres: ' ' }, { ...registro, rol: 2 },
        { ...registro, telefono: {} }, { ...registro, correo: 'incorrecto' }, { ...registro, rol: 'OTRO' }]) {
        assert.equal((await (await preparar()).solicitar('register', body)).code, 400);
    }
});

test('registro: username duplicado y CI/correo de distintas personas devuelven 409', async () => {
    for (const opciones of [{ user: { username: 'prueba' } }, { personaCi: { id: 1 }, personaCorreo: { id: 2 } }]) {
        assert.equal((await (await preparar(opciones)).solicitar('register', registro)).code, 409);
    }
});

test('registro: reutiliza persona existente sin tratarla como duplicado', async () => {
    for (const opciones of [{}, { personaCi: { id: 1 }, personaCorreo: { id: 1 } }]) {
        assert.equal((await (await preparar(opciones)).solicitar('register', registro)).code, 201);
    }
});

test('registro: restricciones SQL y errores inesperados reciben códigos distintos', async () => {
    for (const [code, expected] of [['23505', 409], ['23502', 400], ['23503', 400], ['23514', 400], ['22001', 400], ['22P02', 400], ['08006', 500]]) {
        const errorRegistro = Object.assign(new Error('Detalle interno SQL'), { code });
        const res = await (await preparar({ errorRegistro })).solicitar('register', registro);
        assert.equal(res.code, expected);
        assert.notEqual(res.data.error, 'Detalle interno SQL');
    }
});

test('repositorio Auth: rol inexistente 400 e inactivo 409 en ambos métodos de alta', async () => {
    for (const role of [undefined, { estado: 'INACTIVO' }]) {
        for (const metodo of ['createUser', 'createLoginForPerson']) {
            const context = createContext({});
            const consultas = [];
            const client = {
                async query(sql) { consultas.push(sql); return { rows: role ? [role] : [] }; },
                release() { consultas.push('RELEASE'); }
            };
            const db = new SyntheticModule(['pool'], function () {
                this.setExport('pool', { connect: async () => client });
            }, { context });
            const repo = new SourceTextModule(repositorySource, { context });
            await repo.link(() => db);
            await repo.evaluate();
            const run = metodo === 'createUser' ? repo.namespace.createUser(registro) : repo.namespace.createLoginForPerson(1, registro);
            await assert.rejects(run, (err) => err.status === (role ? 409 : 400));
            assert.deepEqual(consultas.slice(-2), ['ROLLBACK', 'RELEASE']);
        }
    }
});
