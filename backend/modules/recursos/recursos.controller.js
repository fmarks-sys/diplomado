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


// CREAR
export const createRecurso = async (req, res) => {
    try {
        const data = await service.addRecurso(req.body);
        res.json(data);
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
        res.status(400).json({ error: e.message });
    }
};


// ELIMINAR FÍSICO
export const deleteRecurso = async (req, res) => {
    try {
        await service.removeRecurso(req.params.id);
        res.json({ message: 'Eliminado' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};


// ELIMINACIÓN LÓGICA
export const cambiarEstado = async (req, res) => {
    try {
        const data = await service.removeRecursoLogica(req.params.id);
        res.json(data);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};