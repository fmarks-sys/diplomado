import express from 'express';
import * as controller from './areas.controller.js';

const router = express.Router();

router.get('/', controller.getAreas);
router.post('/', controller.crearArea);
router.put('/:id', controller.updateArea);
// router.delete('/estado/:id', controller.deletArea)
router.delete('/:id', controller.deleteArea);
router.patch('/estado/:id', controller.deleteAreaLogica); //eliminaciom logica

export default router;