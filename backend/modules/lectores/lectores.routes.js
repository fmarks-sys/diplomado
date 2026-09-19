import express from 'express';
import * as controller from './lectores.controller.js';


import { verifyToken } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', controller.getLectores);

router.post('/', controller.createLector);

router.put('/:id', controller.updateLector);

router.delete('/:id', controller.deleteLector);

router.patch('/estado/:id', controller.cambiarEstado);

//perfil y verifica rol
router.get('/mi-perfil', verifyToken, controller.getMiPerfil);

export default router;