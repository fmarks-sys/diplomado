import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import { crearEscaner, validarImagen, validarExtraccion, MAX_IMAGE_BYTES } from '../modules/recursos/escanear.service.js';
import { crearRouterEscaneo, crearLimiteEscaneo } from '../modules/recursos/escanear.routes.js';

const image = { mime_type: 'image/png',
    imagen_base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF1kAAAAASUVORK5CYII=' };
const config = () => ({ key: 'fake-key-only-for-tests', model: 'gemini-3.5-flash-lite' });
const extracted = { titulo: 'Ingeniería de software', autor: 'Autor de prueba', anio_publicacion: 2024, isbn: '978-0-306-40615-7' };
const provider = (value = extracted, reason = 'STOP') => ({
    candidates: [{ finishReason: reason, content: { parts: [{ text: JSON.stringify(value) }] } }]
});
const mock = (body, status = 200) => async () => new Response(JSON.stringify(body), { status });

test('extractor sends image, JSON schema and key only in a header; returns reviewed data', async () => {
    let calls = 0;
    const scan = crearEscaner({ getConfig: config, fetchImpl: async (url, request) => {
        calls++;
        assert.ok(!url.includes('fake-key'));
        assert.equal(request.headers['x-goog-api-key'], config().key);
        const body = JSON.parse(request.body);
        assert.equal(body.contents[0].parts[1].inlineData.data, image.imagen_base64);
        assert.equal(body.generationConfig.responseMimeType, 'application/json');
        assert.equal(body.generationConfig.responseSchema.properties.titulo.nullable, true);
        return new Response(JSON.stringify(provider()));
    } });
    const result = await scan(image);
    assert.equal(calls, 1);
    assert.equal(result.data.isbn, '9780306406157');
    assert.equal(result.requiere_revision, true);
    assert.deepEqual(result.campos_no_detectados, []);
});

test('default model works for new projects and trims configuration', async (t) => {
    const previousKey = process.env.GEMINI_API_KEY;
    const previousModel = process.env.GEMINI_MODEL;
    t.after(() => {
        if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey;
        if (previousModel === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = previousModel;
    });
    process.env.GEMINI_API_KEY = ' fake-key-only-for-tests ';
    delete process.env.GEMINI_MODEL;
    const scan = crearEscaner({ fetchImpl: async (url, request) => {
        assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
        assert.equal(request.headers['x-goog-api-key'], 'fake-key-only-for-tests');
        return new Response(JSON.stringify(provider()));
    } });
    await scan(image);
    process.env.GEMINI_MODEL = ' gemini-3.5-flash-lite ';
    await scan(image);
});

test('model rejection and credential rejection have distinct safe guidance', async () => {
    for (const [upstream, expected] of [[404, 'GEMINI_MODEL'], [401, 'GEMINI_API_KEY'], [403, 'GEMINI_API_KEY']]) {
        await assert.rejects(crearEscaner({ getConfig: config, fetchImpl: mock({ error: 'private-key-and-details' }, upstream) })(image),
            error => error.status === 503 && error.message.includes(expected) && !error.message.includes('private-key'));
    }
});

test('missing/unreadable fields remain null; invalid ISBN and future year are discarded', async () => {
    const scan = crearEscaner({ getConfig: config, fetchImpl: mock(provider({ titulo: null, autor: null, anio_publicacion: null, isbn: null })) });
    const result = await scan(image);
    assert.equal(result.campos_no_detectados.length, 4);
    assert.deepEqual(result.data, { titulo: null, autor: null, anio_publicacion: null, isbn: null });
    const value = validarExtraccion({ ...extracted, anio_publicacion: 9999, isbn: '9780306406158' });
    assert.equal(value.anio_publicacion, null);
    assert.equal(value.isbn, null);
    assert.equal(validarExtraccion({ ...extracted, isbn: '0-306-40615-2' }).isbn, '0306406152');
});

test('invalid input and excessive image size never reach Gemini', async () => {
    const scan = crearEscaner({ getConfig: config, fetchImpl: () => assert.fail('No external call expected') });
    for (const [body, status] of [
        [null, 400], [{}, 415], [{ ...image, mime_type: 'application/pdf' }, 415],
        [{ ...image, imagen_base64: 'data:image/png;base64,AAAA' }, 400],
        [{ ...image, imagen_base64: '!!!!' }, 400],
        [{ ...image, imagen_base64: Buffer.from('not an image').toString('base64') }, 415],
        [{ ...image, imagen_base64: Buffer.alloc(MAX_IMAGE_BYTES + 1).toString('base64') }, 413]
    ]) {
        await assert.rejects(scan(body), error => error.status === status);
    }
    assert.equal(validarImagen(image).mime, 'image/png');
});

test('provider failure, quota, timeout, malformed JSON and blocked images have sanitized errors', async () => {
    for (const [upstream, expected] of [[429, 429], [403, 503], [404, 503], [400, 422], [500, 502]]) {
        await assert.rejects(crearEscaner({ getConfig: config, fetchImpl: mock({ error: 'private-key-and-details' }, upstream) })(image),
            error => error.status === expected && !error.message.includes('private-key'));
    }
    await assert.rejects(crearEscaner({ getConfig: () => ({ key: '' }), fetchImpl: () => assert.fail() })(image),
        error => error.status === 503);
    await assert.rejects(crearEscaner({ getConfig: config, fetchImpl: async () => {
        throw new DOMException('Private timeout message', 'TimeoutError');
    } })(image), error => error.status === 504 && !error.message.includes('Private'));
    for (const [body, status] of [
        [provider({}, 'SAFETY'), 422],
        [{ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'not JSON' }] } }] }, 502],
        [provider({ ...extracted, autor: 123 }), 502],
        [provider({ ...extracted, anio_publicacion: '2024' }), 502]
    ]) {
        await assert.rejects(crearEscaner({ getConfig: config, fetchImpl: mock(body) })(image), error => error.status === status);
    }
});

