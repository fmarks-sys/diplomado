import * as service
    from './usuarios.service.js';


export const getAll = async (req, res) => {

    try {

        const users =
            await service.getAll();

        return res.json(users);

    } catch (error) {

        return res.status(500).json({
            error: error.message
        });
    }
};


export const getById = async (req, res) => {

    try {

        const user =
            await service.getById(
                req.params.id
            );

        return res.json(user);

    } catch (error) {

        return res.status(404).json({
            error: error.message
        });
    }
};


export const create = async (req, res) => {

    try {

        const user =
            await service.create(
                req.body
            );

        return res.status(201).json({
            message:
                'Usuario creado correctamente',

            data: user
        });

    } catch (error) {

        return res.status(400).json({
            error: error.message
        });
    }
};


// Persona/lector ya existente
export const createFromPerson = async (
    req,
    res
) => {

    try {

        const user =
            await service.createFromPerson(
                req.params.personaId,
                req.body
            );


        return res.status(201).json({
            message:
                'Acceso al sistema creado correctamente',

            data: user
        });

    } catch (error) {

        return res.status(400).json({
            error: error.message
        });
    }
};


export const update = async (req, res) => {

    try {

        const user =
            await service.update(
                req.params.id,
                req.body
            );


        return res.json({
            message:
                'Usuario actualizado correctamente',

            data: user
        });

    } catch (error) {

        return res.status(400).json({
            error: error.message
        });
    }
};


export const changePassword = async (
    req,
    res
) => {

    try {

        const result =
            await service.changePassword(
                req.params.id,
                req.body.password
            );


        return res.json(result);

    } catch (error) {

        return res.status(400).json({
            error: error.message
        });
    }
};


export const changeStatus = async (
    req,
    res
) => {

    try {

        const user =
            await service.changeStatus(
                req.params.id,
                req.body.estado
            );


        return res.json({
            message:
                'Estado actualizado correctamente',

            data: user
        });

    } catch (error) {

        return res.status(400).json({
            error: error.message
        });
    }
};