import * as repo from './lectores.repository.js';

const TIPOS_LECTOR = ['ESTUDIANTE', 'DOCENTE', 'EXTERNO'];

const validarLector = (data) => {
    if (!data.ci?.trim()) throw new Error('CI requerido');
    if (!data.nombres?.trim()) throw new Error('Nombre requerido');
    if (!data.ap?.trim()) throw new Error('Apellido paterno requerido');
    if (!data.am?.trim()) throw new Error('Apellido materno requerido');
    if (!data.correo?.trim()) throw new Error('Correo requerido');
    if (!data.tipo_lector) throw new Error('Tipo de lector requerido');

    if (!TIPOS_LECTOR.includes(data.tipo_lector)) {
        throw new Error('Tipo de lector inválido');
    }
};

const normalizarLector = (data) => ({
    ru: data.ru?.trim() || null,
    ci: data.ci.trim(),
    nombres: data.nombres.trim(),
    ap: data.ap.trim(),
    am: data.am.trim(),
    correo: data.correo.trim().toLowerCase(),
    telefono: data.telefono?.trim() || null,
    tipo_lector: data.tipo_lector
});

export const listLectores = async () => {
    return repo.getAllLectores();
};

export const addLector = async (data) => {
    validarLector(data);
    return repo.createLector(normalizarLector(data));
};

export const editLector = async (id, data) => {
    validarLector(data);
    return repo.updateLector(id, normalizarLector(data));
};

export const removeLector = async (id) => {
    return repo.deleteLector(id);
};

export const cambiarEstadoLector = async (id) => {
    return repo.toggleEstadoLector(id);
};

export const getMiPerfil = async (loginId) => {
    const perfil = await repo.getPerfilByUsuario(loginId);

    if (!perfil) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
    }

    return perfil;
};
