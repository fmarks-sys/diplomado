import bcrypt from 'bcryptjs';

import * as repository from './usuarios.repository.js';


// LISTAR

export const getAll = async () => {

    return await repository.findAll();
};


// OBTENER UNO

export const getById = async (id) => {

    const user = await repository.findById(id);

    if (!user) {
        throw new Error('Usuario no encontrado');
    }

    return user;
};


// CREAR USUARIO NUEVO
// Persona todavía NO existe.

export const create = async (data) => {

    if (
        !data.ci ||
        !data.nombres ||
        !data.ap ||
        !data.am ||
        !data.correo ||
        !data.username ||
        !data.password ||
        !data.rol_id
    ) {
        throw new Error('Faltan datos obligatorios');
    }


    const personCi =
        await repository.findPersonByCi(data.ci);

    if (personCi) {
        throw new Error(
            'Ya existe una persona con ese CI'
        );
    }


    const personEmail =
        await repository.findPersonByEmail(
            data.correo
        );

    if (personEmail) {
        throw new Error(
            'Ya existe una persona con ese correo'
        );
    }


    const username =
        await repository.findByUsername(
            data.username
        );

    if (username) {
        throw new Error(
            'El username ya está registrado'
        );
    }


    const passwordHash =
        await bcrypt.hash(
            data.password,
            10
        );


    return await repository.createNewUser({
        ...data,

        correo: data.correo.toLowerCase(),

        password_hash: passwordHash
    });
};


// CREAR USUARIO DESDE PERSONA/LECTOR EXISTENTE

export const createFromPerson = async (
    personaId,
    data
) => {

    if (
        !data.username ||
        !data.password ||
        !data.rol_id
    ) {
        throw new Error(
            'Username, password y rol son obligatorios'
        );
    }


    const person =
        await repository.findPersonById(
            personaId
        );

    if (!person) {
        throw new Error(
            'La persona no existe'
        );
    }


    const existingLogin =
        await repository.findLoginByPersonId(
            personaId
        );

    if (existingLogin) {
        throw new Error(
            'Esta persona ya tiene una cuenta de usuario'
        );
    }


    const existingUsername =
        await repository.findByUsername(
            data.username
        );

    if (existingUsername) {
        throw new Error(
            'El username ya está registrado'
        );
    }


    const passwordHash =
        await bcrypt.hash(
            data.password,
            10
        );


    const login =
        await repository.createLoginForExistingPerson(
            personaId,
            {
                username: data.username,
                password_hash: passwordHash,
                rol_id: data.rol_id
            }
        );


    return {
        persona: person,
        login
    };
};


// MODIFICAR

export const update = async (
    id,
    data
) => {

    const user =
        await repository.findById(id);

    if (!user) {
        throw new Error(
            'Usuario no encontrado'
        );
    }


    if (
        !data.ci ||
        !data.nombres ||
        !data.ap ||
        !data.am ||
        !data.correo ||
        !data.username ||
        !data.rol_id
    ) {
        throw new Error(
            'Faltan datos obligatorios'
        );
    }


    const username =
        await repository.findByUsername(
            data.username
        );


    if (
        username &&
        username.id !== Number(id)
    ) {
        throw new Error(
            'El username ya está en uso'
        );
    }


    await repository.updateUser(
        id,
        data
    );


    return await repository.findById(id);
};


// CAMBIAR PASSWORD

export const changePassword = async (
    id,
    password
) => {

    const user =
        await repository.findById(id);

    if (!user) {
        throw new Error(
            'Usuario no encontrado'
        );
    }


    if (!password) {
        throw new Error(
            'La nueva contraseña es obligatoria'
        );
    }


    const passwordHash =
        await bcrypt.hash(
            password,
            10
        );


    await repository.updatePassword(
        id,
        passwordHash
    );


    return {
        message: 'Contraseña actualizada'
    };
};


// CAMBIAR ESTADO

export const changeStatus = async (
    id,
    estado
) => {

    const estadosPermitidos = [
        'ACTIVO',
        'BLOQUEADO',
        'INACTIVO'
    ];


    estado = estado?.toUpperCase();


    if (!estadosPermitidos.includes(estado)) {
        throw new Error(
            'Estado no válido'
        );
    }


    const user =
        await repository.findById(id);

    if (!user) {
        throw new Error(
            'Usuario no encontrado'
        );
    }


    return await repository.updateStatus(
        id,
        estado
    );
};