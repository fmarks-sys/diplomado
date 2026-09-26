import * as service from './prestamos.service.js';

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

        console.error(
            'Error al listar préstamos:',
            error
        );


        return res
            .status(500)
            .json({
                error:
                    'Error al obtener los préstamos'
            });
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

        console.error(
            'Error al crear préstamo:',
            error
        );


        return res
            .status(400)
            .json({
                error:
                    error.message
            });
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

        console.error(
            'Error al devolver préstamo:',
            error
        );


        return res
            .status(400)
            .json({
                error:
                    error.message
            });
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

        console.error(
            'Error al obtener préstamos del lector:',
            error
        );


        return res
            .status(500)
            .json({
                error:
                    error.message
            });
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

        console.error(
            'Error al obtener alertas del lector:',
            error
        );


        return res
            .status(500)
            .json({
                error:
                    error.message
            });
    }
};