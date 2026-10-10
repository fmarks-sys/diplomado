import * as service from './areas.service.js';

const responderError = (res, error) => {
    let status = error.status || 500;
    let message = error.message;
    if (error.code === '23505') {
        status = 409;
        message = 'Ya existe un área con ese nombre';
    } else if (['23502', '23503', '23514', '22001', '22P02'].includes(error.code)) {
        status = 400;
        message = 'Datos de área inválidos';
    }
    if (status === 500) {
        console.error(error);
        message = 'Error interno del servidor';
    }
    return res.status(status).json({ error: message });
};


// LISTAR TODAS LAS ÁREAS
export const getAreas = async (req, res) => {
    try {

        const data = await service.listAreas();

        res.json(data);

    } catch (error) {

        return responderError(res, error);
    }
};


// LISTAR SOLO ÁREAS ACTIVAS
export const getAreasActivas = async (req, res) => {
    try {

        const data = await service.listAreasActivas();

        res.json(data);

    } catch (error) {

        return responderError(res, error);
    }
};


// CREAR ÁREA
export const crearArea = async (req, res) => {
    try {

        const nombre = req.body?.nombre;

        const data = await service.addArea(nombre);

        res.status(201).json(data);

    } catch (error) {

        return responderError(res, error);
    }
};


// ACTUALIZAR ÁREA
export const updateArea = async (req, res) => {
    try {

        const { id } = req.params;
        const nombre = req.body?.nombre;

        const data = await service.editArea(
            id,
            nombre
        );

        res.json(data);

    } catch (error) {

        return responderError(res, error);
    }
};


// CAMBIAR ESTADO DEL ÁREA
export const cambiarEstadoArea = async (req, res) => {
    try {

        const { id } = req.params;

        const area = await service.changeAreaEstado(id);

        res.json({
            message:
                area.estado === 'ACTIVO'
                    ? 'Área activada correctamente'
                    : 'Área desactivada correctamente',

            area
        });

    } catch (error) {

        return responderError(res, error);
    }
};
