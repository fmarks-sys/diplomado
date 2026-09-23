import * as service from './recursos.service.js';

// LISTAR
export const getRecursos = async (req, res) => {
    try {
        const data = await service.listRecursos();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// OBTENER POR ID
export const getRecursoById = async (req, res) => {
    try {
        const data = await service.findRecursoById(req.params.id);
        res.json(data);
    } catch (e) {
        const status = e.message === 'Recurso no encontrado' ? 404 : 400;
        res.status(status).json({ error: e.message });
    }
};

// CREAR
export const createRecurso = async (req, res) => {
    try {
        const data = await service.addRecurso(req.body);
        res.status(201).json(data);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

// ACTUALIZAR
export const updateRecurso = async (req, res) => {
    try {
        const data = await service.editRecurso(req.params.id, req.body);
        res.json(data);
    } catch (e) {
        const status = e.message === 'Recurso no encontrado' ? 404 : 400;
        res.status(status).json({ error: e.message });
    }
};

// CAMBIAR ESTADO
export const cambiarEstado = async (req, res) => {
    try {
        const data = await service.changeEstado(req.params.id, req.body.estado);
        res.json(data);
    } catch (e) {
        const status = e.message === 'Recurso no encontrado' ? 404 : 400;
        res.status(status).json({ error: e.message });
    }
};

// ELIMINACIÓN FÍSICA
export const deleteRecurso = async (req, res) => {
    try {
        await service.removeRecurso(req.params.id);
        res.json({ message: 'Recurso eliminado físicamente' });
    } catch (e) {
        const status = e.message === 'Recurso no encontrado' ? 404 : 400;
        res.status(status).json({ error: e.message });
    }
};
