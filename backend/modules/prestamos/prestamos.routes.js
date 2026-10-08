import express from 'express';
import * as controller from './prestamos.controller.js';
import { verifyToken } from '../../middlewares/authMiddleware.js';
import { isAdmin, isLector } from '../../middlewares/rolMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación.
router.use(verifyToken);

// BIBLIOTECARIO
router.get('/', isAdmin, controller.getPrestamos);
router.post('/', isAdmin, controller.crearPrestamo);
router.patch('/devolver/:id', isAdmin, controller.devolver);

// LECTOR
router.get('/mis-prestamos', isLector, controller.getMisPrestamos);
router.get('/mis-alertas', isLector, controller.getMisAlertas);

export default router;