import * as service from './lectores.service.js';

const responderError = (res, error, defaultStatus = 500) => {
    // PostgreSQL: violación de UNIQUE
    if (error.code === '23505') {
        return res.status(409).json({
            error: 'Ya existe un registro con CI, correo o RU duplicado'
        });
    }

    // PostgreSQL: violación de CHECK / NOT NULL / FK
    if (['23514', '23502', '23503'].includes(error.code)) {
        return res.status(400).json({ error: error.message });
    }

    return res.status(error.status || defaultStatus).json({
        error: error.message
    });
};

export const getLectores = async (req, res) => {
    try {
        const data = await service.listLectores();
        return res.json(data);
    } catch (error) {
        return responderError(res, error);
    }
};

export const createLector = async (req, res) => {
    try {
        const data = await service.addLector(req.body);
        return res.status(201).json(data);
    } catch (error) {
        return responderError(res, error, 400);
    }
};

export const updateLector = async (req, res) => {
    try {
        const data = await service.editLector(req.params.id, req.body);
        return res.json(data);
    } catch (error) {
        return responderError(res, error, 400);
    }
};

export const deleteLector = async (req, res) => {
    try {
        await service.removeLector(req.params.id);
        return res.json({ message: 'Lector eliminado' });
    } catch (error) {
        return responderError(res, error, 400);
    }
};

export const cambiarEstado = async (req, res) => {
    try {
        const data = await service.cambiarEstadoLector(req.params.id);
        return res.json(data);
    } catch (error) {
        return responderError(res, error, 400);
    }
};

export const getMiPerfil = async (req, res) => {
    try {
        const loginId = req.user?.id;

        if (!loginId) {
            return res.status(401).json({ error: 'Token sin identificador de usuario' });
        }

        const data = await service.getMiPerfil(loginId);
        return res.json(data);
    } catch (error) {
        return responderError(res, error);
    }
};
