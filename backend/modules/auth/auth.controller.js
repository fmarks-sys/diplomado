import * as authService from './auth.service.js';

const responderError = (response, error, registro = false) => {
    let status = error.status || 500;
    let message = error.message;

    if (registro && error.code === '23505') {
        status = 409;
        message = 'CI, correo, username o cuenta de persona ya registrados';
    } else if (registro && ['23502', '23503', '23514', '22001', '22P02'].includes(error.code)) {
        status = 400;
        message = 'Datos de registro inválidos';
    }

    if (status === 500) {
        console.error(error);
        message = 'Error interno del servidor';
    }

    return response.status(status).json({ error: message });
};

export const register = async (request, response) => {

    try {

        const user = await authService.register(
            request.body
        );

        return response.status(201).json({
            message: 'Usuario registrado correctamente',
            data: user
        });

    } catch (error) {

        return responderError(response, error, true);
    }
};


export const login = async (request, response) => {

    try {

        const data = await authService.login(
            request.body?.username,
            request.body?.password
        );

        return response.status(200).json({
            message: 'Login correcto',
            ...data
        });

    } catch (error) {

        return responderError(response, error);
    }
};
