import * as repo from './lectores.repository.js';

const TIPOS_LECTOR = ['ESTUDIANTE', 'DOCENTE', 'EXTERNO'];

const errorHttp = (status, message) => Object.assign(new Error(message), { status });

const validarId = (id, status = 400) => {
    if (!['string', 'number'].includes(typeof id) || !/^\d+$/.test(String(id))
        || !Number.isInteger(Number(id)) || Number(id) < 1 || Number(id) > 2147483647) {
        throw errorHttp(status, 'Identificador inválido');
    }
};

const validarLector = (data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw errorHttp(400, 'Datos de lector requeridos');
    }
    for (const [campo, etiqueta] of [
        ['ci', 'CI'], ['nombres', 'Nombre'], ['ap', 'Apellido paterno'],
        ['am', 'Apellido materno'], ['correo', 'Correo'], ['tipo_lector', 'Tipo de lector']
    ]) {
        if (typeof data[campo] !== 'string' || !data[campo].trim()) {
            throw errorHttp(400, `${etiqueta} requerido o inválido`);
        }
    }
    for (const campo of ['ru', 'telefono']) {
        if (data[campo] != null && typeof data[campo] !== 'string') {
            throw errorHttp(400, `${campo} debe ser texto`);
        }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.correo.trim())) {
        throw errorHttp(400, 'Correo electrónico inválido');
    }

    if (!TIPOS_LECTOR.includes(data.tipo_lector)) {
        throw errorHttp(400, 'Tipo de lector inválido');
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
    validarId(id);
    validarLector(data);
    return repo.updateLector(id, normalizarLector(data));
};

export const removeLector = async (id) => {
    validarId(id);
    return repo.deleteLector(id);
};

export const cambiarEstadoLector = async (id) => {
    validarId(id);
    return repo.toggleEstadoLector(id);
};

export const getMiPerfil = async (loginId) => {
    validarId(loginId, 401);
    const perfil = await repo.getPerfilByUsuario(loginId);

    if (!perfil) {
        const error = new Error('Usuario no encontrado');
        error.status = 404;
        throw error;
    }

    return perfil;
};
