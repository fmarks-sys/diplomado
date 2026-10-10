import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';

// Aislar el repositorio de config/db.js: estas pruebas no abren conexiones
// ni leen credenciales. Verifican los flujos y rollback con un cliente simulado.
const source = await readFile(new URL('../modules/usuarios/usuarios.repository.js', import.meta.url), 'utf8');
const datos = { rol_id: 2, tipo_lector: 'ESTUDIANTE', ru: ' 123 ', username: 'prueba', password_hash: 'hash-ficticio' };

const preparar = async ({ rol = 'LECTOR', activo = true, existente = false, fallo = '' } = {}) => {
    const consultas = [];
    const inicial = { lectores: existente ? [{ id: 7, persona_id: 10, ru: 'anterior', tipo_lector: 'DOCENTE', estado: 'SANCIONADO' }] : [], personas: [], logins: [] };
    let guardado = structuredClone(inicial);
    let transaccion;
    let liberado = false;
    const client = {
        async query(sql, params = []) {
            sql = sql.replace(/\s+/g, ' ').trim();
            consultas.push({ sql, params });
            if (sql === 'BEGIN') transaccion = structuredClone(guardado);
            else if (sql === 'COMMIT') guardado = transaccion;
            else if (sql === 'ROLLBACK') transaccion = undefined;
            else if (sql.includes('FROM roles')) return { rows: [{ nombre: rol, estado: activo ? 'ACTIVO' : 'INACTIVO' }] };
            else if (sql.startsWith('SELECT persona_id')) return { rows: [{ persona_id: 10 }] };
            else if (sql.startsWith('SELECT id FROM lectores')) return { rows: transaccion.lectores.filter((lector) => lector.persona_id === params[0]) };
            else if (sql.startsWith('INSERT INTO personas')) {
                transaccion.personas.push({ id: 10 });
                return { rows: [{ id: 10 }] };
            } else if (sql.startsWith('INSERT INTO lectores')) {
                if (fallo === 'ru') throw Object.assign(new Error('duplicate'), { code: '23505' });
                transaccion.lectores.push({ persona_id: params[0], ru: params[1], tipo_lector: params[2] });
            } else if (sql.startsWith('INSERT INTO login')) {
                if (fallo === 'login') throw new Error('No se pudo crear login');
                transaccion.logins.push({ persona_id: params[0] });
                return { rows: [{ id: 20 }] };
            } else if (!sql.startsWith('UPDATE personas') && !sql.startsWith('UPDATE login')) {
                throw new Error(`Consulta no simulada: ${sql}`);
            }
            return { rows: [] };
        },
        release() { liberado = true; }
    };
    const context = createContext({});
    const db = new SyntheticModule(['pool'], function () {
        this.setExport('pool', { connect: async () => client });
    }, { context });
    const module = new SourceTextModule(source, { context });
    await module.link(() => db);
    await module.evaluate();
    return { repo: module.namespace, consultas, estado: () => guardado, liberado: () => liberado };
};

test('persona nueva LECTOR crea persona, lector y login en una transacción', async () => {
    const caso = await preparar();
    await caso.repo.createNewUser(datos);
    assert.equal(caso.estado().personas.length, 1);
    assert.equal(caso.estado().logins.length, 1);
    assert.deepEqual(caso.estado().lectores, [{ persona_id: 10, ru: '123', tipo_lector: 'ESTUDIANTE' }]);
    assert.equal(caso.consultas.at(-1).sql, 'COMMIT');
    assert.equal(caso.liberado(), true);
});

test('BIBLIOTECARIO no necesita ni crea datos de lector', async () => {
    const caso = await preparar({ rol: 'BIBLIOTECARIO' });
    await caso.repo.createNewUser({ ...datos, tipo_lector: undefined });
    assert.equal(caso.estado().lectores.length, 0);
    assert.equal(caso.estado().logins.length, 1);
});

test('persona existente sin lector recibe registro y login', async () => {
    const caso = await preparar();
    await caso.repo.createLoginForExistingPerson(10, { ...datos, ru: '' });
    assert.equal(caso.estado().personas.length, 0);
    assert.equal(caso.estado().lectores[0].ru, null);
    assert.equal(caso.estado().logins.length, 1);
});

test('lector existente se reutiliza sin sobrescribir RU, tipo o sanción', async () => {
    const caso = await preparar({ existente: true });
    await caso.repo.createLoginForExistingPerson(10, { ...datos, tipo_lector: undefined });
    assert.equal(caso.estado().lectores.length, 1);
    assert.equal(caso.estado().lectores[0].estado, 'SANCIONADO');
    assert.equal(caso.estado().lectores[0].ru, 'anterior');
    assert.equal(caso.estado().lectores[0].tipo_lector, 'DOCENTE');
});

for (const tipo_lector of [undefined, 'INVALIDO']) {
    test(`tipo de lector ${tipo_lector} revierte toda el alta`, async () => {
        const caso = await preparar();
        await assert.rejects(caso.repo.createNewUser({ ...datos, tipo_lector }), /Tipo de lector requerido/);
        assert.equal(caso.estado().personas.length, 0);
        assert.equal(caso.estado().lectores.length, 0);
        assert.equal(caso.consultas.at(-1).sql, 'ROLLBACK');
        assert.equal(caso.liberado(), true);
    });
}

test('RU duplicado informa el conflicto y revierte persona y cuenta', async () => {
    const caso = await preparar({ fallo: 'ru' });
    await assert.rejects(caso.repo.createNewUser(datos), /RU ya está registrado/);
    assert.equal(caso.estado().personas.length, 0);
    assert.equal(caso.estado().logins.length, 0);
    assert.equal(caso.consultas.at(-1).sql, 'ROLLBACK');
});

test('fallo al crear login revierte también el lector recién creado', async () => {
    const caso = await preparar({ fallo: 'login' });
    await assert.rejects(caso.repo.createNewUser(datos), /No se pudo crear login/);
    assert.equal(caso.estado().personas.length, 0);
    assert.equal(caso.estado().lectores.length, 0);
});

test('editar a LECTOR crea su registro faltante', async () => {
    const caso = await preparar();
    await caso.repo.updateUser(20, datos);
    assert.equal(caso.estado().lectores.length, 1);
    assert.equal(caso.consultas.at(-1).sql, 'COMMIT');
});

test('editar un lector existente conserva su registro', async () => {
    const caso = await preparar({ existente: true });
    await caso.repo.updateUser(20, { ...datos, tipo_lector: undefined });
    assert.equal(caso.estado().lectores.length, 1);
    assert.equal(caso.estado().lectores[0].estado, 'SANCIONADO');
});

test('cambiar a BIBLIOTECARIO conserva el lector para su historial', async () => {
    const caso = await preparar({ rol: 'BIBLIOTECARIO', existente: true });
    await caso.repo.updateUser(20, datos);
    assert.equal(caso.estado().lectores.length, 1);
});

test('editar con rol inactivo rechaza el cambio antes de modificar datos', async () => {
    const caso = await preparar({ activo: false });
    await assert.rejects(caso.repo.updateUser(20, datos), /rol está inactivo/);
    assert.equal(caso.consultas.some(({ sql }) => sql.startsWith('UPDATE')), false);
    assert.equal(caso.consultas.at(-1).sql, 'ROLLBACK');
});

test('RU mayor de 20 caracteres se rechaza', async () => {
    const caso = await preparar();
    await assert.rejects(caso.repo.createNewUser({ ...datos, ru: '1'.repeat(21) }), /20 caracteres/);
    assert.equal(caso.estado().personas.length, 0);
});