test('HTTP endpoint enforces permissions, parser limits and rate limit; window resets', async (t) => {
    const old = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'fake-scanner-jwt-secret';
    t.after(() => { if (old === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = old; });
    let time = 0;
    let calls = 0;
    const app = express();
    app.use('/api/recursos/escanear', crearRouterEscaneo({
        scan: async () => { calls++; return { data: extracted, requiere_revision: true }; },
        limiter: crearLimiteEscaneo({ now: () => time })
    }));
    // Same placement as app.js: scanner body parser precedes the default 100KB parser.
    app.use(express.json());
    app.post('/ordinary', (_req, res) => res.json({ ok: true }));
    app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: 'parser error' }));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const url = `http://127.0.0.1:${server.address().port}`;
    const token = (rol, loginId = 1) => jwt.sign({ rol, loginId }, process.env.JWT_SECRET);
    const send = (authorization, body = JSON.stringify(image), contentType = 'application/json', path = '/api/recursos/escanear') =>
        fetch(url + path, { method: 'POST', headers: {
            'Content-Type': contentType, ...(authorization ? { Authorization: 'Bearer ' + authorization } : {})
        }, body });
    assert.equal((await send(null)).status, 401);
    assert.equal((await send(token('LECTOR'))).status, 403);
    assert.equal((await send('invalid')).status, 401);
    const bib = token('BIBLIOTECARIO');
    for (let i = 0; i < 5; i++) {
        const result = await send(bib);
        assert.equal(result.status, 200);
        assert.equal(result.headers.get('cache-control'), 'no-store');
    }
    const limited = await send(bib);
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('retry-after'), '60');
    assert.equal(calls, 5);
    time = 60_000;
    assert.equal((await send(bib)).status, 200);
    assert.equal((await send(token('BIBLIOTECARIO', 2), '{')).status, 400);
    assert.equal((await send(token('BIBLIOTECARIO', 3), '{}', 'text/plain')).status, 415);
    const tooBig = JSON.stringify({ ...image, imagen_base64: 'A'.repeat(6 * 1024 * 1024) });
    assert.equal((await send(token('BIBLIOTECARIO', 4), tooBig)).status, 413);
    // Image JSON over 100KB reaches the scanner rather than being rejected by the default parser.
    const padded = JSON.stringify({ ...image, padding: 'x'.repeat(120_000) });
    assert.equal((await send(token('BIBLIOTECARIO', 5), padded)).status, 200);
    assert.equal((await send(null, padded, 'application/json', '/ordinary')).status, 413);
});

