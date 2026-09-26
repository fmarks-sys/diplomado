import express from 'express';
import * as controller from './areas.controller.js';

const router = express.Router();


// Listar todas
router.get('/', controller.getAreas);

// Listar únicamente activas
// IMPORTANTE: debe ir antes de /:id si posteriormente
router.get('/activas', controller.getAreasActivas);

// Crear
router.post('/', controller.crearArea);

// Actualizar nombre
router.put('/:id', controller.updateArea);

// Activar / desactivar
router.patch('/:id/estado', controller.cambiarEstadoArea);


export default router;
