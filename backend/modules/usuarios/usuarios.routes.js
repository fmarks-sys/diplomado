import express from 'express';

import * as controller
    from './usuarios.controller.js';

import {
    verifyToken
} from '../../middlewares/auth.middleware.js';

import {
    isAdmin
} from '../../middlewares/role.middleware.js';


const router = express.Router();


// Todas las rutas requieren bibliotecario
router.use(
    verifyToken,
    isAdmin
);


// Listar
router.get(
    '/',
    controller.getAll
);


// Obtener uno
router.get(
    '/:id',
    controller.getById
);


// Crear usuario completamente nuevo
router.post(
    '/',
    controller.create
);


// Dar acceso a persona/lector existente
router.post(
    '/persona/:personaId',
    controller.createFromPerson
);


// Modificar
router.put(
    '/:id',
    controller.update
);


// Cambiar contraseña
router.patch(
    '/:id/password',
    controller.changePassword
);


// Bloquear / inhabilitar / activar
router.patch(
    '/:id/estado',
    controller.changeStatus
);


export default router;