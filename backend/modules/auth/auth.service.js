import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import {
    createUser,
    createLoginForPerson,
    findUserByUsername,
    findPersonByEmail,
    findPersonByCi,
    updateLastAccess
} from './auth.repository.js';

const errorHttp = (status, message) => Object.assign(new Error(message), { status });

// REGISTRAR USUARIO DEL SISTEMA

export const register = async (data) => {

    const obligatorios = ['ci', 'nombres', 'ap', 'am', 'correo', 'username', 'password', 'rol'];
    if (!data || typeof data !== 'object' || Array.isArray(data)
        || obligatorios.some((campo) => typeof data[campo] !== 'string' || !data[campo].trim())) {
        throw errorHttp(400, 'Faltan datos obligatorios o tienen un formato inválido');
    }
    if (data.telefono != null && typeof data.telefono !== 'string') {
        throw errorHttp(400, 'Teléfono debe ser texto');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo)) {
        throw errorHttp(400, 'Correo electrónico inválido');
    }


    // Validar rol

    const rol = data.rol.toUpperCase();

    const rolesPermitidos = [
        'BIBLIOTECARIO',
        'LECTOR'
    ];

    if (!rolesPermitidos.includes(rol)) {
        throw errorHttp(400, 'Rol no válido');
    }


    // Verificar username

    const existingUsername =
        await findUserByUsername(data.username);

    if (existingUsername) {
        throw errorHttp(409,
            'El username ya está registrado'
        );
    }


    // Verificar si persona ya existe

    const personaByCi =
        await findPersonByCi(data.ci);

    const personaByEmail =
        await findPersonByEmail(data.correo);


    if (personaByCi || personaByEmail) {

        const persona =
            personaByCi || personaByEmail;

        // Si CI y correo pertenecen a personas
        // diferentes, existe inconsistencia.
        if (
            personaByCi &&
            personaByEmail &&
            personaByCi.id !== personaByEmail.id
        ) {
            throw errorHttp(409,
                'El CI y correo pertenecen a personas diferentes'
            );
        }


        // Persona existente
        // Crear solamente LOGIN

        const hashedPassword =
            await bcrypt.hash(data.password, 10);

        const login =
            await createLoginForPerson(
                persona.id,
                {
                    username: data.username,
                    password_hash: hashedPassword,
                    rol
                }
            );

        return {
            persona,
            login,
            rol
        };
    }

    // Persona nueva

    const hashedPassword =
        await bcrypt.hash(data.password, 10);


    return await createUser({

        ci: data.ci,
        nombres: data.nombres,
        ap: data.ap,
        am: data.am,

        correo: data.correo.toLowerCase(),

        telefono: data.telefono,

        username: data.username,

        password_hash: hashedPassword,

        rol
    });
};


// LOGIN

export const login = async (
    username,
    password
) => {

    if (typeof username !== 'string' || !username.trim()
        || typeof password !== 'string' || !password.trim()) {

        throw errorHttp(400,
            'Username y password son obligatorios'
        );
    }


    // Buscar exclusivamente en LOGIN

    const user =
        await findUserByUsername(username);


    if (!user) {

        throw errorHttp(401,
            'Credenciales incorrectas'
        );
    }


    // Password

    const validPassword =
        await bcrypt.compare(
            password,
            user.password_hash
        );


    if (!validPassword) {

        throw errorHttp(401,
            'Credenciales incorrectas'
        );
    }


    // Verificar el estado solo después de validar las credenciales.
    if (user.estado_login !== 'ACTIVO') {
        const error = new Error(
            user.estado_login === 'BLOQUEADO'
                ? 'La cuenta está bloqueada'
                : 'La cuenta está inactiva'
        );
        error.status = 403;
        throw error;
    }

    // JWT

    const token = jwt.sign(
        {
            loginId: user.login_id,
            personaId: user.persona_id,
            rol: user.rol
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '1h'
            //expiresIn: '5m' // Vence en 5 minutos
            //expiresIn: '30s' // Prueba: vence en 30 segundos
        }
    );


    // Último acceso

    await updateLastAccess(
        user.login_id
    );


    delete user.password_hash;


    return {
    token,
    user: {
        username: user.username,
        rol: user.rol
    }
};
};
