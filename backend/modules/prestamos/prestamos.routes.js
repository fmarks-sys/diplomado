import express from 'express';
import * as controller from './prestamos.controller.js';

import { verifyToken } from '../../middlewares/authMiddleware.js';
import { isAdmin, isLector } from '../../middlewares/rolMiddleware.js';


const router = express.Router();

// router.get('/', controller.getPrestamos);
// router.post('/', controller.crearPrestamo);
// router.patch('/devolver/:id', controller.devolver);

router.get('/', verifyToken, isAdmin, controller.getPrestamos);
router.post('/', verifyToken, isAdmin, controller.crearPrestamo);
router.patch('/devolver/:id', verifyToken, isAdmin, controller.devolver);
router.get('/mis-prestamos', verifyToken, isLector, controller.getMisPrestamos);
router.get('/mis-alertas', verifyToken, isLector, controller.getMisAlertas);

export default router;