import * as repo from './areas.repository.js';

const errorHttp = (status, message) => Object.assign(new Error(message), { status });
const validarId = (id) => {
    if (!['string', 'number'].includes(typeof id) || !/^\d+$/.test(String(id))
        || !Number.isInteger(Number(id)) || Number(id) < 1 || Number(id) > 2147483647) {
        throw errorHttp(400, 'ID de área inválido');
    }
};
// LISTAR TODAS LAS ÁREAS
export const listAreas = async () => {
    return await repo.getAllAreas();
};


// LISTAR SOLO ÁREAS ACTIVAS
export const listAreasActivas = async () => {
    return await repo.getAllAreasActivas();
};


// CREAR ÁREA
export const addArea = async (nombre) => {

    if (typeof nombre !== 'string' || !nombre.trim()) {
        throw errorHttp(400, 'Nombre requerido o inválido');
    }

    const nombreNormalizado = nombre
        .trim()
        .replace(/\s+/g, ' ')
        .toUpperCase();

    try {
        return await repo.createArea(nombreNormalizado);

    } catch (error) {

        // PostgreSQL: unique_violation
        if (error.code === '23505') {
            throw errorHttp(409, 'Ya existe un área con ese nombre');
        }

        throw error;
    }
};

// ACTUALIZAR ÁREA
export const editArea = async (id, nombre) => {

    validarId(id);

    if (typeof nombre !== 'string' || !nombre.trim()) {
        throw errorHttp(400, 'Nombre requerido o inválido');
    }

    const nombreNormalizado = nombre
        .trim()
        .replace(/\s+/g, ' ')
        .toUpperCase();

    try {

        const area = await repo.updateArea(
            id,
            nombreNormalizado
        );

        if (!area) {
            throw errorHttp(404, 'Área no encontrada');
        }

        return area;

    } catch (error) {

        // PostgreSQL: unique_violation
        if (error.code === '23505') {
            throw errorHttp(409, 'Ya existe un área con ese nombre');
        }

        throw error;
    }
};


// CAMBIAR ESTADO
// ACTIVO <-> INACTIVO
export const changeAreaEstado = async (id) => {

    validarId(id);

    const area = await repo.toggleAreaEstado(id);

    if (!area) {
        throw errorHttp(404, 'Área no encontrada');
    }

    return area;
};
