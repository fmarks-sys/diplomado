import express from 'express';
import { verifyToken } from '../../middlewares/authMiddleware.js';
import { isAdmin } from '../../middlewares/rolMiddleware.js';
import { crearEscaner, validarImagen } from './escanear.service.js';

export function crearLimiteEscaneo({ now = Date.now, max = 5, windowMs = 60_000 } = {}) {
    const requests = new Map();
    return (req, res, next) => {
        const user = req.user.loginId;
        if (user === undefined || user === null) return res.status(403).json({ error: 'Sesión sin identificador de usuario' });
        const time = now();
        for (const [id, item] of requests) {
            if (time >= item.reset) requests.delete(id);
        }
        let item = requests.get(user);
        if (!item) {
            item = { count: 0, reset: time + windowMs };
            requests.set(user, item);
        }
        if (item.count >= max) {
            res.set('Retry-After', String(Math.ceil((item.reset - time) / 1000)));
            return res.status(429).json({ error: 'Máximo 5 escaneos por minuto. Intenta más tarde.' });
        }
        item.count++;
        next();
    };
}

export function crearRouterEscaneo({ scan = crearEscaner(), limiter = crearLimiteEscaneo() } = {}) {
    const router = express.Router();
    router.post('/', verifyToken, isAdmin, limiter,
        (req, res, next) => req.is('application/json') ? next() :
            res.status(415).json({ error: 'Usa Content-Type: application/json' }),
        express.json({ limit: '5mb' }),
        async (req, res) => {
            res.set('Cache-Control', 'no-store');
            try {
                validarImagen(req.body);
                res.json(await scan(req.body));
            } catch (error) {
                const status = error.status || 500;
                res.status(status).json({ error: status === 500 ? 'Error interno del escáner IA' : error.message });
            }
        });
    // Handle this endpoint's parser errors without logging the submitted image.
    router.use((error, _req, res, next) => {
        if (res.headersSent) return next(error);
        const status = error.type === 'entity.too.large' ? 413 : 400;
        res.status(status).json({ error: status === 413 ? 'La imagen o solicitud supera el tamaño permitido' :
            'El cuerpo de la solicitud contiene JSON inválido' });
    });
    return router;
}

export default crearRouterEscaneo();

