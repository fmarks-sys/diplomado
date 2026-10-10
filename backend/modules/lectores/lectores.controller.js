import * as service from './lectores.service.js';

const responderError = (res, error, eliminacion = false) => {
    // PostgreSQL: violación de UNIQUE
    if (error.code === '23505') {
        return res.status(409).json({
            error: 'Ya existe un registro con CI, correo o RU duplicado'
        });
    }

    // Un lector con préstamos o sanciones no puede eliminarse físicamente.
    if (eliminacion && error.code === '23503') {
        return res.status(409).json({
            error: 'No se puede eliminar un lector con préstamos o sanciones asociados'
        });
    }

    if (['23514', '23502', '23503', '22001', '22P02'].includes(error.code)) {
        return res.status(400).json({ error: 'Datos de lector inválidos' });
    }

    const status = error.status || 500;
    if (status === 500) console.error(error);
    return res.status(status).json({
        error: status === 500 ? 'Error interno del servidor' : error.message
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
        return responderError(res, error);
    }
};

export const updateLector = async (req, res) => {
    try {
        const data = await service.editLector(req.params.id, req.body);
        return res.json(data);
    } catch (error) {
        return responderError(res, error);
    }
};

export const deleteLector = async (req, res) => {
    try {
        await service.removeLector(req.params.id);
        return res.json({ message: 'Lector eliminado' });
    } catch (error) {
        return responderError(res, error, true);
    }
};

export const cambiarEstado = async (req, res) => {
    try {
        const data = await service.cambiarEstadoLector(req.params.id);
        return res.json(data);
    } catch (error) {
        return responderError(res, error);
    }
};

export const getMiPerfil = async (req, res) => {
    try {
        const loginId = req.user?.loginId;

        if (!loginId) {
            return res.status(401).json({ error: 'Token sin identificador de usuario' });
        }

        const data = await service.getMiPerfil(loginId);
        return res.json(data);
    } catch (error) {
        return responderError(res, error);
    }
};
