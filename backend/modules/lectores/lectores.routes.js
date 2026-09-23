import express from 'express';
import * as controller from './lectores.controller.js';
import { verifyToken } from '../../middlewares/authMiddleware.js';

const router = express.Router();

// IMPORTANTE: /mi-perfil debe declararse antes de /:id para evitar conflictos futuros.
router.get('/mi-perfil', verifyToken, controller.getMiPerfil);

router.get('/', verifyToken, controller.getLectores);
router.post('/', verifyToken, controller.createLector);
router.put('/:id', verifyToken, controller.updateLector);
router.delete('/:id', verifyToken, controller.deleteLector);
router.patch('/estado/:id', verifyToken, controller.cambiarEstado);

export default router;
