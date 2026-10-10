import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import express from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from '../middlewares/authMiddleware.js';
import { isAdmin } from '../middlewares/rolMiddleware.js';

// Usar las rutas y los permisos reales con controladores simulados:
// no se importan repositorios ni se conecta a la base de datos.
const cargarRouter = async (archivo, nombres) => {
    const context = createContext({});
    const source = await readFile(new URL(archivo, import.meta.url), 'utf8');
    const crearModulo = (exports) => new SyntheticModule(Object.keys(exports), function () {
        for (const [nombre, valor] of Object.entries(exports)) this.setExport(nombre, valor);
    }, { context });
    const controller = Object.fromEntries(nombres.map((nombre) => [nombre, (_req, res) => res.json({ controlador: nombre })]));
    const modulos = {
        express: crearModulo({ default: express }),
        auth: crearModulo({ verifyToken }),
        rol: crearModulo({ isAdmin }),
        controller: crearModulo(controller)
    };
    const module = new SourceTextModule(source, { context });
    await module.link((specifier) => {
        if (specifier === 'express') return modulos.express;
        if (specifier.endsWith('authMiddleware.js')) return modulos.auth;
        if (specifier.endsWith('rolMiddleware.js')) return modulos.rol;
        if (specifier.endsWith('.controller.js')) return modulos.controller;
        throw new Error(`Importación inesperada: ${specifier}`);
    });
    await module.evaluate();
    return module.namespace.default;
};

test('registro y edición de lectores exigen bibliotecario; login y perfil conservan acceso', async (t) => {
    const secretoAnterior = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'clave-ficticia-exclusiva-de-pruebas';
    t.after(() => {
        if (secretoAnterior === undefined) delete process.env.JWT_SECRET;
        else process.env.JWT_SECRET = secretoAnterior;
    });

    const app = express();
    app.use('/api/auth', await cargarRouter('../modules/auth/auth.routes.js', ['register', 'login']));
    app.use('/api/lectores', await cargarRouter('../modules/lectores/lectores.routes.js', [
        'getMiPerfil', 'getLectores', 'createLector', 'updateLector', 'deleteLector', 'cambiarEstado'
    ]));
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const base = `http://127.0.0.1:${server.address().port}`;
    const lector = jwt.sign({ loginId: 1, rol: 'LECTOR' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const admin = jwt.sign({ loginId: 2, rol: 'BIBLIOTECARIO' }, process.env.JWT_SECRET, { expiresIn: '5m' });
    const expirado = jwt.sign({ rol: 'BIBLIOTECARIO' }, process.env.JWT_SECRET, { expiresIn: -1 });

    for (const [method, ruta, controlador] of [
        ['POST', '/api/auth/register', 'register'],
        ['PUT', '/api/lectores/7', 'updateLector']
    ]) {
        for (const [token, status] of [[null, 401], ['invalido', 401], [expirado, 401], [lector, 403], [admin, 200]]) {
            await t.test(`${method} ${ruta}: ${status} (${token === lector ? 'lector' : token === admin ? 'bibliotecario' : 'sin token válido'})`, async () => {
                const res = await fetch(`${base}${ruta}`, {
                    method, headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                assert.equal(res.status, status);
                const data = await res.json();
                if (status === 200) assert.equal(data.controlador, controlador);
                else assert.equal(typeof data.error, 'string');
            });
        }
    }
    const login = await fetch(`${base}/api/auth/login`, { method: 'POST' });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).controlador, 'login');
    const perfil = await fetch(`${base}/api/lectores/mi-perfil`, { headers: { Authorization: `Bearer ${lector}` } });
    assert.equal(perfil.status, 200);
    assert.equal((await perfil.json()).controlador, 'getMiPerfil');
});
