import express from 'express';
import * as controller from './recursos.controller.js';

const router = express.Router();

router.get('/', controller.getRecursos);
router.get('/:id', controller.getRecursoById);
router.post('/', controller.createRecurso);
router.put('/:id', controller.updateRecurso);
router.patch('/:id/estado', controller.cambiarEstado);

// Eliminación física: conservar solo para administración/mantenimiento.
// La operación normal del sistema debe ser cambiar el estado a BAJA.
router.delete('/:id', controller.deleteRecurso);

export default router;