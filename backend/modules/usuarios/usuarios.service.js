import bcrypt from 'bcryptjs';
import * as repository from './usuarios.repository.js';

const errorHttp = (status, message) => Object.assign(new Error(message), { status });

const validarId = (id, campo = 'ID de usuario') => {
    if (!['string', 'number'].includes(typeof id) || !/^\d+$/.test(String(id))
        || !Number.isInteger(Number(id)) || Number(id) < 1 || Number(id) > 2147483647) {
        throw errorHttp(400, `${campo} inválido`);
    }
};

const validarDatos = (data, campos) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)
        || campos.some((campo) => typeof data[campo] !== 'string' || !data[campo].trim())) {
        throw errorHttp(400, 'Faltan datos obligatorios o tienen un formato inválido');
    }
    validarId(data.rol_id, 'ID de rol');
    if (data.telefono != null && typeof data.telefono !== 'string') {
        throw errorHttp(400, 'Teléfono debe ser texto');
    }
    if (data.correo != null && (typeof data.correo !== 'string'
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo))) {
        throw errorHttp(400, 'Correo electrónico inválido');
    }
};

const camposPersonales = ['ci', 'nombres', 'ap', 'am', 'correo', 'username'];

export const getAll = async () => repository.findAll();

export const getById = async (id) => {
    validarId(id);
    const user = await repository.findById(id);
    if (!user) throw errorHttp(404, 'Usuario no encontrado');
    return user;
};

// Persona nueva: conservar la creación transaccional de persona, login y lector.
export const create = async (data) => {
    validarDatos(data, [...camposPersonales, 'password']);
    if (await repository.findPersonByCi(data.ci)) {
        throw errorHttp(409, 'Ya existe una persona con ese CI');
    }
    if (await repository.findPersonByEmail(data.correo)) {
        throw errorHttp(409, 'Ya existe una persona con ese correo');
    }
    if (await repository.findByUsername(data.username)) {
        throw errorHttp(409, 'El username ya está registrado');
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    return repository.createNewUser({
        ...data,
        correo: data.correo.toLowerCase(),
        password_hash: passwordHash
    });
};

export const createFromPerson = async (personaId, data) => {
    validarId(personaId, 'ID de persona');
    validarDatos(data, ['username', 'password']);
    const person = await repository.findPersonById(personaId);
    if (!person) throw errorHttp(404, 'La persona no existe');
    if (await repository.findLoginByPersonId(personaId)) {
        throw errorHttp(409, 'Esta persona ya tiene una cuenta de usuario');
    }
    if (await repository.findByUsername(data.username)) {
        throw errorHttp(409, 'El username ya está registrado');
    }
    const passwordHash = await bcrypt.hash(data.password, 10);
    const login = await repository.createLoginForExistingPerson(personaId, {
        username: data.username,
        password_hash: passwordHash,
        rol_id: data.rol_id,
        tipo_lector: data.tipo_lector,
        ru: data.ru
    });
    return { persona: person, login };
};

export const update = async (id, data) => {
    validarId(id);
    validarDatos(data, camposPersonales);
    await getById(id);
    const username = await repository.findByUsername(data.username);
    if (username && username.id !== Number(id)) {
        throw errorHttp(409, 'El username ya está en uso');
    }
    await repository.updateUser(id, data);
    return getById(id);
};

export const changePassword = async (id, password) => {
    validarId(id);
    if (typeof password !== 'string' || !password.trim()) {
        throw errorHttp(400, 'La nueva contraseña es obligatoria');
    }
    await getById(id);
    const passwordHash = await bcrypt.hash(password, 10);
    const actualizado = await repository.updatePassword(id, passwordHash);
    if (!actualizado) throw errorHttp(404, 'Usuario no encontrado');
    return { message: 'Contraseña actualizada' };
};

export const changeStatus = async (id, estado) => {
    validarId(id);
    estado = typeof estado === 'string' ? estado.toUpperCase() : '';
    if (!['ACTIVO', 'BLOQUEADO', 'INACTIVO'].includes(estado)) {
        throw errorHttp(400, 'Estado no válido');
    }
    await getById(id);
    const actualizado = await repository.updateStatus(id, estado);
    if (!actualizado) throw errorHttp(404, 'Usuario no encontrado');
    return actualizado;
};
