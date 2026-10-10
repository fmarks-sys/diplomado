import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import express from 'express';
import cors from 'cors';
import { errorHandler } from '../middlewares/errorMiddleware.js';

// app.js y middleware reales, routers aislados para no importar la BD/.env.
const cargarApp = async () => {
    const context = createContext({ console: { error() {} } });
    const modulo = (exports) => new SyntheticModule(Object.keys(exports), function () {
        for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
    const middleware = new SourceTextModule(await readFile(new URL('../middlewares/errorMiddleware.js', import.meta.url), 'utf8'), { context });
    await middleware.link(() => { throw new Error('Importación inesperada'); });
    const router = express.Router();
    router.post('/login', (_req, res) => res.status(200).json({ message: 'Respuesta del módulo' }));
    router.get('/fallo', async () => { throw new Error('Detalle interno privado'); });
    router.get('/conflicto', (_req, _res, next) => next(Object.assign(new Error('Conflicto de prueba'), { status: 409 })));
    const routes = modulo({ default: router });
    const app = new SourceTextModule(await readFile(new URL('../app.js', import.meta.url), 'utf8'), { context });
    await app.link((name) => {
        if (name === 'express') return modulo({ default: express });
        if (name === 'cors') return modulo({ default: cors });
        if (name.endsWith('errorMiddleware.js')) return middleware;
        if (name.endsWith('.routes.js')) return routes;
        throw new Error(`Importación inesperada: ${name}`);
    });
    await app.evaluate();
    return app.namespace.default;
};

test('app responde JSON a salud, rutas inexistentes y errores generales', async (t) => {
    const app = await cargarApp();
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}`;

    for (const [ruta, options, status, esperado] of [
        ['/api/v1/salud', {}, 200, { estado: 'ok' }],
        ['/ruta-inexistente', {}, 404, { error: 'Ruta no encontrada' }],
        ['/api/auth/no-existe', {}, 404, { error: 'Ruta no encontrada' }],
        ['/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{incorrecto' }, 400,
            { error: 'El cuerpo de la solicitud contiene JSON inválido' }],
        ['/api/auth/fallo', {}, 500, { error: 'Error interno del servidor' }],
        ['/api/auth/conflicto', {}, 409, { error: 'Conflicto de prueba' }],
        ['/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }, 200,
            { message: 'Respuesta del módulo' }],
        ['/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: 'a'.repeat(110000) }) }, 413,
            { error: 'El cuerpo de la solicitud supera el tamaño permitido' }]
    ]) {
        await t.test(`${options.method || 'GET'} ${ruta}: ${status}`, async () => {
            const res = await fetch(`${base}${ruta}`, options);
            assert.equal(res.status, status);
            assert.match(res.headers.get('content-type'), /application\/json/);
            assert.deepEqual(await res.json(), esperado);
        });
    }
});

test('errorHandler delega si la respuesta ya empezó', () => {
    const error = new Error('Error después de enviar encabezados');
    let delegado;
    errorHandler(error, {}, { headersSent: true }, (err) => { delegado = err; });
    assert.equal(delegado, error);
});
