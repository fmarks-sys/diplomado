import express from 'express';
import * as controller from './recursos.controller.js';

const router = express.Router();

router.get('/', controller.getRecursos);
router.post('/', controller.createRecurso);
router.put('/:id', controller.updateRecurso);
router.delete('/:id', controller.deleteRecurso);
router.patch('/estado/:id', controller.cambiarEstado);

export default router;