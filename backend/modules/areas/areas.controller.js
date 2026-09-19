import * as service from './areas.service.js';

export const getAreas = async (req, res) => {
    try {
        const data = await service.listAreas();
        res.json(data);
    } catch (e){
        res.status(500).json({ error: e.message });
    }
};

//crear area
export const crearArea = async (req, res) => {
    try {
        const data = await service.addAreas(req.body.nombre);
        res.json(data);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

//modificar area
// ACTUALIZAR
export const updateArea = async (req, res) => {
    try {
        const data = await service.editArea(
            req.params.id,
            req.body.nombre
        );
        res.json(data);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

//eliminacion fisica
export const deleteArea = async (req, res) => {
    try {
        await service.removeArea(req.params.id);
        res.json({ message: 'Eliminado' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

//eliminacion logica
// ELIMINACIÓN LÓGICA
export const deleteAreaLogica = async (req, res) => {
    try {
        await service.removeAreaLogica(req.params.id);
        res.json({ message: 'Área desactivada' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};