import * as service from './prestamos.service.js';

// GET
export const getPrestamos = async (req, res) => {
    try {
        const data = await service.listPrestamos();
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST
export const crearPrestamo = async (req, res) => {
    try {
        const data = await service.addPrestamo(req.body);
        res.json(data);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

// DEVOLVER
export const devolver = async (req, res) => {
    try {
        const data = await service.devolverPrestamo(req.params.id);
        res.json(data);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
};

//lector
export const getMisPrestamos = async (req, res) => {
    try {
        const usuario_id = req.user.id; // 🔥 viene del JWT

        const data = await service.listMisPrestamos(usuario_id);

        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

//
export const getMisAlertas = async (req, res) => {
    try {
        const usuario_id = req.user.id;

        const data = await service.listMisAlertas(usuario_id);

        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};