import * as service
    from './usuarios.service.js';

const responderError = (res, error) => {
    let status = error.status || 500;
    let message = error.message;
    if (error.code === '23505') {
        status = 409;
        message = 'CI, correo, username, RU o cuenta de persona ya registrados';
    } else if (['23502', '23503', '23514', '22001', '22P02'].includes(error.code)) {
        status = 400;
        message = 'Datos de usuario inválidos';
    }
    if (status === 500) {
        console.error(error);
        message = 'Error interno del servidor';
    }
    return res.status(status).json({ error: message });
};

export const getAll = async (req, res) => {

    try {

        const users =
            await service.getAll();

        return res.json(users);

    } catch (error) {

        return responderError(res, error);
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

        return responderError(res, error);
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

        return responderError(res, error);
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

        return responderError(res, error);
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

        return responderError(res, error);
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
                req.body?.password
            );


        return res.json(result);

    } catch (error) {

        return responderError(res, error);
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
                req.body?.estado
            );


        return res.json({
            message:
                'Estado actualizado correctamente',

            data: user
        });

    } catch (error) {

        return responderError(res, error);
    }
};
