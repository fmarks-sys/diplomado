import * as authService from './auth.service.js';


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

        console.error(error);

        return response.status(400).json({
            error: error.message
        });
    }
};


export const login = async (request, response) => {

    try {

        const data = await authService.login(
            request.body.username,
            request.body.password
        );

        return response.status(200).json({
            message: 'Login correcto',
            ...data
        });

    } catch (error) {

        console.error(error);

        return response.status(401).json({
            error: error.message
        });
    }
};