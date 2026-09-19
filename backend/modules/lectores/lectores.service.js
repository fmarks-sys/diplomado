import * as repo from './lectores.repository.js';

// Listar
export const listLectores = async () => {
    return await repo.getAllLectores();
};

// Crear
export const addLector = async (data) => {

    if (!data.ci) throw new Error('CI requerido');

    if (!data.nombres) throw new Error('Nombre requerido');

    if (!data.apellidos) throw new Error('Apellido requerido');

    return await repo.createLector(
        data.ru,
        data.ci,
        data.nombres,
        data.apellidos,
        data.correo,
        data.telefono,
        data.tipo_lector
    );
};

// Actualizar
export const editLector = async (id, data) => {

    return await repo.updateLector(
        id,
        data.ru,
        data.ci,
        data.nombres,
        data.apellidos,
        data.correo,
        data.telefono,
        data.tipo_lector
    );
};

// Eliminar físico
export const removeLector = async (id) => {
    return await repo.deleteLector(id);
};

// Eliminar lógico
export const removeLectorLogico = async (id) => {
    return await repo.disableLector(id);
};

//perfil
export const getMiPerfil = async (usuario_id) => {
    const perfil = await repo.getPerfilByUsuario(usuario_id);

    if (!perfil) throw new Error('Usuario no encontrado');

    return perfil;
};