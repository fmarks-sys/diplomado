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


// ==========================================
// REGISTRAR USUARIO DEL SISTEMA
// ==========================================

export const register = async (data) => {

    if (
        !data.ci ||
        !data.nombres ||
        !data.ap ||
        !data.am ||
        !data.correo ||
        !data.username ||
        !data.password ||
        !data.rol
    ) {
        throw new Error('Faltan datos obligatorios');
    }


    // --------------------------------------
    // Validar rol
    // --------------------------------------

    const rol = data.rol.toUpperCase();

    const rolesPermitidos = [
        'BIBLIOTECARIO',
        'LECTOR'
    ];

    if (!rolesPermitidos.includes(rol)) {
        throw new Error('Rol no válido');
    }


    // --------------------------------------
    // Verificar username
    // --------------------------------------

    const existingUsername =
        await findUserByUsername(data.username);

    if (existingUsername) {
        throw new Error(
            'El username ya está registrado'
        );
    }


    // --------------------------------------
    // Verificar si persona ya existe
    // --------------------------------------

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
            throw new Error(
                'El CI y correo pertenecen a personas diferentes'
            );
        }


        // ----------------------------------
        // Persona existente
        // Crear solamente LOGIN
        // ----------------------------------

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


    // --------------------------------------
    // Persona nueva
    // --------------------------------------

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


// ==========================================
// LOGIN
// ==========================================

export const login = async (
    username,
    password
) => {

    if (!username || !password) {

        throw new Error(
            'Username y password son obligatorios'
        );
    }


    // --------------------------------------
    // Buscar exclusivamente en LOGIN
    // --------------------------------------

    const user =
        await findUserByUsername(username);


    if (!user) {

        throw new Error(
            'Credenciales incorrectas'
        );
    }


    // --------------------------------------
    // Estado
    // --------------------------------------

    if (user.estado_login !== 'ACTIVO') {

        if (user.estado_login === 'BLOQUEADO') {

            throw new Error(
                'La cuenta está bloqueada'
            );
        }

        throw new Error(
            'La cuenta está inactiva'
        );
    }


    // --------------------------------------
    // Password
    // --------------------------------------

    const validPassword =
        await bcrypt.compare(
            password,
            user.password_hash
        );


    if (!validPassword) {

        throw new Error(
            'Credenciales incorrectas'
        );
    }


    // --------------------------------------
    // JWT
    // --------------------------------------

    const token = jwt.sign(
        {
            loginId: user.login_id,
            personaId: user.persona_id,
            rol: user.rol
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '1h'
        }
    );


    // --------------------------------------
    // Último acceso
    // --------------------------------------

    await updateLastAccess(
        user.login_id
    );


    delete user.password_hash;


    return {
        token,
        user
    };
};