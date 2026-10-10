import express from 'express';
import * as controller from './lectores.controller.js';
import { verifyToken } from '../../middlewares/authMiddleware.js';

import { isAdmin } from '../../middlewares/rolMiddleware.js';


const router = express.Router();
// Todas las rutas requieren bibliotecario
router.use(
    verifyToken
);

// IMPORTANTE: /mi-perfil debe declararse antes de /:id para evitar conflictos futuros.
router.get('/mi-perfil', verifyToken, controller.getMiPerfil);

router.get('/',isAdmin, verifyToken, controller.getLectores);
router.post('/',isAdmin, verifyToken, controller.createLector);
router.put('/:id', verifyToken, isAdmin, controller.updateLector);
router.delete('/:id',isAdmin, verifyToken, controller.deleteLector);
router.patch('/estado/:id',isAdmin, verifyToken, controller.cambiarEstado);

export default router;
