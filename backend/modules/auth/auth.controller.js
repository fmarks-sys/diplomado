import * as authService from './auth.service.js';

export const register = async (request, response) => {
    try{
        const user = await authService.register(request.body);
        response.json(user);
    } catch (e){
        response.status(400).json({error: e.message});
    }
};

export const login = async (request, response) => {
    //try: intentar si autoriza el login 
    try{
        // crear constante data que envia datos al servicio
        const data = await authService.login(
            request.body.correo,
            request.body.password
        );
        response.json(data);
    } catch (e){
        response.status(400).json({error: e.message});
    }
};