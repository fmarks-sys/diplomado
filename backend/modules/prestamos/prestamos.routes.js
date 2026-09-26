import express from 'express';

import * as controller
    from './prestamos.controller.js';

import {
    verifyToken
} from '../../middlewares/authMiddleware.js';

import {
    isAdmin,
    isLector
} from '../../middlewares/rolMiddleware.js';


const router = express.Router();


// RUTAS DEL BIBLIOTECARIO

// Listar todos los préstamos
router.get(
    '/',
    verifyToken,
    isAdmin,
    controller.getPrestamos
);


// Registrar préstamo
router.post(
    '/',
    verifyToken,
    isAdmin,
    controller.crearPrestamo
);


// Registrar devolución
router.patch(
    '/devolver/:id',
    verifyToken,
    isAdmin,
    controller.devolver
);


// RUTAS DEL LECTOR
// Consultar préstamos propios
router.get(
    '/mis-prestamos',
    verifyToken,
    isLector,
    controller.getMisPrestamos
);


// Consultar alertas propias
router.get(
    '/mis-alertas',
    verifyToken,
    isLector,
    controller.getMisAlertas
);


export default router;