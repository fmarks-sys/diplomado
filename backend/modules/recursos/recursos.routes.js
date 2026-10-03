import express from 'express';
import * as controller from './recursos.controller.js';

import { verifyToken } from '../../middlewares/authMiddleware.js';
import { isAdmin } from '../../middlewares/rolMiddleware.js';


const router = express.Router();
// Todas las rutas requieren bibliotecario
router.use(
    verifyToken
);

router.get('/', controller.getRecursos);
router.get('/:id', controller.getRecursoById);

router.post('/', verifyToken,
    isAdmin,controller.createRecurso);
router.put('/:id', verifyToken,
    isAdmin,controller.updateRecurso);
router.patch('/:id/estado',verifyToken,
    isAdmin, controller.cambiarEstado);

// Eliminación física: conservar solo para administración/mantenimiento.
// La operación normal del sistema debe ser cambiar el estado a BAJA.
router.delete('/:id',verifyToken,isAdmin, controller.deleteRecurso);

export default router;