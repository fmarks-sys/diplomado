import express from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import usuariosRoutes from './modules/usuarios/usuarios.routes.js';
import areasRoutes from './modules/areas/areas.routes.js';
import recursosRouter from './modules/recursos/recursos.routes.js';
import lectoresRouter from './modules/lectores/lectores.routes.js';
import prestamosRoutes from './modules/prestamos/prestamos.routes.js';
import cors from 'cors';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';

const app = express();

//  PRIMERO los middlewares globales
app.use(cors());
app.use(express.json());

//  LUEGO las rutas
app.get('/api/v1/salud', (_req, res) => {
    res.status(200).json({ estado: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/areas', areasRoutes);
app.use('/api/recursos', recursosRouter);
app.use('/api/lectores', lectoresRouter);
app.use('/api/prestamos', prestamosRoutes);

// Al final: rutas sin coincidencia y errores que no resolvieron los módulos.
app.use(notFound);
app.use(errorHandler);

export default app;
