import * as service from './recursos.service.js';

const responderError = (res, error, eliminacion = false) => {
    let status = error.status || 500;
    let message = error.message;
    if (error.code === '23505') {
        status = 409;
        message = 'Ya existe un recurso con ese código topográfico';
    } else if (eliminacion && error.code === '23503') {
        status = 409;
        message = 'No se puede eliminar un recurso con préstamos asociados';
    } else if (['23502', '23503', '23514', '22001', '22P02'].includes(error.code)) {
        status = 400;
        message = 'Datos de recurso inválidos';
    }
    if (status === 500) {
        console.error(error);
        message = 'Error interno del servidor';
    }
    return res.status(status).json({ error: message });
};
// LISTAR
export const getRecursos = async (req, res) => {
    try {
        const data = await service.listRecursos();
        res.json(data);
    } catch (e) {
        return responderError(res, e);
    }
};

// OBTENER POR ID
export const getRecursoById = async (req, res) => {
    try {
        const data = await service.findRecursoById(req.params.id);
        res.json(data);
    } catch (e) {
        return responderError(res, e);
    }
};

// CREAR
export const createRecurso = async (req, res) => {
    try {
        const data = await service.addRecurso(req.body);
        res.status(201).json(data);
    } catch (e) {
        return responderError(res, e);
    }
};

// ACTUALIZAR
export const updateRecurso = async (req, res) => {
    try {
        const data = await service.editRecurso(req.params.id, req.body);
        res.json(data);
    } catch (e) {
        return responderError(res, e);
    }
};

// CAMBIAR ESTADO
export const cambiarEstado = async (req, res) => {
    try {
        const data = await service.changeEstado(req.params.id, req.body?.estado);
        res.json(data);
    } catch (e) {
        return responderError(res, e);
    }
};

// ELIMINACIÓN FÍSICA
export const deleteRecurso = async (req, res) => {
    try {
        await service.removeRecurso(req.params.id);
        res.json({ message: 'Recurso eliminado físicamente' });
    } catch (e) {
        return responderError(res, e, true);
    }
};
