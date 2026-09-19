import * as service from './lectores.service.js';

// Listar
export const getLectores = async (req, res) => {

    try {

        const data = await service.listLectores();

        res.json(data);

    } catch (e) {

        res.status(500).json({
            error: e.message
        });

    }

};

// Crear
export const createLector = async (req, res) => {

    try {

        const data = await service.addLector(req.body);

        res.status(201).json(data);

    } catch (e) {

        res.status(400).json({
            error: e.message
        });

    }

};

// Actualizar
export const updateLector = async (req, res) => {

    try {

        const data = await service.editLector(
            req.params.id,
            req.body
        );

        res.json(data);

    } catch (e) {

        res.status(400).json({
            error: e.message
        });

    }

};

// Eliminar físico
export const deleteLector = async (req, res) => {

    try {

        await service.removeLector(req.params.id);

        res.json({
            message: 'Lector eliminado'
        });

    } catch (e) {

        res.status(400).json({
            error: e.message
        });

    }

};

// Eliminación lógica
export const cambiarEstado = async (req, res) => {

    try {

        const data = await service.removeLectorLogico(
            req.params.id
        );

        res.json(data);

    } catch (e) {

        res.status(400).json({
            error: e.message
        });

    }

};

//perfil
export const getMiPerfil = async (req, res) => {
    try {
        const usuario_id = req.user.id;

        const data = await service.getMiPerfil(usuario_id);

        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};