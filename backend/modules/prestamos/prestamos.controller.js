import * as service from './prestamos.service.js';

const responderError = (res, error) => {
    let status = error.status || 500;
    let message = error.message;
    if (error.code === '23505') {
        status = 409;
        message = 'El préstamo entra en conflicto con un registro existente';
    } else if (['23502', '23503', '23514', '22001', '22P02', '22007', '22008'].includes(error.code)) {
        status = 400;
        message = 'Datos de préstamo inválidos';
    }
    if (status === 500) {
        console.error(error);
        message = 'Error interno del servidor';
    }
    return res.status(status).json({ error: message });
};
// GET - LISTAR TODOS LOS PRÉSTAMOS
export const getPrestamos = async (
    req,
    res
) => {

    try {

        const data =
            await service.listPrestamos();


        return res
            .status(200)
            .json(data);


    } catch (error) {
        return responderError(res, error);
    }
};


// POST - CREAR PRÉSTAMO
export const crearPrestamo = async (
    req,
    res
) => {

    try {

        const data =
            await service.addPrestamo(
                req.body
            );


        return res
            .status(201)
            .json({
                message:
                    'Préstamo registrado correctamente',

                prestamo:
                    data
            });


    } catch (error) {
        return responderError(res, error);
    }
};


// PATCH - DEVOLVER PRÉSTAMO
export const devolver = async (
    req,
    res
) => {

    try {

        const data =
            await service.devolverPrestamo(
                req.params.id
            );


        return res
            .status(200)
            .json({
                message:
                    'Recurso devuelto correctamente',

                prestamo:
                    data
            });


    } catch (error) {
        return responderError(res, error);
    }
};


// GET - MIS PRÉSTAMOS
export const getMisPrestamos = async (
    req,
    res
) => {

    try {

        // verifyToken coloca el JWT decodificado
        // directamente dentro de req.user.
        //
        // JWT:
        // {
        //    loginId,
        //    personaId,
        //    rol,
        //    iat,
        //    exp
        // }

        if (!req.user?.personaId) {

            return res
                .status(401)
                .json({
                    error:
                        'Usuario no autenticado'
                });
        }


        const personaId =
            req.user.personaId;


        const data =
            await service.listMisPrestamos(
                personaId
            );


        return res
            .status(200)
            .json(data);


    } catch (error) {
        return responderError(res, error);
    }
};


// GET - MIS ALERTAS
export const getMisAlertas = async (
    req,
    res
) => {

    try {

        if (!req.user?.personaId) {

            return res
                .status(401)
                .json({
                    error:
                        'Usuario no autenticado'
                });
        }


        const personaId =
            req.user.personaId;


        const data =
            await service.listMisAlertas(
                personaId
            );


        return res
            .status(200)
            .json(data);


    } catch (error) {
        return responderError(res, error);
    }
};
