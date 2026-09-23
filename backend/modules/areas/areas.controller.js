import * as service from './areas.service.js';


// ======================================================
// LISTAR TODAS LAS ÁREAS
// GET /api/areas
// ======================================================
export const getAreas = async (req, res) => {
    try {

        const data = await service.listAreas();

        res.json(data);

    } catch (error) {

        console.error('Error al listar áreas:', error);

        res.status(500).json({
            error: 'Error al obtener las áreas'
        });
    }
};


// ======================================================
// LISTAR SOLO ÁREAS ACTIVAS
// GET /api/areas/activas
// ======================================================
export const getAreasActivas = async (req, res) => {
    try {

        const data = await service.listAreasActivas();

        res.json(data);

    } catch (error) {

        console.error('Error al listar áreas activas:', error);

        res.status(500).json({
            error: 'Error al obtener las áreas activas'
        });
    }
};


// ======================================================
// CREAR ÁREA
// POST /api/areas
// ======================================================
export const crearArea = async (req, res) => {
    try {

        const { nombre } = req.body;

        const data = await service.addArea(nombre);

        res.status(201).json(data);

    } catch (error) {

        res.status(400).json({
            error: error.message
        });
    }
};


// ======================================================
// ACTUALIZAR ÁREA
// PUT /api/areas/:id
// ======================================================
export const updateArea = async (req, res) => {
    try {

        const { id } = req.params;
        const { nombre } = req.body;

        const data = await service.editArea(
            id,
            nombre
        );

        res.json(data);

    } catch (error) {

        const status =
            error.message === 'Área no encontrada'
                ? 404
                : 400;

        res.status(status).json({
            error: error.message
        });
    }
};


// ======================================================
// CAMBIAR ESTADO DEL ÁREA
// PATCH /api/areas/:id/estado
// ======================================================
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

        const status =
            error.message === 'Área no encontrada'
                ? 404
                : 400;

        res.status(status).json({
            error: error.message
        });
    }
};
